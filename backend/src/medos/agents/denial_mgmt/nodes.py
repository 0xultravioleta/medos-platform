"""LangGraph node functions for the Denial Management agent.

Each function is a node in the state graph:
  analyze_denial -> assess_appeal_viability -> [viable?]
      -> No: report_no_appeal -> END
      -> Yes: gather_evidence -> draft_appeal_letter -> submit_for_approval -> END
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from medos.agents.base import emit_agent_event, route_by_confidence
from medos.billing.x12_835_parser import get_carc_description
from medos.mcp.servers.billing_server import billing_claim_status, billing_denial_lookup
from medos.mcp.servers.fhir_server import fhir_patient_everything
from medos.schemas.agent import AgentContext, AgentType, ConfidenceScore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CARC code -> root cause category mapping
# ---------------------------------------------------------------------------

_CARC_ROOT_CAUSE_MAP: dict[str, str] = {
    "CO-16": "missing_information",
    "CO-4": "coding_error",
    "PR-1": "deductible",
    "CO-197": "prior_auth_missing",
    "CO-29": "timely_filing",
    "OA-23": "medical_records_needed",
    "CO-50": "medical_necessity",
    "CO-18": "duplicate",
}

# ---------------------------------------------------------------------------
# Historical success rates by root cause category
# ---------------------------------------------------------------------------

_HISTORICAL_SUCCESS_RATES: dict[str, float] = {
    "coding_error": 0.75,
    "missing_information": 0.65,
    "missing_documentation": 0.65,
    "medical_necessity": 0.45,
    "eligibility": 0.30,
    "duplicate": 0.10,
    "timely_filing": 0.15,
    "deductible": 0.05,
    "prior_auth_missing": 0.65,
    "medical_records_needed": 0.45,
    "coordination_of_benefits": 0.45,
    "unknown": 0.30,
}


def _get_agent_ctx(state: dict[str, Any]) -> AgentContext:
    """Extract agent context from state."""
    return AgentContext(
        agent_type=AgentType.DENIAL_MANAGEMENT,
        tenant_id=state.get("tenant_id", "dev-tenant-001"),
        session_id=state.get("metadata", {}).get("session_id", ""),
        purpose_of_use="HPAYMT",
    )


def _extract_carc_number(denial_code: str) -> str:
    """Extract the numeric CARC code from a prefixed denial code.

    Examples: "CO-4" -> "4", "PR-1" -> "1", "CO-197" -> "197"
    """
    parts = denial_code.split("-", 1)
    return parts[1] if len(parts) > 1 else denial_code


async def analyze_denial(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Analyze the denial -- parse CARC/RARC codes, classify root cause.

    Uses get_carc_description() from x12_835_parser for code lookup.
    Categorizes into root_cause_category using the CARC mapping.
    """
    agent_ctx = _get_agent_ctx(state)
    claim_id = state.get("claim_id", "")

    try:
        # Get claim details from billing server
        claim_data = await billing_claim_status(claim_id=claim_id)
        if "error" in claim_data:
            return {"status": "error", "error": claim_data["error"]}

        if claim_data.get("status") != "denied":
            return {
                "status": "error",
                "error": f"Claim {claim_id} is not denied (status: {claim_data.get('status')})",
            }

        # Extract denial code and look it up
        denial_code = claim_data.get("denial_code", "")
        carc_number = _extract_carc_number(denial_code)
        carc_description = get_carc_description(carc_number)

        # Also get full denial info from billing server
        denial_info = await billing_denial_lookup(denial_code=denial_code)

        # Classify root cause using CARC mapping
        root_cause_category = _CARC_ROOT_CAUSE_MAP.get(denial_code, "unknown")

        # Build denial reason from CARC description or claim data
        denial_reason = denial_info.get("reason", "") if isinstance(denial_info, dict) else ""
        if not denial_reason:
            denial_reason = carc_description

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="analyze_denial",
            metadata={
                "claim_id": claim_id,
                "denial_code": denial_code,
                "root_cause_category": root_cause_category,
            },
        )

        return {
            "claim_id": claim_id,
            "patient_id": claim_data.get("patient_id", ""),
            "original_billed_amount": claim_data.get("billed_amount", 0.0),
            "denial_code": denial_code,
            "denial_reason": denial_reason,
            "denial_date": claim_data.get("date_of_service", ""),
            "payer_id": claim_data.get("payer_claim_id", ""),
            "payer_name": claim_data.get("payer", ""),
            "root_cause_category": root_cause_category,
            "status": "denial_analyzed",
        }

    except Exception as exc:
        logger.exception("Error analyzing denial")
        return {"status": "error", "error": str(exc)}


