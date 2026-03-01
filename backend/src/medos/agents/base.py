"""Base agent infrastructure for MedOS LangGraph agents.

Provides:
- Common state management patterns
- Confidence-based routing (auto-approve vs human review)
- HIPAA audit wrapper for every agent action
- Standardized error handling
- Event emission to Redis Streams

All MedOS agents inherit from this module's patterns.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from medos.config import settings
from medos.core.audit_agent import log_agent_audit_event
from medos.core.safety_layer import safety_layer
from medos.schemas.agent import (
    AgentContext,
    AgentEvent,
    AgentTask,
    AgentTaskStatus,
    AgentType,
    ConfidenceScore,
    SafetyAction,
)

logger = logging.getLogger(__name__)

# In-memory task store for agent review workflow (Redis in production)
_agent_tasks: dict[str, AgentTask] = {}


def _schedule_broadcast(event: dict[str, Any]) -> None:
    """Schedule a WebSocket broadcast (fire-and-forget).

    Imports ws_events lazily to avoid circular dependencies.
    Silently ignores errors if no event loop is running.
    """
    try:
        from medos.routers.ws_events import broadcast_event

        loop = asyncio.get_running_loop()
        loop.create_task(broadcast_event(event))
    except RuntimeError:
        # No running event loop (e.g. in sync tests) -- skip
        pass


def create_agent_context(
    agent_type: AgentType,
    tenant_id: str,
    *,
    user_id: str = "",
    encounter_id: str | None = None,
    patient_id: str | None = None,
    purpose_of_use: str = "TREAT",
    fhir_scopes: list[str] | None = None,
) -> AgentContext:
    """Factory for creating agent contexts with sensible defaults."""
    return AgentContext(
        agent_type=agent_type,
        tenant_id=tenant_id,
        user_id=user_id,
        session_id=str(uuid4()),
        encounter_id=encounter_id,
        patient_id=patient_id,
        purpose_of_use=purpose_of_use,
        fhir_scopes=fhir_scopes or _default_scopes(agent_type),
    )


def _default_scopes(agent_type: AgentType) -> list[str]:
    """Return default FHIR scopes for an agent type."""
    scope_map = {
        AgentType.CLINICAL_SCRIBE: [
            "patient/Patient.read",
            "patient/Encounter.read",
            "patient/Encounter.write",
            "patient/Observation.read",
            "patient/Condition.read",
            "patient/Condition.write",
            "patient/DocumentReference.write",
        ],
        AgentType.PRIOR_AUTH: [
            "patient/Patient.read",
            "patient/Coverage.read",
            "patient/Claim.read",
            "patient/Claim.write",
        ],
        AgentType.DENIAL_MANAGEMENT: [
            "patient/Claim.read",
            "patient/ClaimResponse.read",
            "patient/ClaimResponse.write",
        ],
        AgentType.BILLING: [
            "patient/Claim.read",
            "patient/Claim.write",
            "patient/Coverage.read",
            "patient/ClaimResponse.read",
        ],
        AgentType.SCHEDULING: [
            "patient/Appointment.read",
            "patient/Appointment.write",
            "patient/Schedule.read",
            "patient/Slot.read",
        ],
        AgentType.PATIENT_COMMS: [
            "patient/Patient.read",
            "patient/Appointment.read",
        ],
        AgentType.QUALITY_REPORTING: [
            "patient/MeasureReport.read",
            "patient/MeasureReport.write",
        ],
        AgentType.SYSTEM: ["system/*.*"],
    }
    return scope_map.get(agent_type, [])


def route_by_confidence(
    content: str,
    confidence: ConfidenceScore,
    agent_ctx: AgentContext,
    *,
    task_title: str = "Agent output review",
    resource_type: str | None = None,
    resource_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Route agent output based on confidence score.

    High confidence (>= auto_approve_threshold): auto-approve
    Medium confidence (>= confidence_threshold): pass with flag
    Low confidence (< confidence_threshold): create review task

    Returns:
        {
            "action": "auto_approved" | "passed" | "review_required",
            "task_id": str | None,
            "content": str,
        }
    """
    auto_threshold = settings.agent_auto_approve_threshold
    review_threshold = settings.agent_confidence_threshold

    # Run safety check
    safety_result = safety_layer.check(content, agent_ctx, confidence)

    if safety_result.action == SafetyAction.BLOCK:
        logger.warning(
            "Agent output blocked: %s (agent=%s, session=%s)",
            safety_result.reason,
            agent_ctx.agent_type,
            agent_ctx.session_id,
        )
        return {
            "action": "blocked",
            "reason": safety_result.reason,
            "content": "",
        }

    effective_content = safety_result.sanitized_content or content

    if confidence.score >= auto_threshold:
        return {
            "action": "auto_approved",
            "task_id": None,
            "content": effective_content,
        }

    if confidence.score >= review_threshold:
        return {
            "action": "passed",
            "task_id": None,
            "content": effective_content,
        }

    # Below threshold - create review task
    task = AgentTask(
        task_id=str(uuid4()),
        agent_type=agent_ctx.agent_type,
        tenant_id=agent_ctx.tenant_id,
        status=AgentTaskStatus.PENDING,
        title=task_title,
        description=f"Confidence: {confidence.score:.2f} (threshold: {review_threshold})",
        resource_type=resource_type,
        resource_id=resource_id,
        confidence=confidence,
        payload=payload or {"content": effective_content},
    )
    _agent_tasks[task.task_id] = task

    log_agent_audit_event(AgentEvent(
        event_type="review.requested",
        agent_type=agent_ctx.agent_type,
        tenant_id=agent_ctx.tenant_id,
        session_id=agent_ctx.session_id,
        metadata={"task_id": task.task_id, "confidence": confidence.score},
    ))

    # Broadcast task creation event via WebSocket
    _schedule_broadcast({
        "type": "task_created",
        "task_id": task.task_id,
        "agent_type": agent_ctx.agent_type.value,
        "title": task_title,
        "confidence": confidence.score,
    })

    return {
        "action": "review_required",
        "task_id": task.task_id,
        "content": effective_content,
    }


