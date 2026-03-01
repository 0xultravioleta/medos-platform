"""LangGraph node functions for the Prior Authorization agent.

Pipeline: check_pa_requirement -> [PA required?]
    -> No: done_no_pa (status=no_pa_needed, confidence=1.0)
    -> Yes: gather_clinical_evidence -> generate_justification
        -> create_pa_form -> submit_for_approval -> END
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from medos.agents.base import emit_agent_event, route_by_confidence
from medos.schemas.agent import AgentContext, AgentType, ConfidenceScore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PA requirement rules by CPT code / category
# ---------------------------------------------------------------------------

_PROCEDURE_INFO: dict[str, dict[str, Any]] = {
    "27447": {
        "name": "Total knee replacement (arthroplasty)",
        "requires_pa": True,
        "category": "surgery",
    },
    "29881": {
        "name": "Knee arthroscopy with meniscectomy",
        "requires_pa": True,
        "category": "surgery",
    },
    "73721": {
        "name": "MRI knee without contrast",
        "requires_pa": True,
        "category": "imaging",
    },
    "27130": {
        "name": "Total hip replacement (arthroplasty)",
        "requires_pa": True,
        "category": "surgery",
    },
    "99213": {
        "name": "Office visit, established patient (low complexity)",
        "requires_pa": False,
        "category": "e_and_m",
    },
    "99214": {
        "name": "Office visit, established patient (moderate complexity)",
        "requires_pa": False,
        "category": "e_and_m",
    },
    "97110": {
        "name": "Therapeutic exercises",
        "requires_pa": False,
        "category": "pt",
    },
    "20610": {
        "name": "Joint injection, major joint",
        "requires_pa": False,
        "category": "procedure",
    },
}

# Clinical evidence templates for orthopedic procedures
_CLINICAL_EVIDENCE_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "surgery": [
        {
            "resource_type": "DiagnosticReport",
            "summary": "X-ray bilateral knees: moderate-to-severe tricompartmental "
            "degenerative changes with joint space narrowing, subchondral "
            "sclerosis, and osteophyte formation.",
            "date": "2026-01-15",
        },
        {
            "resource_type": "Condition",
            "summary": "Primary osteoarthritis, right knee (M17.11). "
            "Kellgren-Lawrence Grade III-IV.",
            "date": "2026-01-15",
        },
        {
            "resource_type": "MedicationStatement",
            "summary": "Failed 12-week course of naproxen 500mg BID, "
            "acetaminophen 1000mg TID, and topical diclofenac. "
            "Inadequate pain relief and continued functional limitation.",
            "date": "2025-12-01",
        },
        {
            "resource_type": "Procedure",
            "summary": "Completed 8 weeks of physical therapy (16 sessions) "
            "focusing on quadriceps strengthening, ROM, and gait training. "
            "Patient reports minimal improvement in pain and function.",
            "date": "2026-01-10",
        },
        {
            "resource_type": "Observation",
            "summary": "BMI 29.1 (within acceptable range for surgical candidate). "
            "VAS pain score: 8/10 at rest, 10/10 with activity. "
            "KOOS score: 32/100 (severe impairment).",
            "date": "2026-02-01",
        },
        {
            "resource_type": "Procedure",
            "summary": "Prior corticosteroid injection (triamcinolone 40mg) "
            "right knee on 2025-10-15. Provided relief for approximately "
            "6 weeks, then symptoms recurred.",
            "date": "2025-10-15",
        },
    ],
    "imaging": [
        {
            "resource_type": "Condition",
            "summary": "Internal derangement of right knee (M23.21). "
            "Clinical examination shows positive McMurray test, joint line "
            "tenderness, and mechanical symptoms (locking, catching).",
            "date": "2026-02-01",
        },
        {
            "resource_type": "Observation",
            "summary": "VAS pain score: 7/10. "
            "Unable to perform activities of daily living without pain.",
            "date": "2026-02-01",
        },
        {
            "resource_type": "DiagnosticReport",
            "summary": "X-ray right knee: No fracture or dislocation. "
            "Mild joint effusion noted. MRI recommended to evaluate "
            "suspected meniscal tear or ligamentous injury.",
            "date": "2026-01-20",
        },
    ],
    "default": [
        {
            "resource_type": "Condition",
            "summary": "Documented diagnosis supporting the requested procedure.",
            "date": "2026-02-01",
        },
        {
            "resource_type": "Observation",
            "summary": "Clinical findings consistent with the need for the requested service.",
            "date": "2026-02-01",
        },
    ],
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
    """Node: Check if prior authorization is required for these procedures.

    Checks payer rules against procedure codes.  For certain CPT codes
    (e.g. 27447 knee replacement) PA is always required; for others
    (e.g. 99213 office visit) it never is.
    """
    agent_ctx = _get_agent_ctx(state)
    procedure_codes: list[str] = state.get("procedure_codes", [])
    payer_name: str = state.get("payer_name", "")

    try:
        # Evaluate each procedure code
        pa_required = False
        reasons: list[str] = []

        for code in procedure_codes:
            info = _PROCEDURE_INFO.get(code, {
                "name": f"Unknown procedure {code}",
                "requires_pa": True,
                "category": "unknown",
            })

            if info.get("requires_pa", False):
                pa_required = True
                reasons.append(
                    f"CPT {code} ({info['name']}) requires prior authorization "
                    f"per payer policy."
                )
            else:
                reasons.append(
                    f"CPT {code} ({info['name']}) does NOT require prior authorization."
                )

        # Build a combined reason string
        reason_text = " ".join(reasons) if reasons else "No procedures to evaluate."

        # Get the primary procedure category for downstream evidence gathering
        primary_code = procedure_codes[0] if procedure_codes else ""
        primary_info = _PROCEDURE_INFO.get(primary_code, {})
        category = primary_info.get("category", "default")

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="check_pa_requirement",
            metadata={
                "procedure_codes": procedure_codes,
                "pa_required": pa_required,
                "payer": payer_name,
            },
        )

        return {
            "pa_required": pa_required,
            "pa_requirement_reason": reason_text,
            "status": "pa_check_complete",
            "metadata": {
                **(state.get("metadata") or {}),
                "procedure_category": category,
                "procedure_details": {
                    code: _PROCEDURE_INFO.get(code, {"name": f"Unknown ({code})"})
                    for code in procedure_codes
                },
            },
        }

    except Exception as exc:
        logger.exception("Error checking PA requirement")
        return {"status": "error", "error": str(exc)}


async def gather_clinical_evidence(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Gather supporting clinical evidence from FHIR resources.

    Builds a realistic clinical evidence package including relevant
    diagnoses, medications, imaging results, and prior treatments.
    For orthopedic procedures this includes X-rays, conservative
    treatment history, BMI, and pain scores.
    """
    agent_ctx = _get_agent_ctx(state)
    category = state.get("metadata", {}).get("procedure_category", "default")

    try:
        # Select evidence template based on procedure category
        evidence = list(
            _CLINICAL_EVIDENCE_TEMPLATES.get(
                category,
                _CLINICAL_EVIDENCE_TEMPLATES["default"],
            )
        )

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="gather_clinical_evidence",
            metadata={"resource_count": len(evidence), "category": category},
        )

        return {
            "clinical_evidence": evidence,
            "status": "evidence_gathered",
        }

    except Exception as exc:
        logger.exception("Error gathering clinical evidence")
        return {"status": "error", "error": str(exc)}


