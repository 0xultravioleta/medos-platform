"""Agent Task review workflow endpoints.

Provides API for clinicians to review and approve/reject
agent-generated tasks (SOAP notes, claims, prior auths).

Endpoints:
    GET  /api/v1/agent-tasks          - List pending tasks
    GET  /api/v1/agent-tasks/{id}     - Get task detail
    POST /api/v1/agent-tasks/{id}/review - Approve/reject task
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from medos.agents.base import get_pending_tasks, get_task, review_task
from medos.middleware.auth import get_current_user
from medos.schemas.agent import AgentType
from medos.schemas.auth import UserContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agent-tasks", tags=["Agent Tasks"])


class ReviewRequest(BaseModel):
    """Request body for task review."""

    approved: bool
    notes: str = ""


@router.get("")
async def list_agent_tasks(
    agent_type: str | None = None,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """List pending agent tasks for the current tenant."""
    at = None
    if agent_type:
        try:
            at = AgentType(agent_type)
        except ValueError:
            raise HTTPException(400, f"Invalid agent_type: {agent_type}")  # noqa: B904

    tasks = get_pending_tasks(user.tenant_id, agent_type=at)
    return {
        "tasks": [t.model_dump() for t in tasks],
        "total": len(tasks),
    }


@router.get("/{task_id}")
async def get_agent_task(
    task_id: str,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Get a specific agent task by ID."""
    task = get_task(task_id)
    if not task:
        raise HTTPException(404, f"Task {task_id} not found")
    if task.tenant_id != user.tenant_id:
        raise HTTPException(403, "Access denied to this task")
    return task.model_dump()


@router.post("/{task_id}/review")
async def review_agent_task(
    task_id: str,
    body: ReviewRequest,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Approve or reject an agent task."""
    task = get_task(task_id)
    if not task:
        raise HTTPException(404, f"Task {task_id} not found")
    if task.tenant_id != user.tenant_id:
        raise HTTPException(403, "Access denied to this task")

    reviewed = review_task(
        task_id=task_id,
        approved=body.approved,
        reviewer_id=user.user_id,
        notes=body.notes,
    )

    if not reviewed:
        raise HTTPException(500, "Failed to review task")

    return {
        "task_id": task_id,
        "status": reviewed.status.value,
        "reviewed_by": reviewed.reviewed_by,
        "message": "Task approved" if body.approved else "Task rejected",
    }