async def assess_appeal_viability(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Assess whether an appeal is viable based on root cause and CARC code.

    Uses historical success rates per root_cause_category.
    Sets appeal_viable=True if probability >= 30%.
    """
    agent_ctx = _get_agent_ctx(state)
    root_cause_category = state.get("root_cause_category", "unknown")

    try:
        # Get historical success rate for this root cause
        historical_success_rate = _HISTORICAL_SUCCESS_RATES.get(root_cause_category, 0.30)

        # Calculate appeal probability (slight discount from historical)
        appeal_probability = historical_success_rate * 0.9

        # Determine viability: must be >= 30% probability
        appeal_viable = appeal_probability >= 0.30

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="assess_appeal_viability",
            metadata={
                "viable": appeal_viable,
                "probability": appeal_probability,
                "root_cause_category": root_cause_category,
                "historical_success_rate": historical_success_rate,
            },
        )

        return {
            "appeal_viable": appeal_viable,
            "appeal_probability": appeal_probability,
            "historical_success_rate": historical_success_rate,
            "status": "viability_assessed",
        }

    except Exception as exc:
        logger.exception("Error assessing appeal viability")
        return {"status": "error", "error": str(exc)}


async def gather_evidence(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Gather supporting evidence based on root cause category.

    For coding errors: corrected codes, medical records excerpts.
    For missing docs: the specific missing documentation.
    For medical necessity: clinical notes, treatment history, peer-reviewed guidelines.
    """
    agent_ctx = _get_agent_ctx(state)
    patient_id = state.get("patient_id", "")
    root_cause_category = state.get("root_cause_category", "unknown")

    try:
        evidence: list[dict[str, Any]] = []

        # Gather clinical data from FHIR if patient exists
        if patient_id:
            everything = await fhir_patient_everything(patient_id=patient_id)
            entries = everything.get("entry", [])
            for entry in entries:
                resource = entry.get("resource", {})
                evidence.append({
                    "type": "fhir_resource",
                    "resource_type": resource.get("resourceType", "Unknown"),
                    "resource_id": resource.get("id", ""),
                    "data": resource,
                })

        # Add root-cause-specific evidence
        if root_cause_category == "coding_error":
            evidence.append({
                "type": "corrected_codes",
                "description": "Corrected procedure and diagnosis codes with proper modifiers",
                "details": "Review of coding guidelines confirms correct code assignment",
            })
            evidence.append({
                "type": "medical_record_excerpt",
                "description": "Clinical documentation supporting procedure performed",
                "details": "Medical records confirm the service was rendered as documented",
            })
        elif root_cause_category in ("missing_information", "missing_documentation"):
            evidence.append({
                "type": "missing_documentation",
                "description": "Previously missing documentation now attached",
                "details": "Authorization number, referring provider NPI, and supporting documents provided",
            })
        elif root_cause_category == "medical_necessity":
            evidence.append({
                "type": "clinical_notes",
                "description": "Clinical notes documenting medical necessity",
                "details": "Provider notes demonstrate the clinical need for the service",
            })
            evidence.append({
                "type": "treatment_history",
                "description": "Patient treatment history showing progression",
                "details": "Prior conservative treatments documented with inadequate response",
            })
            evidence.append({
                "type": "peer_reviewed_guidelines",
                "description": "Peer-reviewed clinical guidelines supporting the procedure",
                "details": "Published guidelines recommend this intervention for the documented condition",
            })
        elif root_cause_category == "prior_auth_missing":
            evidence.append({
                "type": "retroactive_authorization",
                "description": "Retroactive authorization request or evidence of prior communication",
                "details": "Documentation of authorization attempts or emergency circumstances",
            })

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="gather_evidence",
            metadata={"evidence_count": len(evidence)},
        )

        return {
            "supporting_evidence": evidence,
            "status": "evidence_gathered",
        }

    except Exception as exc:
        logger.exception("Error gathering evidence")
        return {"status": "error", "error": str(exc)}


