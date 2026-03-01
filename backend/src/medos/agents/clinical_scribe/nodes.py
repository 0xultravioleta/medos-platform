"""LangGraph node functions for the Clinical Scribe agent.

Each function is a node in the state graph:
  receive_audio -> transcribe -> generate_soap -> review_coding -> route_confidence -> finalize
"""

from __future__ import annotations

import logging
from typing import Any

from medos.agents.base import emit_agent_event, route_by_confidence
from medos.mcp.servers.scribe_server import (
    scribe_get_soap_note,
    scribe_get_transcript,
    scribe_start_session,
    scribe_submit_audio,
)
from medos.schemas.agent import AgentContext, AgentType, ConfidenceScore

logger = logging.getLogger(__name__)


def _get_agent_ctx(state: dict[str, Any]) -> AgentContext:
    """Extract agent context from state."""
    return AgentContext(
        agent_type=AgentType.CLINICAL_SCRIBE,
        tenant_id=state.get("tenant_id", "dev-tenant-001"),
        session_id=state.get("session_id", ""),
        patient_id=state.get("patient_id"),
        encounter_id=state.get("encounter_id"),
        purpose_of_use="TREAT",
    )


async def receive_audio(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Initialize scribe session and receive audio input."""
    agent_ctx = _get_agent_ctx(state)

    try:
        # Start scribe session via MCP tool (now uses kwargs)
        result = await scribe_start_session(
            patient_id=state.get("patient_id", ""),
            encounter_id=state.get("encounter_id", ""),
            provider_id=state.get("provider_id", ""),
        )

        session_id = result.get("session_id", state.get("session_id", ""))

        emit_agent_event(
            agent_ctx,
            "resource.created",
            resource_type="ScribeSession",
            resource_id=session_id,
        )

        return {
            "session_id": session_id,
            "status": "recording",
        }

    except Exception as exc:
        logger.exception("Error in receive_audio node")
        return {"status": "error", "error": str(exc)}


async def transcribe(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Submit audio and get transcript."""
    agent_ctx = _get_agent_ctx(state)
    session_id = state.get("session_id", "")

    try:
        # Submit audio via MCP scribe server (now uses kwargs)
        result = await scribe_submit_audio(
            session_id=session_id,
            audio_url=state.get("audio_url", ""),
        )

        if "error" in result:
            return {"status": "error", "error": result["error"]}

        emit_agent_event(
            agent_ctx,
            "tool.invoked",
            tool_name="scribe_submit_audio",
            resource_type="Transcript",
        )

        # Retrieve transcript (now uses kwargs)
        transcript_result = await scribe_get_transcript(session_id=session_id)

        return {
            "transcript": transcript_result.get("transcript", ""),
            "status": "transcribed",
        }

    except Exception as exc:
        logger.exception("Error in transcribe node")
        return {"status": "error", "error": str(exc)}


async def generate_soap(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Generate SOAP note from transcript using AI."""
    agent_ctx = _get_agent_ctx(state)
    session_id = state.get("session_id", "")

    try:
        # Generate SOAP note via MCP scribe server (now uses kwargs)
        result = await scribe_get_soap_note(session_id=session_id)

        if "error" in result:
            return {"status": "error", "error": result["error"]}

        soap_note = result.get("soap_note", {})
        confidence_data = result.get("confidence", {})
        overall_confidence = confidence_data.get("overall", 0.0)

        # Extract codes from SOAP note
        icd10_codes = [
            {"code": a["icd10"]["code"], "display": a["icd10"]["display"], "confidence": a.get("confidence", 0.0)}
            for a in soap_note.get("assessment", [])
            if "icd10" in a
        ]
        cpt_codes = soap_note.get("cpt_codes", [])

        emit_agent_event(
            agent_ctx,
            "output.generated",
            tool_name="scribe_get_soap_note",
            resource_type="DocumentReference",
            confidence=ConfidenceScore(
                score=overall_confidence,
                model_id=confidence_data.get("model_id", ""),
            ),
        )

        return {
            "soap_note": soap_note,
            "icd10_codes": icd10_codes,
            "cpt_codes": cpt_codes,
            "confidence": overall_confidence,
            "status": "documented",
        }

    except Exception as exc:
        logger.exception("Error in generate_soap node")
        return {"status": "error", "error": str(exc)}


async def review_coding(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Review ICD-10/CPT coding accuracy."""
    agent_ctx = _get_agent_ctx(state)

    # Check each code's confidence
    icd10_codes = state.get("icd10_codes", [])
    cpt_codes = state.get("cpt_codes", [])

    low_confidence_codes = [
        c for c in icd10_codes + cpt_codes if c.get("confidence", 0) < 0.85
    ]

    overall_confidence = state.get("confidence", 0.0)

    if low_confidence_codes:
        logger.info(
            "Found %d low-confidence codes in session %s",
            len(low_confidence_codes),
            state.get("session_id", ""),
        )

    emit_agent_event(
        agent_ctx,
        "tool.invoked",
        tool_name="review_coding",
        metadata={
            "total_codes": len(icd10_codes) + len(cpt_codes),
            "low_confidence_count": len(low_confidence_codes),
        },
    )

    return {
        "requires_review": overall_confidence < 0.85 or len(low_confidence_codes) > 0,
        "status": "reviewed",
    }


def route_confidence(state: dict[str, Any]) -> str:
    """Conditional edge: route based on confidence and review needs."""
    if state.get("status") == "error":
        return "error"
    if state.get("requires_review", False):
        return "human_review"
    return "finalize"


async def request_human_review(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Create a human review task for low-confidence outputs."""
    agent_ctx = _get_agent_ctx(state)
    confidence = ConfidenceScore(
        score=state.get("confidence", 0.0),
        model_id="claude-sonnet-4-20250514",
    )

    import json

    result = route_by_confidence(
        content=json.dumps(state.get("soap_note", {}), default=str),
        confidence=confidence,
        agent_ctx=agent_ctx,
        task_title=f"Review SOAP note for patient {state.get('patient_id', 'unknown')}",
        resource_type="DocumentReference",
        payload={
            "soap_note": state.get("soap_note"),
            "icd10_codes": state.get("icd10_codes"),
            "cpt_codes": state.get("cpt_codes"),
        },
    )

    return {
        "review_decision": "pending",
        "status": "awaiting_review",
        "metadata": {
            **(state.get("metadata") or {}),
            "review_task_id": result.get("task_id"),
            "review_action": result.get("action"),
        },
    }


async def finalize(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Finalize the documentation session."""
    agent_ctx = _get_agent_ctx(state)

    emit_agent_event(
        agent_ctx,
        "output.generated",
        resource_type="DocumentReference",
        metadata={
            "session_id": state.get("session_id"),
            "confidence": state.get("confidence"),
            "icd10_count": len(state.get("icd10_codes", [])),
            "cpt_count": len(state.get("cpt_codes", [])),
        },
    )

    return {"status": "finalized"}


async def handle_error(state: dict[str, Any]) -> dict[str, Any]:
    """Node: Handle errors in the pipeline."""
    agent_ctx = _get_agent_ctx(state)

    emit_agent_event(
        agent_ctx,
        "tool.error",
        metadata={"error": state.get("error", "Unknown error")},
    )

    return {"status": "error"}
