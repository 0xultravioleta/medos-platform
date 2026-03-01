"""LangGraph node functions for the Denial Management agent.

Pipeline: analyze_denial -> assess_appeal_viability -> [viable?]
    -> No: report_no_appeal -> END
    -> Yes: gather_evidence -> draft_appeal_letter -> submit_for_approval -> END
"""

from __future__ import annotations

import logging
from typing import Any

from medos.agents.base import emit_agent_event, route_by_confidence
from medos.mcp.servers.billing_server import billing_claim_status, billing_denial_lookup
from medos.mcp.servers.fhir_server import fhir_patient_everything
from medos.schemas.agent import AgentContext, AgentType, ConfidenceScore

logger = logging.getLogger(__name__)


def _get_agent_ctx(state: dict[str, Any]) -> AgentContext:
    """Extract agent context from state."""
    return AgentContext(
        agent_type=AgentType.DENIAL_MANAGEMENT,
        tenant_id=state.get("tenant_id", "dev-tenant-001"),
        session_id=state.get("metadata", {}).get("session_id", ""),
        purpose_of_use="HPAYMT",
    )


async def analyze_denial(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Analyze the denial - get claim details and lookup denial code."""
    agent_ctx = _get_agent_ctx(state)
    claim_id = state.get("claim_id", "")

    try:
        # Get claim details
        claim_data = await billing_claim_status(claim_id=claim_id)
        if "error" in claim_data:
            return {"status": "error", "error": claim_data["error"]}

        if claim_data.get("status") != "denied":
            return {
                "status": "error",
                "error": f"Claim {claim_id} is not denied (status: {claim_data.get('status')})",
            }

        # Lookup denial code
        denial_code = claim_data.get("denial_code", "")
        denial_info = await billing_denial_lookup(denial_code=denial_code)

        # Classify root cause
        root_cause_map = {
            "CO-4": "coding_error",
            "CO-16": "missing_information",
            "CO-50": "medical_necessity",
            "CO-197": "missing_authorization",
            "PR-1": "patient_responsibility",
            "OA-23": "coordination_of_benefits",
        }
        root_cause = root_cause_map.get(denial_code, "unknown")

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="analyze_denial",
            metadata={
                "claim_id": claim_id,
                "denial_code": denial_code,
                "root_cause": root_cause,
            },
        )

        return {
            "claim_data": claim_data,
            "denial_code": denial_code,
            "denial_info": denial_info if isinstance(denial_info, dict) else {},
            "root_cause": root_cause,
            "status": "denial_analyzed",
        }

    except Exception as exc:
        logger.exception("Error analyzing denial")
        return {"status": "error", "error": str(exc)}


async def assess_appeal_viability(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Assess whether an appeal is viable and likely to succeed."""
    agent_ctx = _get_agent_ctx(state)
    denial_info = state.get("denial_info", {})
    root_cause = state.get("root_cause", "")

    try:
        success_rate = denial_info.get("appeal_success_rate", 0.0)

        # Determine viability based on root cause and success rate
        viable = success_rate >= 0.30 and root_cause != "patient_responsibility"

        # Mock confidence-weighted probability
        appeal_probability = success_rate * 0.9  # Slight discount from historical

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="assess_appeal_viability",
            metadata={
                "viable": viable,
                "probability": appeal_probability,
                "root_cause": root_cause,
            },
        )

        return {
            "appeal_viable": viable,
            "appeal_probability": appeal_probability,
            "confidence": appeal_probability,
            "status": "viability_assessed",
            "metadata": {
                **(state.get("metadata") or {}),
                "common_fix": denial_info.get("common_fix", ""),
                "historical_success_rate": success_rate,
            },
        }

    except Exception as exc:
        logger.exception("Error assessing appeal viability")
        return {"status": "error", "error": str(exc)}


