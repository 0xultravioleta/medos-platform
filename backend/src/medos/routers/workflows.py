"""Patient intake workflow endpoint.

Chains multiple MCP tools into a single workflow:
eligibility check -> schedule appointment -> create encounter stub.

Endpoints:
    POST /api/v1/workflows/patient-intake  - Run patient intake workflow
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from medos.middleware.auth import get_current_user
from medos.schemas.auth import UserContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workflows", tags=["Workflows"])


class PatientIntakeRequest(BaseModel):
    """Request body for patient intake workflow."""

    patient_id: str
    provider_id: str = "prov-001"
    visit_type: str = "new_patient"
    reason: str = ""


@router.post("/patient-intake")
async def patient_intake(
    body: PatientIntakeRequest,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Run the patient intake workflow.

    Steps:
        1. Check insurance eligibility
        2. Find available slot and book appointment
        3. Create an Encounter stub in FHIR
    """
    results: dict[str, Any] = {"patient_id": body.patient_id, "steps": []}

    # Step 1: Eligibility check
    from medos.mcp.servers.billing_server import billing_check_eligibility

    eligibility = await billing_check_eligibility(patient_id=body.patient_id)

    if "error" in eligibility:
        results["steps"].append({"step": "eligibility", "status": "skipped", "detail": eligibility["error"]})
        eligibility_status = "unknown"
    else:
        eligibility_status = eligibility.get("status", "unknown")
        results["steps"].append({
            "step": "eligibility",
            "status": "completed",
            "insurance_status": eligibility_status,
            "payer": eligibility.get("payer", ""),
            "plan_type": eligibility.get("plan_type", ""),
        })

    # Step 2: Schedule appointment
    from medos.mcp.servers.scheduling_server import scheduling_available_slots, scheduling_book

    slots_result = await scheduling_available_slots(provider_id=body.provider_id)
    available_slots = slots_result.get("slots", [])

    if not available_slots:
        results["steps"].append({"step": "scheduling", "status": "failed", "detail": "No available slots"})
        return {**results, "status": "partial", "message": "No available slots for scheduling."}

    # Book the first available slot
    first_slot = available_slots[0]
    booking = await scheduling_book(
        patient_id=body.patient_id,
        provider_id=body.provider_id,
        slot_id=first_slot["slot_id"],
        visit_type=body.visit_type,
        reason=body.reason,
    )

    results["steps"].append({
        "step": "scheduling",
        "status": "completed",
        "appointment_id": booking.get("appointment_id", ""),
        "provider_name": booking.get("provider_name", ""),
        "slot_id": first_slot["slot_id"],
    })

    # Step 3: Create Encounter stub
    from medos.mcp.servers.fhir_server import fhir_create

    encounter_resource = {
        "status": "planned",
        "class": {"code": "AMB", "display": "ambulatory"},
        "subject": {"reference": f"Patient/{body.patient_id}"},
        "participant": [
            {
                "individual": {"reference": f"Practitioner/{body.provider_id}"},
                "type": [{"text": "primary performer"}],
            }
        ],
        "reasonCode": [{"text": body.reason}] if body.reason else [],
        "appointment": [{"reference": f"Appointment/{booking.get('appointment_id', '')}"}],
    }

    encounter = await fhir_create(resource_type="Encounter", resource=encounter_resource)
    results["steps"].append({
        "step": "encounter_stub",
        "status": "completed",
        "encounter_id": encounter.get("id", ""),
        "encounter_status": encounter.get("status", ""),
    })

    return {
        **results,
        "status": "completed",
        "message": "Patient intake workflow completed successfully.",
        "eligibility_status": eligibility_status,
        "appointment_id": booking.get("appointment_id", ""),
        "encounter_id": encounter.get("id", ""),
    }
