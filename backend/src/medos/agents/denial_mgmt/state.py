"""Denial Management agent state definition for LangGraph."""

from __future__ import annotations

from typing import Any, TypedDict


class DenialState(TypedDict, total=False):
    """State for the Denial Management LangGraph agent.

    Fields:
        claim_id: Denied claim to analyze
        tenant_id: Multi-tenant isolation

        claim_data: Full claim details
        denial_code: CARC/RARC code
        denial_info: Code lookup details
        root_cause: Classified root cause
        appeal_viable: Whether appeal is recommended
        appeal_probability: Estimated success probability
        clinical_evidence: Supporting FHIR resources
        appeal_letter: Generated appeal letter
        approval_task_id: ID of the human review task

        status: Current workflow stage
        error: Error message if any
        confidence: Overall confidence score
        messages: LangGraph message history
        metadata: Additional context
    """

    # Identifiers
    claim_id: str
    tenant_id: str

    # Pipeline data
    claim_data: dict[str, Any]
    denial_code: str
    denial_info: dict[str, Any]
    root_cause: str
    appeal_viable: bool
    appeal_probability: float
    clinical_evidence: list[dict[str, Any]]
    appeal_letter: str
    approval_task_id: str

    # Workflow control
    status: str
    error: str
    confidence: float

    # LangGraph
    messages: list[dict[str, Any]]
    metadata: dict[str, Any]