async def gather_evidence(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Gather supporting clinical evidence for the appeal."""
    agent_ctx = _get_agent_ctx(state)
    claim_data = state.get("claim_data", {})
    patient_id = claim_data.get("patient_id", "")

    try:
        if patient_id:
            everything = await fhir_patient_everything(patient_id=patient_id)
            entries = everything.get("entry", [])
            evidence = [e.get("resource", {}) for e in entries]
        else:
            evidence = []

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="gather_evidence",
            metadata={"resource_count": len(evidence)},
        )

        return {
            "clinical_evidence": evidence,
            "status": "evidence_gathered",
        }

    except Exception as exc:
        logger.exception("Error gathering evidence")
        return {"status": "error", "error": str(exc)}


async def draft_appeal_letter(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Draft a professional appeal letter."""
    agent_ctx = _get_agent_ctx(state)
    claim_data = state.get("claim_data", {})
    denial_info = state.get("denial_info", {})
    root_cause = state.get("root_cause", "")
    common_fix = state.get("metadata", {}).get("common_fix", "")

    try:
        # In production: send to Claude via Bedrock
        # In development: generate structured mock letter
        claim_id = claim_data.get("claim_id", "Unknown")
        patient_name = claim_data.get("patient_name", "Unknown Patient")
        payer = claim_data.get("payer", "Unknown Payer")
        denial_code = state.get("denial_code", "")
        denial_reason = denial_info.get("reason", claim_data.get("denial_reason", ""))

        appeal_letter = (
            f"APPEAL LETTER\n"
            f"{'='*60}\n\n"
            f"Date: February 28, 2026\n"
            f"Re: Appeal of Claim {claim_id}\n"
            f"Patient: {patient_name}\n"
            f"Payer: {payer}\n\n"
            f"Dear Claims Review Department,\n\n"
            f"We are writing to formally appeal the denial of claim {claim_id}, "
            f"denied under code {denial_code}: \"{denial_reason}\"\n\n"
            f"ROOT CAUSE ANALYSIS:\n"
            f"Our review indicates this denial falls under the category of "
            f"'{root_cause.replace('_', ' ')}'. {common_fix}\n\n"
            f"CORRECTIVE ACTION:\n"
            f"We have reviewed the claim and are providing the following "
            f"corrected/additional information to support reconsideration:\n"
            f"- Updated clinical documentation attached\n"
            f"- {len(state.get('clinical_evidence', []))} supporting FHIR resources referenced\n"
            f"- CPT codes: {', '.join(claim_data.get('cpt_codes', []))}\n"
            f"- ICD-10 codes: {', '.join(claim_data.get('icd10_codes', []))}\n\n"
            f"We respectfully request that this claim be reconsidered for "
            f"payment based on the information provided.\n\n"
            f"Sincerely,\n"
            f"MedOS Healthcare OS\n"
            f"(Generated by AI - Requires physician review before submission)"
        )

        confidence = state.get("appeal_probability", 0.5) * 1.1  # Slight boost
        confidence = min(confidence, 0.95)

        emit_agent_event(
            agent_ctx,
            "output.generated",
            tool_name="draft_appeal_letter",
            confidence=ConfidenceScore(score=confidence, model_id="claude-sonnet-4-20250514"),
        )

        return {
            "appeal_letter": appeal_letter,
            "confidence": confidence,
            "status": "letter_drafted",
        }

    except Exception as exc:
        logger.exception("Error drafting appeal letter")
        return {"status": "error", "error": str(exc)}


async def submit_for_approval(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Submit appeal for human review (ALWAYS requires approval)."""
    agent_ctx = _get_agent_ctx(state)
    confidence = ConfidenceScore(
        score=state.get("confidence", 0.0),
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
            "claim_data": state.get("claim_data"),
            "denial_code": state.get("denial_code"),
            "root_cause": state.get("root_cause"),
            "appeal_probability": state.get("appeal_probability"),
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


async def report_no_appeal(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Report that appeal is not viable."""
    agent_ctx = _get_agent_ctx(state)

    emit_agent_event(
        agent_ctx,
        "output.generated",
        metadata={
            "result": "appeal_not_viable",
            "claim_id": state.get("claim_id"),
            "root_cause": state.get("root_cause"),
            "probability": state.get("appeal_probability"),
        },
    )

    return {
        "status": "completed_no_appeal",
        "metadata": {
            **(state.get("metadata") or {}),
            "result": (
                f"Appeal is NOT recommended for claim {state.get('claim_id')}. "
                f"Root cause: {state.get('root_cause', 'unknown')}. "
                f"Estimated success probability: {state.get('appeal_probability', 0):.0%}"
            ),
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
    """Node: Handle errors."""
    agent_ctx = _get_agent_ctx(state)
    emit_agent_event(agent_ctx, "tool.error", metadata={"error": state.get("error", "Unknown")})
    return {"status": "error"}
