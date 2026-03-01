"""Prior Authorization agent state definition for LangGraph."""

from __future__ import annotations

from typing import Any, TypedDict


class PriorAuthState(TypedDict, total=False):
    """State for the Prior Authorization LangGraph agent.

    Fields:
        patient_id: Patient needing prior auth
        encounter_id: Related encounter
        procedure_code: CPT code requiring auth
        diagnosis_codes: ICD-10 codes supporting necessity
        payer: Insurance payer name
        tenant_id: Multi-tenant isolation

        pa_required: Whether PA is required for this procedure
        payer_rules: Payer-specific rules and requirements
        clinical_evidence: Gathered FHIR resources
        justification: AI-generated medical necessity narrative
        pa_form: Generated PA form data
        approval_task_id: ID of the human review task

        status: Current workflow stage
        error: Error message if any
        confidence: Overall confidence score
        messages: LangGraph message history
        metadata: Additional context
    """

    # Identifiers
    patient_id: str
    encounter_id: str
    procedure_code: str
    diagnosis_codes: list[str]
    payer: str
    tenant_id: str

    # Pipeline data
    pa_required: bool
    payer_rules: dict[str, Any]
    clinical_evidence: list[dict[str, Any]]
    justification: str
    pa_form: dict[str, Any]
    approval_task_id: str

    # Workflow control
    status: str
    error: str
    confidence: float

    # LangGraph
    messages: list[dict[str, Any]]
    metadata: dict[str, Any]
