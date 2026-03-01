"""Approval workflow endpoints for agent-generated tasks.

Provides a rich approval interface for reviewing agent outputs
(claims, prior auth forms, appeal letters) before they are
submitted to external systems.

Endpoints:
    GET  /api/v1/approvals              - List pending approvals
    GET  /api/v1/approvals/{id}         - Get approval detail
    POST /api/v1/approvals/{id}/approve - Approve with optional mods
    POST /api/v1/approvals/{id}/reject  - Reject with reason
    GET  /api/v1/approvals/stats        - Queue statistics
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from medos.agents.base import _agent_tasks, get_pending_tasks, get_task, review_task
from medos.middleware.auth import get_current_user
from medos.schemas.agent import AgentTaskStatus
from medos.schemas.auth import UserContext

router = APIRouter(prefix="/api/v1/approvals", tags=["Approvals"])


class ApprovalAction(BaseModel):
    """Request body for approve/reject actions."""
    notes: str = ""
    modifications: dict | None = None


@router.get("")
async def list_approvals(
    status: str = "pending",
    agent_type: str = "",
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """List approval tasks, optionally filtered by status and agent type."""
    tasks = get_pending_tasks(tenant_id=user.tenant_id)

    if status != "pending":
        # Get all tasks matching status
        status_enum_map = {
            "in_review": AgentTaskStatus.IN_REVIEW,
            "approved": AgentTaskStatus.APPROVED,
            "rejected": AgentTaskStatus.REJECTED,
            "auto_approved": AgentTaskStatus.AUTO_APPROVED,
        }
        target_status = status_enum_map.get(status)
        if target_status:
            tasks = [
                t for t in _agent_tasks.values()
                if t.tenant_id == user.tenant_id and t.status == target_status
            ]

    if agent_type:
        tasks = [t for t in tasks if t.agent_type.value == agent_type]

    return {
        "approvals": [
            {
                "task_id": t.task_id,
                "title": t.title,
                "agent_type": t.agent_type.value,
                "status": t.status.value,
                "confidence": t.confidence.score if t.confidence else None,
                "resource_type": t.resource_type,
                "created_at": t.created_at.isoformat(),
                "description": t.description,
            }
            for t in tasks
        ],
        "total": len(tasks),
    }


@router.get("/stats")
async def approval_stats(
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Get approval queue statistics."""
    tenant_tasks = [t for t in _agent_tasks.values() if t.tenant_id == user.tenant_id]

    by_status = {}
    by_agent = {}
    for t in tenant_tasks:
        status_key = t.status.value
        by_status[status_key] = by_status.get(status_key, 0) + 1
        agent_key = t.agent_type.value
        by_agent[agent_key] = by_agent.get(agent_key, 0) + 1

    pending = [t for t in tenant_tasks if t.status == AgentTaskStatus.PENDING]
    avg_confidence = 0.0
    if pending:
        scores = [t.confidence.score for t in pending if t.confidence]
        avg_confidence = sum(scores) / len(scores) if scores else 0.0

    return {
        "total_tasks": len(tenant_tasks),
        "by_status": by_status,
        "by_agent_type": by_agent,
        "pending_count": len(pending),
        "avg_confidence": round(avg_confidence, 3),
        "oldest_pending": min((t.created_at for t in pending), default=None),
    }


@router.get("/{task_id}")
async def get_approval(
    task_id: str,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Get full detail for an approval task."""
    task = get_task(task_id)
    if not task:
        return {"error": f"Task {task_id} not found"}
    if task.tenant_id != user.tenant_id:
        return {"error": "Not authorized to view this task"}

    return {
        "task_id": task.task_id,
        "title": task.title,
        "description": task.description,
        "agent_type": task.agent_type.value,
        "status": task.status.value,
        "confidence": {
            "score": task.confidence.score if task.confidence else None,
            "requires_review": task.confidence.requires_review if task.confidence else None,
            "model_id": task.confidence.model_id if task.confidence else None,
        },
        "resource_type": task.resource_type,
        "resource_id": task.resource_id,
        "payload": task.payload,
        "created_at": task.created_at.isoformat(),
        "reviewed_by": task.reviewed_by,
        "reviewed_at": task.reviewed_at.isoformat() if task.reviewed_at else None,
        "review_notes": task.review_notes,
    }


@router.post("/{task_id}/approve")
async def approve_task(
    task_id: str,
    action: ApprovalAction | None = None,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Approve an agent task with optional modifications."""
    action = action or ApprovalAction()
    task = get_task(task_id)
    if not task:
        return {"error": f"Task {task_id} not found"}
    if task.tenant_id != user.tenant_id:
        return {"error": "Not authorized"}

    # Apply modifications if provided
    if action.modifications and task.payload:
        task.payload.update(action.modifications)

    result = review_task(
        task_id=task_id,
        approved=True,
        reviewer_id=user.user_id,
        notes=action.notes,
    )

    if not result:
        return {"error": "Failed to approve task"}

    return {
        "task_id": task_id,
        "status": "approved",
        "reviewed_by": user.user_id,
        "reviewed_at": result.reviewed_at.isoformat() if result.reviewed_at else None,
        "message": "Task approved successfully.",
    }


@router.post("/{task_id}/reject")
async def reject_task(
    task_id: str,
    action: ApprovalAction | None = None,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Reject an agent task with reason."""
    action = action or ApprovalAction()
    task = get_task(task_id)
    if not task:
        return {"error": f"Task {task_id} not found"}
    if task.tenant_id != user.tenant_id:
        return {"error": "Not authorized"}

    result = review_task(
        task_id=task_id,
        approved=False,
        reviewer_id=user.user_id,
        notes=action.notes,
    )

    if not result:
        return {"error": "Failed to reject task"}

    return {
        "task_id": task_id,
        "status": "rejected",
        "reviewed_by": user.user_id,
        "reviewed_at": result.reviewed_at.isoformat() if result.reviewed_at else None,
        "notes": action.notes,
        "message": "Task rejected.",
    }
