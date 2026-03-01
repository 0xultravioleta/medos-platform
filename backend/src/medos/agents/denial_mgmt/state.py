"""Denial Management agent state definition for LangGraph.

Defines the typed state that flows through the Denial Management
state machine. Each node reads/writes to this state.
"""

from __future__ import annotations

from typing import Any, TypedDict


class DenialManagementState(TypedDict, total=False):
    """State for the Denial Management LangGraph agent.

    Fields:
        claim_id: Denied claim identifier
        patient_id: Patient associated with the denied claim
        original_billed_amount: Original billed amount on the claim
        denial_code: CARC code (e.g., "CO-16", "CO-4", "PR-1")
        denial_reason: Human-readable denial reason
        denial_date: Date the denial was received
        payer_id: Insurance payer identifier
        payer_name: Insurance payer name
        tenant_id: Multi-tenant isolation

        root_cause_category: Classified root cause category
        appeal_viable: Whether an appeal is recommended
        appeal_probability: Estimated probability of appeal success
        historical_success_rate: Historical success rate for this denial type
        supporting_evidence: List of evidence documents gathered for appeal
        appeal_letter: Generated professional appeal letter
        corrective_actions: Recommended corrective actions

        confidence: Overall confidence score for the agent output
        status: Current workflow stage
        error: Error message if any
        requires_human_review: Whether human review is required
        approval_task_id: ID of the human review task

        messages: LangGraph message history
        metadata: Additional context
    """

    # Identifiers
    claim_id: str
    patient_id: str
    tenant_id: str

    # Claim data
    original_billed_amount: float
    denial_code: str
    denial_reason: str
    denial_date: str
    payer_id: str
    payer_name: str

    # Analysis results
    root_cause_category: str
    appeal_viable: bool
    appeal_probability: float
    historical_success_rate: float
    supporting_evidence: list[dict[str, Any]]
    appeal_letter: str
    corrective_actions: list[str]

    # Workflow control
    confidence: float
    status: str
    error: str | None
    requires_human_review: bool
    approval_task_id: str | None

    # LangGraph
    messages: list[dict[str, Any]]
    metadata: dict[str, Any]