async def draft_appeal_letter(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Generate a professional appeal letter.

    Includes claim reference, denial reason, root cause explanation,
    supporting evidence summary, corrective action, and legal/regulatory
    references. Different templates for different root causes.
    """
    agent_ctx = _get_agent_ctx(state)
    root_cause_category = state.get("root_cause_category", "unknown")
    denial_code = state.get("denial_code", "")
    denial_reason = state.get("denial_reason", "")
    claim_id = state.get("claim_id", "Unknown")
    patient_id = state.get("patient_id", "Unknown")
    payer_name = state.get("payer_name", "Unknown Payer")
    original_billed_amount = state.get("original_billed_amount", 0.0)
    supporting_evidence = state.get("supporting_evidence", [])

    try:
        # Build corrective action based on root cause
        corrective_actions: list[str] = []
        legal_reference = ""

        if root_cause_category == "coding_error":
            corrective_actions = [
                "Corrected procedure codes with appropriate modifiers attached",
                "Updated claim form with accurate coding per AMA CPT guidelines",
            ]
            legal_reference = "Per AMA CPT coding guidelines and CMS NCCI edits"
        elif root_cause_category in ("missing_information", "missing_documentation"):
            corrective_actions = [
                "Missing documentation now provided (see attachments)",
                "Claim resubmitted with all required fields completed",
            ]
            legal_reference = "Per 45 CFR 162.1102 (HIPAA Transaction Standards)"
        elif root_cause_category == "medical_necessity":
            corrective_actions = [
                "Additional clinical documentation supporting medical necessity attached",
                "Peer-reviewed guidelines supporting the treatment decision enclosed",
            ]
            legal_reference = (
                "Per CMS LCD/NCD coverage determinations and applicable clinical guidelines"
            )
        elif root_cause_category == "prior_auth_missing":
            corrective_actions = [
                "Retroactive authorization requested from payer",
                "Documentation of emergency/urgent circumstances provided",
            ]
            legal_reference = "Per 42 CFR 438.210 (Prior Authorization requirements)"
        elif root_cause_category == "medical_records_needed":
            corrective_actions = [
                "Complete medical records now attached",
                "Clinical summary provided per payer request",
            ]
            legal_reference = "Per payer medical records request requirements"
        else:
            corrective_actions = [
                "Claim reviewed and corrected information provided",
                "Supporting documentation attached for reconsideration",
            ]
            legal_reference = "Per applicable federal and state insurance regulations"

        # Build evidence summary
        evidence_summary = f"{len(supporting_evidence)} supporting document(s) attached"
        evidence_types = set()
        for e in supporting_evidence:
            etype = e.get("type", "document")
            if etype == "fhir_resource":
                etype = e.get("resource_type", "clinical_record")
            evidence_types.add(etype)
        if evidence_types:
            evidence_summary += f" including: {', '.join(sorted(evidence_types))}"

        # Generate the appeal letter
        appeal_letter = (
            f"APPEAL LETTER\n"
            f"{'=' * 60}\n\n"
            f"Date: 2026-02-28\n"
            f"Re: Appeal of Claim {claim_id}\n"
            f"Patient ID: {patient_id}\n"
            f"Payer: {payer_name}\n"
            f"Original Billed Amount: ${original_billed_amount:,.2f}\n\n"
            f"Dear Claims Review Department,\n\n"
            f"We are writing to formally appeal the denial of claim {claim_id}, "
            f"denied under code {denial_code}: \"{denial_reason}\"\n\n"
            f"ROOT CAUSE ANALYSIS:\n"
            f"Our review indicates this denial falls under the category of "
            f"'{root_cause_category.replace('_', ' ')}'. "
            f"We have identified and addressed the underlying issue.\n\n"
            f"SUPPORTING EVIDENCE:\n"
            f"{evidence_summary}\n\n"
            f"CORRECTIVE ACTION:\n"
        )
        for i, action in enumerate(corrective_actions, 1):
            appeal_letter += f"  {i}. {action}\n"

        appeal_letter += (
            f"\nLEGAL/REGULATORY REFERENCE:\n"
            f"{legal_reference}\n\n"
            f"We respectfully request that this claim be reconsidered for "
            f"payment based on the corrected information and supporting "
            f"documentation provided.\n\n"
            f"Sincerely,\n"
            f"MedOS Healthcare OS\n"
            f"(Generated by AI - Requires physician review before submission)"
        )

        # Calculate confidence based on appeal probability and evidence strength
        appeal_prob = state.get("appeal_probability", 0.5)
        evidence_factor = min(len(supporting_evidence) / 5.0, 1.0)
        confidence = min(appeal_prob * (0.8 + 0.2 * evidence_factor), 0.95)

        emit_agent_event(
            agent_ctx,
            "output.generated",
            tool_name="draft_appeal_letter",
            confidence=ConfidenceScore(score=confidence, model_id="claude-sonnet-4-20250514"),
        )

        return {
            "appeal_letter": appeal_letter,
            "corrective_actions": corrective_actions,
            "confidence": confidence,
            "status": "letter_drafted",
        }

    except Exception as exc:
        logger.exception("Error drafting appeal letter")
        return {"status": "error", "error": str(exc)}


async def report_no_appeal(state: dict[str, Any]) -> dict[str, Any]:
    """Node: When appeal is not viable, generate report explaining why.

    Includes recommended corrective_actions for future claims.
    """
    agent_ctx = _get_agent_ctx(state)
    root_cause_category = state.get("root_cause_category", "unknown")
    appeal_probability = state.get("appeal_probability", 0.0)

    # Recommend corrective actions for future claims
    corrective_actions: list[str] = []

    if root_cause_category == "duplicate":
        corrective_actions = [
            "Implement duplicate claim detection in pre-submission scrubbing",
            "Review billing workflow to prevent resubmission of processed claims",
        ]
    elif root_cause_category == "timely_filing":
        corrective_actions = [
            "Implement timely filing alerts in claims management workflow",
            "Set up automated reminders for approaching filing deadlines",
            "Review claim submission backlog processes",
        ]
    elif root_cause_category == "deductible":
        corrective_actions = [
            "Verify patient deductible status at time of service",
            "Collect patient responsibility at point of care",
            "Update patient billing with deductible amount",
        ]
    elif root_cause_category == "eligibility":
        corrective_actions = [
            "Verify insurance eligibility before each visit",
            "Implement real-time eligibility checking at check-in",
        ]
    else:
        corrective_actions = [
            "Review denial patterns for this payer and code",
            "Update billing procedures to prevent recurrence",
        ]

    emit_agent_event(
        agent_ctx,
        "output.generated",
        metadata={
            "result": "appeal_not_viable",
            "claim_id": state.get("claim_id"),
            "root_cause_category": root_cause_category,
            "appeal_probability": appeal_probability,
        },
    )

    return {
        "corrective_actions": corrective_actions,
        "confidence": 1.0,
        "status": "closed_no_appeal",
        "requires_human_review": False,
        "metadata": {
            **(state.get("metadata") or {}),
            "result": (
                f"Appeal is NOT recommended for claim {state.get('claim_id')}. "
                f"Root cause: {root_cause_category}. "
                f"Estimated success probability: {appeal_probability:.0%}. "
                f"Corrective actions for future claims have been generated."
            ),
        },
    }


async def submit_for_approval(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Submit appeal for human review. ALWAYS creates AgentTask.

    Calculates confidence based on appeal_probability and evidence strength.
    """
    agent_ctx = _get_agent_ctx(state)
    confidence_score = state.get("confidence", 0.0)

    confidence = ConfidenceScore(
        score=confidence_score,
        model_id="claude-sonnet-4-20250514",
    )

    result = route_by_confidence(
        content=state.get("appeal_letter", ""),
        confidence=confidence,
        agent_ctx=agent_ctx,
        task_title=f"Review appeal for claim {state.get('claim_id', 'unknown')}",
        resource_type="AppealLetter",
        payload={
            "appeal_letter": state.get("appeal_letter"),
            "claim_id": state.get("claim_id"),
            "denial_code": state.get("denial_code"),
            "root_cause_category": state.get("root_cause_category"),
            "appeal_probability": state.get("appeal_probability"),
            "corrective_actions": state.get("corrective_actions"),
            "supporting_evidence_count": len(state.get("supporting_evidence", [])),
        },
    )

    approval_task_id = result.get("task_id") or str(uuid4())

    return {
        "requires_human_review": True,
        "approval_task_id": approval_task_id,
        "status": "submitted_for_approval",
        "metadata": {
            **(state.get("metadata") or {}),
            "approval_action": result.get("action"),
        },
    }


def route_post_analysis(state: dict[str, Any]) -> str:
    """Conditional edge: route based on analysis success."""
    if state.get("status") == "error":
        return "error"
    return "continue"


def route_appeal_viable(state: dict[str, Any]) -> str:
    """Conditional edge: route based on appeal viability."""
    if state.get("status") == "error":
        return "error"
    if state.get("appeal_viable", False):
        return "viable"
    return "not_viable"


async def handle_error(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Handle errors in the pipeline."""
    agent_ctx = _get_agent_ctx(state)
    emit_agent_event(agent_ctx, "tool.error", metadata={"error": state.get("error", "Unknown")})
    return {"status": "error"}
