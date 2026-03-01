"""Tests for AI Scribe MCP Server tools."""

import pytest

from medos.mcp.servers.scribe_server import (
    scribe_get_soap_note,
    scribe_get_transcript,
    scribe_session_status,
    scribe_start_session,
    scribe_submit_audio,
    scribe_submit_review,
)


# ---------------------------------------------------------------------------
# Full pipeline: start -> submit audio -> transcript -> SOAP -> review
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_scribe_full_pipeline():
    # 1. Start session
    result = await scribe_start_session(patient_id="p-001", encounter_id="enc-001", provider_id="dr-001")
    assert result["status"] == "recording"
    session_id = result["session_id"]

    # 2. Submit audio
    result = await scribe_submit_audio(session_id=session_id)
    assert result["status"] == "transcribed"

    # 3. Get transcript
    result = await scribe_get_transcript(session_id=session_id)
    assert "transcript" in result
    assert len(result["transcript"]) > 0

    # 4. Generate SOAP note
    result = await scribe_get_soap_note(session_id=session_id)
    assert result["status"] == "documented"
    soap = result["soap_note"]
    assert "subjective" in soap
    assert "objective" in soap
    assert "assessment" in soap
    assert "plan" in soap
    assert len(soap["assessment"]) > 0
    assert "icd10" in soap["assessment"][0]

    # 5. Submit review
    result = await scribe_submit_review(session_id=session_id, approved=True, reviewer_id="dr-001")
    assert result["status"] == "finalized"
    assert result["review_status"] == "approved"


# ---------------------------------------------------------------------------
# Individual tool tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_start_session():
    result = await scribe_start_session(patient_id="p-002")
    assert "session_id" in result
    assert result["status"] == "recording"


@pytest.mark.asyncio
async def test_submit_audio_unknown_session():
    result = await scribe_submit_audio(session_id="nonexistent")
    assert "error" in result


@pytest.mark.asyncio
async def test_get_transcript_no_audio():
    result = await scribe_start_session(patient_id="p-003")
    session_id = result["session_id"]
    result = await scribe_get_transcript(session_id=session_id)
    assert "error" in result


@pytest.mark.asyncio
async def test_soap_note_no_transcript():
    result = await scribe_start_session(patient_id="p-004")
    session_id = result["session_id"]
    result = await scribe_get_soap_note(session_id=session_id)
    assert "error" in result


@pytest.mark.asyncio
async def test_session_status():
    result = await scribe_start_session(patient_id="p-001")
    session_id = result["session_id"]
    status = await scribe_session_status(session_id=session_id)
    assert status["patient_id"] == "p-001"
    assert status["status"] == "recording"
    assert status["has_transcript"] is False
    assert status["has_soap_note"] is False


@pytest.mark.asyncio
async def test_submit_review_rejected():
    result = await scribe_start_session(patient_id="p-005")
    session_id = result["session_id"]
    await scribe_submit_audio(session_id=session_id)
    await scribe_get_soap_note(session_id=session_id)
    result = await scribe_submit_review(session_id=session_id, approved=False, reviewer_id="dr-002")
    assert result["status"] == "revision_needed"
    assert result["review_status"] == "rejected"


@pytest.mark.asyncio
async def test_soap_note_confidence():
    result = await scribe_start_session(patient_id="p-001")
    session_id = result["session_id"]
    await scribe_submit_audio(session_id=session_id)
    result = await scribe_get_soap_note(session_id=session_id)
    assert "confidence" in result
    assert result["confidence"]["overall"] > 0
