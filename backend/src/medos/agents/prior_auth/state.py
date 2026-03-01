"""Prior Authorization agent state definition for LangGraph.

Defines the typed state that flows through the Prior Authorization
state machine. Each node reads/writes to this state.
"""

from __future__ import annotations

from typing import Any, TypedDict


class PriorAuthState(TypedDict, total=False):
    """State for the Prior Authorization LangGraph agent.

    Fields:
        claim_id: Associated claim identifier
        patient_id: Patient needing prior auth
        encounter_id: Related encounter
        procedure_codes: CPT codes requiring authorization
        diagnosis_codes: ICD-10 codes supporting medical necessity
        payer_id: Insurance payer identifier
        payer_name: Insurance payer display name
        tenant_id: Multi-tenant isolation

        pa_required: Whether PA is required for this procedure
        pa_requirement_reason: Why PA is or is not required
        clinical_evidence: Gathered FHIR resources supporting the request
        clinical_justification: AI-generated medical necessity narrative
        pa_form: Structured PA request form (X12 278 equivalent)
        confidence: Overall confidence score
        status: Current workflow stage
        error: Error message if any
        requires_human_review: Whether human review is needed
        approval_task_id: ID of the human review task

        messages: LangGraph message history
        metadata: Additional context
    """

    # Identifiers
    claim_id: str
    patient_id: str
    encounter_id: str
    procedure_codes: list[str]
    diagnosis_codes: list[str]
    payer_id: str
    payer_name: str
    tenant_id: str

    # Pipeline data
    pa_required: bool
    pa_requirement_reason: str
    clinical_evidence: list[dict[str, Any]]
    clinical_justification: str
    pa_form: dict[str, Any]

    # Workflow control
    confidence: float
    status: str
    error: str | None
    requires_human_review: bool
    approval_task_id: str | None

    # LangGraph
    messages: list[dict[str, Any]]
    metadata: dict[str, Any]
