"""LangGraph node functions for the Prior Authorization agent.

Pipeline: check_pa_requirement -> [PA required?]
    -> No: done
    -> Yes: gather_clinical_evidence -> generate_justification
        -> create_pa_form -> submit_for_approval -> END
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from medos.agents.base import emit_agent_event, route_by_confidence
from medos.mcp.servers.billing_server import billing_check_eligibility, billing_payer_rules
from medos.mcp.servers.fhir_server import fhir_patient_everything, fhir_read
from medos.schemas.agent import AgentContext, AgentType, ConfidenceScore

logger = logging.getLogger(__name__)

# Mock procedure descriptions
_PROCEDURE_INFO = {
    "29881": {"name": "Knee arthroscopy with meniscectomy", "requires_pa": True, "category": "surgery"},
    "73721": {"name": "MRI knee without contrast", "requires_pa": True, "category": "imaging"},
    "99214": {"name": "Office visit, established patient", "requires_pa": False, "category": "e_and_m"},
    "97110": {"name": "Therapeutic exercises", "requires_pa": False, "category": "pt"},
    "20610": {"name": "Joint injection, major joint", "requires_pa": False, "category": "procedure"},
    "27447": {"name": "Total knee replacement", "requires_pa": True, "category": "surgery"},
}


def _get_agent_ctx(state: dict[str, Any]) -> AgentContext:
    """Extract agent context from state."""
    return AgentContext(
        agent_type=AgentType.PRIOR_AUTH,
        tenant_id=state.get("tenant_id", "dev-tenant-001"),
        session_id=state.get("metadata", {}).get("session_id", ""),
        patient_id=state.get("patient_id"),
        encounter_id=state.get("encounter_id"),
        purpose_of_use="TREAT",
    )


async def check_pa_requirement(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Check if prior authorization is required for this procedure."""
    agent_ctx = _get_agent_ctx(state)
    procedure_code = state.get("procedure_code", "")
    payer = state.get("payer", "")
    patient_id = state.get("patient_id", "")

    try:
        # Check eligibility to get payer rules
        eligibility = await billing_check_eligibility(patient_id=patient_id)

        if "error" in eligibility:
            return {"status": "error", "error": eligibility["error"]}

        # Get payer rules
        rules = await billing_payer_rules(payer_name=payer or eligibility.get("payer", ""))

        # Check if procedure requires PA
        procedure_info = _PROCEDURE_INFO.get(procedure_code, {
            "name": f"Unknown procedure {procedure_code}",
            "requires_pa": True,
            "category": "unknown",
        })

        pa_required_list = eligibility.get("prior_auth_required", [])
        pa_required = (
            procedure_info.get("requires_pa", False)
            or procedure_info.get("category", "").upper() in [x.upper() for x in pa_required_list]
        )

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="check_pa_requirement",
            metadata={
                "procedure_code": procedure_code,
                "pa_required": pa_required,
                "payer": eligibility.get("payer", ""),
            },
        )

        return {
            "pa_required": pa_required,
            "payer_rules": rules if isinstance(rules, dict) else {},
            "status": "pa_check_complete",
            "metadata": {
                **(state.get("metadata") or {}),
                "procedure_info": procedure_info,
                "eligibility": {
                    "payer": eligibility.get("payer"),
                    "plan_type": eligibility.get("plan_type"),
                    "status": eligibility.get("status"),
                },
            },
        }

    except Exception as exc:
        logger.exception("Error checking PA requirement")
        return {"status": "error", "error": str(exc)}


