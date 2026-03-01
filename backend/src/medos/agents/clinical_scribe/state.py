"""Clinical Scribe agent state definition for LangGraph.

Defines the typed state that flows through the Clinical Scribe
state machine. Each node reads/writes to this state.
"""

from __future__ import annotations

from typing import Any, TypedDict


class ScribeState(TypedDict, total=False):
    """State for the Clinical Scribe LangGraph agent.

    Fields:
        session_id: Scribe session identifier
        patient_id: Patient being documented
        encounter_id: Current encounter
        provider_id: Attending clinician
        tenant_id: Multi-tenant isolation

        audio_url: S3 presigned URL to audio recording
        transcript: Raw transcript text
        soap_note: Generated SOAP note dict
        icd10_codes: Suggested ICD-10 codes
        cpt_codes: Suggested CPT codes
        confidence: Overall confidence score

        status: Current workflow stage
        error: Error message if any
        requires_review: Whether human review is needed
        review_decision: approved/rejected after review

        messages: LangGraph message history for Claude
        metadata: Additional context (encounter type, specialty, etc.)
    """

    # Identifiers
    session_id: str
    patient_id: str
    encounter_id: str
    provider_id: str
    tenant_id: str

    # Pipeline data
    audio_url: str
    transcript: str
    soap_note: dict[str, Any]
    icd10_codes: list[dict[str, Any]]
    cpt_codes: list[dict[str, Any]]
    confidence: float

    # Workflow control
    status: str  # recording, transcribing, generating, reviewing, finalized, error
    error: str
    requires_review: bool
    review_decision: str  # pending, approved, rejected

    # LangGraph
    messages: list[dict[str, Any]]
    metadata: dict[str, Any]