def emit_agent_event(
    agent_ctx: AgentContext,
    event_type: str,
    *,
    tool_name: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    confidence: ConfidenceScore | None = None,
    metadata: dict[str, Any] | None = None,
) -> AgentEvent:
    """Emit a structured agent event (audit + event bus)."""
    event = AgentEvent(
        event_type=event_type,
        agent_type=agent_ctx.agent_type,
        agent_version=agent_ctx.agent_version,
        tenant_id=agent_ctx.tenant_id,
        session_id=agent_ctx.session_id,
        tool_name=tool_name,
        resource_type=resource_type,
        resource_id=resource_id,
        confidence=confidence,
        metadata=metadata or {},
    )
    log_agent_audit_event(event)
    return event


# ---------------------------------------------------------------------------
# Agent Task Management (for human review workflow)
# ---------------------------------------------------------------------------


def get_pending_tasks(
    tenant_id: str,
    agent_type: AgentType | None = None,
) -> list[AgentTask]:
    """Get all pending review tasks for a tenant."""
    tasks = [
        t
        for t in _agent_tasks.values()
        if t.tenant_id == tenant_id and t.status == AgentTaskStatus.PENDING
    ]
    if agent_type:
        tasks = [t for t in tasks if t.agent_type == agent_type]
    return sorted(tasks, key=lambda t: t.created_at)


def get_task(task_id: str) -> AgentTask | None:
    """Get a specific agent task by ID."""
    return _agent_tasks.get(task_id)


def review_task(
    task_id: str,
    approved: bool,
    reviewer_id: str,
    notes: str = "",
) -> AgentTask | None:
    """Complete a review on an agent task."""
    task = _agent_tasks.get(task_id)
    if not task:
        return None

    task.status = AgentTaskStatus.APPROVED if approved else AgentTaskStatus.REJECTED
    task.reviewed_by = reviewer_id
    task.reviewed_at = datetime.now(UTC)
    task.review_notes = notes

    logger.info(
        "Agent task %s %s by %s",
        task_id,
        "approved" if approved else "rejected",
        reviewer_id,
    )

    # Broadcast review event via WebSocket
    _schedule_broadcast({
        "type": "task_reviewed",
        "task_id": task_id,
        "action": "approved" if approved else "rejected",
        "reviewed_by": reviewer_id,
    })

    return task