async def gather_clinical_evidence(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Gather supporting clinical evidence from FHIR."""
    agent_ctx = _get_agent_ctx(state)
    patient_id = state.get("patient_id", "")

    try:
        # Get all patient resources
        everything = await fhir_patient_everything(patient_id=patient_id)

        entries = everything.get("entry", [])
        evidence = [e.get("resource", {}) for e in entries]

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="gather_clinical_evidence",
            metadata={"resource_count": len(evidence)},
        )

        return {
            "clinical_evidence": evidence,
            "status": "evidence_gathered",
        }

    except Exception as exc:
        logger.exception("Error gathering clinical evidence")
        return {"status": "error", "error": str(exc)}


async def generate_justification(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Generate medical necessity justification narrative."""
    agent_ctx = _get_agent_ctx(state)
    procedure_code = state.get("procedure_code", "")
    procedure_info = state.get("metadata", {}).get("procedure_info", {})
    diagnosis_codes = state.get("diagnosis_codes", [])

    try:
        # In production: send to Claude via Bedrock for narrative generation
        # In development: generate mock justification
        justification = (
            f"MEDICAL NECESSITY JUSTIFICATION\n\n"
            f"Procedure: {procedure_code} - {procedure_info.get('name', 'Unknown')}\n"
            f"Diagnosis: {', '.join(diagnosis_codes)}\n\n"
            f"Clinical Summary:\n"
            f"The patient presents with symptoms consistent with the documented diagnoses. "
            f"Conservative treatment options have been attempted including physical therapy, "
            f"NSAIDs, and activity modification over a period of 6+ weeks without adequate "
            f"improvement. The requested procedure is medically necessary to:\n"
            f"1. Definitively diagnose the underlying pathology\n"
            f"2. Provide targeted treatment for the confirmed condition\n"
            f"3. Prevent progression and functional decline\n\n"
            f"Evidence-based guidelines support this intervention for patients who have "
            f"failed conservative management as documented in the clinical record."
        )

        confidence = 0.87  # Mock confidence

        emit_agent_event(
            agent_ctx,
            "output.generated",
            tool_name="generate_justification",
            confidence=ConfidenceScore(score=confidence, model_id="claude-sonnet-4-20250514"),
        )

        return {
            "justification": justification,
            "confidence": confidence,
            "status": "justification_generated",
        }

    except Exception as exc:
        logger.exception("Error generating justification")
        return {"status": "error", "error": str(exc)}


async def create_pa_form(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Create the prior authorization form (X12 278 equivalent)."""
    agent_ctx = _get_agent_ctx(state)
    patient_id = state.get("patient_id", "")
    procedure_code = state.get("procedure_code", "")
    procedure_info = state.get("metadata", {}).get("procedure_info", {})
    diagnosis_codes = state.get("diagnosis_codes", [])

    try:
        # Read patient details
        patient = await fhir_read(resource_type="Patient", resource_id=patient_id)

        patient_name = "Unknown"
        if "name" in patient and patient["name"]:
            name = patient["name"][0]
            patient_name = f"{name.get('given', [''])[0]} {name.get('family', '')}"

        pa_form = {
            "form_id": f"PA-{uuid4().hex[:8].upper()}",
            "form_type": "X12_278_equivalent",
            "patient": {
                "id": patient_id,
                "name": patient_name,
                "dob": patient.get("birthDate", ""),
            },
            "requesting_provider": {
                "name": "Dr. Sarah Williams",
                "npi": "1234567890",
                "specialty": "Orthopedics",
            },
            "service_requested": {
                "cpt_code": procedure_code,
                "description": procedure_info.get("name", ""),
                "quantity": 1,
                "place_of_service": "11",  # Office
            },
            "diagnosis_codes": diagnosis_codes,
            "clinical_justification": state.get("justification", ""),
            "urgency": "routine",
            "payer": state.get("metadata", {}).get("eligibility", {}).get("payer", ""),
            "status": "draft",
            "created_at": "2026-02-28T00:00:00Z",
        }

        emit_agent_event(
            agent_ctx,
            "resource.created",
            resource_type="PriorAuthForm",
            resource_id=pa_form["form_id"],
        )

        return {
            "pa_form": pa_form,
            "status": "form_created",
        }

    except Exception as exc:
        logger.exception("Error creating PA form")
        return {"status": "error", "error": str(exc)}


async def submit_for_approval(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Submit PA form for human review (ALWAYS requires approval)."""
    agent_ctx = _get_agent_ctx(state)
    pa_form = state.get("pa_form", {})
    confidence = ConfidenceScore(
        score=state.get("confidence", 0.0),
        model_id="claude-sonnet-4-20250514",
    )

    import json

    result = route_by_confidence(
        content=json.dumps(pa_form, default=str),
        confidence=confidence,
        agent_ctx=agent_ctx,
        task_title=(
            f"Review Prior Auth for patient {state.get('patient_id', 'unknown')}"
            f" - {state.get('procedure_code', '')}"
        ),
        resource_type="PriorAuthForm",
        resource_id=pa_form.get("form_id"),
        payload={
            "pa_form": pa_form,
            "justification": state.get("justification"),
            "clinical_evidence_count": len(state.get("clinical_evidence", [])),
        },
    )

    return {
        "approval_task_id": result.get("task_id", ""),
        "status": "submitted_for_approval",
        "metadata": {
            **(state.get("metadata") or {}),
            "approval_action": result.get("action"),
        },
    }


async def done_no_pa(state: dict[str, Any]) -> dict[str, Any]:
    """Node: No PA required - complete immediately."""
    agent_ctx = _get_agent_ctx(state)

    emit_agent_event(
        agent_ctx,
        "output.generated",
        metadata={"result": "no_pa_required", "procedure": state.get("procedure_code")},
    )

    return {
        "status": "completed_no_pa",
        "metadata": {
            **(state.get("metadata") or {}),
            "result": "Prior authorization is NOT required for this procedure.",
        },
    }


def route_pa_required(state: dict[str, Any]) -> str:
    """Conditional edge: route based on whether PA is required."""
    if state.get("status") == "error":
        return "error"
    if state.get("pa_required", False):
        return "pa_required"
    return "no_pa"


async def handle_error(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Handle errors in the pipeline."""
    agent_ctx = _get_agent_ctx(state)
    emit_agent_event(agent_ctx, "tool.error", metadata={"error": state.get("error", "Unknown")})
    return {"status": "error"}