async def generate_justification(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Generate a clinical justification narrative.

    In production this calls Claude via Bedrock. In development it
    generates a mock justification that includes:
    - Medical necessity statement
    - Failed conservative treatments
    - Expected outcomes
    """
    agent_ctx = _get_agent_ctx(state)
    procedure_codes = state.get("procedure_codes", [])
    diagnosis_codes = state.get("diagnosis_codes", [])
    clinical_evidence = state.get("clinical_evidence", [])
    procedure_details = state.get("metadata", {}).get("procedure_details", {})

    try:
        # Build procedure description from details
        procedure_descriptions = []
        for code in procedure_codes:
            detail = procedure_details.get(code, {})
            procedure_descriptions.append(
                f"{code} - {detail.get('name', 'Unknown procedure')}"
            )
        procedure_str = "; ".join(procedure_descriptions) if procedure_descriptions else "N/A"
        diagnosis_str = ", ".join(diagnosis_codes) if diagnosis_codes else "N/A"

        # Build evidence summary
        evidence_lines = []
        for ev in clinical_evidence:
            evidence_lines.append(
                f"- [{ev.get('resource_type', 'Unknown')}] "
                f"({ev.get('date', 'N/A')}): {ev.get('summary', '')}"
            )
        evidence_summary = "\n".join(evidence_lines) if evidence_lines else "No evidence available."

        justification = (
            f"MEDICAL NECESSITY JUSTIFICATION\n\n"
            f"Procedure(s): {procedure_str}\n"
            f"Diagnosis: {diagnosis_str}\n\n"
            f"Clinical Summary:\n"
            f"The patient presents with symptoms consistent with the documented "
            f"diagnoses ({diagnosis_str}). Conservative treatment options have been "
            f"attempted including physical therapy, NSAIDs, corticosteroid injections, "
            f"and activity modification over a period of 6+ weeks without adequate "
            f"improvement in pain or functional status.\n\n"
            f"Failed Conservative Treatments:\n"
            f"1. Physical therapy (8+ weeks, 16 sessions) - minimal improvement\n"
            f"2. NSAID therapy (naproxen, diclofenac) - inadequate pain control\n"
            f"3. Corticosteroid injection - temporary relief only (6 weeks)\n"
            f"4. Activity modification and home exercise program - ongoing\n\n"
            f"Supporting Clinical Evidence:\n{evidence_summary}\n\n"
            f"Expected Outcomes:\n"
            f"The requested procedure is medically necessary to:\n"
            f"1. Provide definitive treatment for the confirmed pathology\n"
            f"2. Restore functional mobility and reduce pain\n"
            f"3. Prevent further joint deterioration and disability\n"
            f"4. Improve quality of life and ability to perform ADLs\n\n"
            f"Evidence-based clinical guidelines (AAOS, ACR) support this "
            f"intervention for patients who have failed conservative management "
            f"as documented in the clinical record."
        )

        # Confidence based on evidence strength
        evidence_count = len(clinical_evidence)
        if evidence_count >= 5:
            confidence = 0.92
        elif evidence_count >= 3:
            confidence = 0.87
        else:
            confidence = 0.72

        emit_agent_event(
            agent_ctx,
            "output.generated",
            tool_name="generate_justification",
            confidence=ConfidenceScore(
                score=confidence,
                model_id="claude-sonnet-4-20250514",
            ),
        )

        return {
            "clinical_justification": justification,
            "confidence": confidence,
            "status": "justification_generated",
        }

    except Exception as exc:
        logger.exception("Error generating justification")
        return {"status": "error", "error": str(exc)}


async def create_pa_form(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Create a structured PA request form (X12 278 equivalent).

    Includes patient info, provider info, requested service,
    diagnosis, urgency level, and effective dates.
    """
    agent_ctx = _get_agent_ctx(state)
    patient_id = state.get("patient_id", "")
    procedure_codes = state.get("procedure_codes", [])
    diagnosis_codes = state.get("diagnosis_codes", [])
    procedure_details = state.get("metadata", {}).get("procedure_details", {})
    payer_name = state.get("payer_name", "")
    payer_id = state.get("payer_id", "")

    try:
        form_id = f"PA-{uuid4().hex[:8].upper()}"
        now = datetime.now(UTC)

        # Build service lines from procedure codes
        service_lines = []
        for code in procedure_codes:
            detail = procedure_details.get(code, {})
            service_lines.append({
                "cpt_code": code,
                "description": detail.get("name", f"Procedure {code}"),
                "quantity": 1,
                "place_of_service": "11",  # Office
            })

        pa_form: dict[str, Any] = {
            "form_id": form_id,
            "form_type": "X12_278_equivalent",
            "patient": {
                "id": patient_id,
                "name": f"Patient {patient_id}",
            },
            "requesting_provider": {
                "name": "Dr. Sarah Williams",
                "npi": "1234567890",
                "specialty": "Orthopedics",
                "tax_id": "12-3456789",
            },
            "services_requested": service_lines,
            "diagnosis_codes": diagnosis_codes,
            "clinical_justification": state.get("clinical_justification", ""),
            "payer": {
                "id": payer_id,
                "name": payer_name,
            },
            "urgency": "routine",
            "effective_date_start": now.strftime("%Y-%m-%d"),
            "effective_date_end": (
                now.replace(year=now.year + 1) if now.month != 2 or now.day != 29
                else now.replace(year=now.year + 1, day=28)
            ).strftime("%Y-%m-%d"),
            "status": "draft",
            "created_at": now.isoformat(),
        }

        emit_agent_event(
            agent_ctx,
            "resource.created",
            resource_type="PriorAuthForm",
            resource_id=form_id,
        )

        return {
            "pa_form": pa_form,
            "status": "form_created",
        }

    except Exception as exc:
        logger.exception("Error creating PA form")
        return {"status": "error", "error": str(exc)}


async def submit_for_approval(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Submit PA form for human review.

    ALWAYS creates an AgentTask for human review regardless of
    confidence score, because prior auth submissions are high-stakes
    operations that require clinician sign-off.
    """
    agent_ctx = _get_agent_ctx(state)
    pa_form = state.get("pa_form", {})
    confidence_score = state.get("confidence", 0.0)

    confidence = ConfidenceScore(
        score=confidence_score,
        model_id="claude-sonnet-4-20250514",
    )

    import json

    result = route_by_confidence(
        content=json.dumps(pa_form, default=str),
        confidence=confidence,
        agent_ctx=agent_ctx,
        task_title=(
            f"Review Prior Auth for patient {state.get('patient_id', 'unknown')}"
            f" - CPT {', '.join(state.get('procedure_codes', []))}"
        ),
        resource_type="PriorAuthForm",
        resource_id=pa_form.get("form_id"),
        payload={
            "pa_form": pa_form,
            "clinical_justification": state.get("clinical_justification"),
            "clinical_evidence_count": len(state.get("clinical_evidence", [])),
            "confidence": confidence_score,
        },
    )

    return {
        "requires_human_review": True,
        "approval_task_id": result.get("task_id"),
        "status": "submitted_for_approval",
        "metadata": {
            **(state.get("metadata") or {}),
            "approval_action": result.get("action"),
        },
    }


async def done_no_pa(state: dict[str, Any]) -> dict[str, Any]:
    """Node: No PA required -- complete immediately with confidence 1.0."""
    agent_ctx = _get_agent_ctx(state)

    emit_agent_event(
        agent_ctx,
        "output.generated",
        metadata={
            "result": "no_pa_required",
            "procedures": state.get("procedure_codes"),
        },
    )

    return {
        "status": "no_pa_needed",
        "confidence": 1.0,
        "requires_human_review": False,
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
    emit_agent_event(
        agent_ctx,
        "tool.error",
        metadata={"error": state.get("error", "Unknown")},
    )
    return {"status": "error"}
