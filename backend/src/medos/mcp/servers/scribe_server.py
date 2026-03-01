"""AI Scribe MCP Server - 6 tools for ambient clinical documentation.

Exposes the AI Scribe pipeline as MCP tools:
  1. Start a documentation session
  2. Submit audio for transcription
  3. Get transcript
  4. Get AI-generated SOAP note with ICD-10/CPT codes
  5. Submit clinician review
  6. Check session status

In development, uses mock data. In production, integrates with
Whisper v3 (transcription) and Claude via Bedrock (SOAP generation).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from medos.mcp.decorators import hipaa_tool
from medos.schemas.agent import AgentType

logger = logging.getLogger(__name__)

# Agent types that can access Scribe tools
_SCRIBE_AGENTS = [AgentType.CLINICAL_SCRIBE, AgentType.SYSTEM]

# In-memory session store for development
_scribe_sessions: dict[str, dict[str, Any]] = {}

# Demo SOAP note template
_DEMO_SOAP_NOTE = {
    "subjective": (
        "Patient reports persistent right knee pain for 3 weeks, rated 6/10. "
        "Pain worsens with stairs and prolonged standing. Denies trauma or locking. "
        "Has been taking OTC ibuprofen with minimal relief. No fever or swelling noted by patient."
    ),
    "objective": {
        "vitals": {"bp": "128/82", "hr": "76", "temp": "98.4F", "bmi": "28.3"},
        "exam": (
            "Right knee: mild effusion, tender along medial joint line. "
            "ROM 0-120 degrees (normal 0-135). Positive McMurray test. "
            "Negative Lachman. No erythema or warmth. Gait antalgic."
        ),
    },
    "assessment": [
        {
            "description": "Right knee internal derangement, likely medial meniscus tear",
            "icd10": {"code": "M23.21", "display": "Derangement of medial meniscus, right knee"},
            "confidence": 0.89,
        },
        {
            "description": "Knee osteoarthritis, right",
            "icd10": {"code": "M17.11", "display": "Primary osteoarthritis, right knee"},
            "confidence": 0.72,
        },
    ],
    "plan": [
        "MRI right knee to evaluate meniscal integrity",
        "Continue ibuprofen 400mg TID with food",
        "Physical therapy referral - 2x/week for 6 weeks",
        "Follow-up in 2 weeks with MRI results",
        "Activity modification: avoid stairs and prolonged standing",
    ],
    "cpt_codes": [
        {"code": "99214", "display": "Office visit, established patient, moderate complexity", "confidence": 0.92},
        {"code": "73721", "display": "MRI knee without contrast", "confidence": 0.95},
    ],
}

_DEMO_TRANSCRIPT = (
    "Doctor: Good morning, Mr. Chen. What brings you in today?\n"
    "Patient: Hi doctor. I've been having this pain in my right knee for about three weeks now.\n"
    "Doctor: Can you describe the pain? Where exactly do you feel it?\n"
    "Patient: It's mostly on the inside part of my knee. It's like a deep ache, "
    "and it gets worse when I go up stairs or stand for a long time.\n"
    "Doctor: Did anything specific happen before the pain started? Any injury or twist?\n"
    "Patient: Not that I can think of. It just kind of started gradually.\n"
    "Doctor: On a scale of 1 to 10, how would you rate the pain?\n"
    "Patient: I'd say about a 6 most of the time. Sometimes 7 or 8 on stairs.\n"
    "Doctor: Have you been taking anything for it?\n"
    "Patient: Just ibuprofen from the store. It helps a little but doesn't take it away.\n"
    "Doctor: Okay, let me examine your knee...\n"
)


# ---------------------------------------------------------------------------
# Tool Handlers (decorated with @hipaa_tool)
# ---------------------------------------------------------------------------


@hipaa_tool(phi_level="full", allowed_agents=_SCRIBE_AGENTS, server="scribe")
async def scribe_start_session(
    patient_id: str = "",
    encounter_id: str = "",
    provider_id: str = "",
) -> dict[str, Any]:
    """Start a new AI Scribe documentation session."""
    session_id = f"scribe-{uuid4().hex[:8]}"
    session = {
        "session_id": session_id,
        "patient_id": patient_id,
        "encounter_id": encounter_id,
        "provider_id": provider_id,
        "status": "recording",
        "started_at": datetime.now(UTC).isoformat(),
        "transcript": None,
        "soap_note": None,
        "review_status": "pending",
    }

    _scribe_sessions[session_id] = session
    logger.info("Started scribe session %s for patient %s", session_id, patient_id)

    return {
        "session_id": session_id,
        "status": "recording",
        "message": "Session started. Submit audio or text for transcription.",
    }


@hipaa_tool(phi_level="full", allowed_agents=_SCRIBE_AGENTS, server="scribe")
async def scribe_submit_audio(
    session_id: str = "",
    audio_url: str = "",
) -> dict[str, Any]:
    """Submit audio for transcription (mock: uses demo transcript)."""
    session = _scribe_sessions.get(session_id)
    if not session:
        return {"error": f"Session {session_id} not found"}

    # In production: send audio to Whisper v3 for transcription
    # In development: use demo transcript
    session["transcript"] = _DEMO_TRANSCRIPT
    session["status"] = "transcribed"

    return {
        "session_id": session_id,
        "status": "transcribed",
        "transcript_length": len(_DEMO_TRANSCRIPT),
        "message": "Audio transcribed. Call scribe_get_soap_note to generate documentation.",
    }


@hipaa_tool(phi_level="full", allowed_agents=_SCRIBE_AGENTS, server="scribe")
async def scribe_get_transcript(session_id: str = "") -> dict[str, Any]:
    """Get the transcript for a scribe session."""
    session = _scribe_sessions.get(session_id)
    if not session:
        return {"error": f"Session {session_id} not found"}

    if not session.get("transcript"):
        return {"error": "No transcript available. Submit audio first."}

    return {
        "session_id": session_id,
        "transcript": session["transcript"],
        "status": session["status"],
    }


@hipaa_tool(phi_level="full", allowed_agents=_SCRIBE_AGENTS, server="scribe")
async def scribe_get_soap_note(session_id: str = "") -> dict[str, Any]:
    """Generate a SOAP note with ICD-10/CPT codes from the transcript."""
    session = _scribe_sessions.get(session_id)
    if not session:
        return {"error": f"Session {session_id} not found"}

    if not session.get("transcript"):
        return {"error": "No transcript available. Submit audio first."}

    # In production: send transcript to Claude via Bedrock for SOAP generation
    # In development: use demo SOAP note
    session["soap_note"] = _DEMO_SOAP_NOTE
    session["status"] = "documented"

    return {
        "session_id": session_id,
        "status": "documented",
        "soap_note": _DEMO_SOAP_NOTE,
        "confidence": {
            "overall": 0.88,
            "requires_review": False,
            "model_id": "claude-sonnet-4-20250514",
        },
        "message": "SOAP note generated. Submit for clinician review with scribe_submit_review.",
    }


@hipaa_tool(phi_level="full", allowed_agents=_SCRIBE_AGENTS, server="scribe")
async def scribe_submit_review(
    session_id: str = "",
    approved: bool = False,
    modifications: dict[str, Any] | None = None,
    reviewer_id: str = "",
) -> dict[str, Any]:
    """Submit clinician review of the generated SOAP note."""
    modifications = modifications or {}
    session = _scribe_sessions.get(session_id)
    if not session:
        return {"error": f"Session {session_id} not found"}

    session["review_status"] = "approved" if approved else "rejected"
    session["reviewed_by"] = reviewer_id
    session["reviewed_at"] = datetime.now(UTC).isoformat()
    session["status"] = "finalized" if approved else "revision_needed"

    if modifications and session.get("soap_note"):
        for key, value in modifications.items():
            if key in session["soap_note"]:
                session["soap_note"][key] = value

    return {
        "session_id": session_id,
        "status": session["status"],
        "review_status": session["review_status"],
        "message": "Review submitted." + (" Note finalized." if approved else " Revisions requested."),
    }


@hipaa_tool(phi_level="limited", allowed_agents=_SCRIBE_AGENTS, server="scribe")
async def scribe_session_status(session_id: str = "") -> dict[str, Any]:
    """Check the status of a scribe session."""
    session = _scribe_sessions.get(session_id)
    if not session:
        return {"error": f"Session {session_id} not found"}

    return {
        "session_id": session_id,
        "patient_id": session["patient_id"],
        "encounter_id": session["encounter_id"],
        "status": session["status"],
        "review_status": session["review_status"],
        "started_at": session["started_at"],
        "has_transcript": session.get("transcript") is not None,
        "has_soap_note": session.get("soap_note") is not None,
    }


# ---------------------------------------------------------------------------
# Registration (called at startup)
# ---------------------------------------------------------------------------


def register_scribe_tools() -> None:
    """Initialize scribe server. Tool registration happens via @hipaa_tool decorators."""
    logger.info("Scribe server initialized")
