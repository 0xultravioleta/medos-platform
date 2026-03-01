"""Tests for the Approval Workflow API endpoints."""

import pytest
from fastapi.testclient import TestClient

from medos.agents.base import _agent_tasks
from medos.main import app
from medos.middleware.auth import create_dev_token
from medos.schemas.agent import AgentTask, AgentTaskStatus, AgentType, ConfidenceScore

client = TestClient(app)

# Dev token for tenant matching seeded tasks
_TOKEN = create_dev_token(
    user_id="test-reviewer",
    tenant_id="dev-tenant-001",
    email="reviewer@medos.test",
    roles=["admin"],
)
_AUTH = {"Authorization": f"Bearer {_TOKEN}"}


@pytest.fixture(autouse=True)
def _clean_tasks():
    """Clear agent tasks before each test."""
    _agent_tasks.clear()
    # Seed a test task
    _agent_tasks["task-001"] = AgentTask(
        task_id="task-001",
        agent_type=AgentType.PRIOR_AUTH,
        tenant_id="dev-tenant-001",
        status=AgentTaskStatus.PENDING,
        title="Review PA for patient p-001",
        description="Confidence: 0.87",
        resource_type="PriorAuthForm",
        confidence=ConfidenceScore(score=0.87, model_id="claude-sonnet-4-20250514"),
        payload={"pa_form": {"form_id": "PA-TEST001"}},
    )
    _agent_tasks["task-002"] = AgentTask(
        task_id="task-002",
        agent_type=AgentType.DENIAL_MANAGEMENT,
        tenant_id="dev-tenant-001",
        status=AgentTaskStatus.PENDING,
        title="Review appeal for CLM-2024-003",
        description="Confidence: 0.65",
        resource_type="AppealLetter",
        confidence=ConfidenceScore(score=0.65),
        payload={"appeal_letter": "Test letter"},
    )
    yield
    _agent_tasks.clear()


def test_list_approvals():
    response = client.get("/api/v1/approvals", headers=_AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["approvals"]) == 2


def test_list_approvals_by_agent_type():
    response = client.get("/api/v1/approvals?agent_type=prior_auth", headers=_AUTH)
    data = response.json()
    assert data["total"] == 1
    assert data["approvals"][0]["agent_type"] == "prior_auth"


def test_get_approval_detail():
    response = client.get("/api/v1/approvals/task-001", headers=_AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == "task-001"
    assert data["confidence"]["score"] == 0.87
    assert "pa_form" in data["payload"]


def test_get_approval_not_found():
    response = client.get("/api/v1/approvals/task-999", headers=_AUTH)
    data = response.json()
    assert "error" in data


def test_approve_task():
    response = client.post(
        "/api/v1/approvals/task-001/approve",
        json={"notes": "Looks good, approved."},
        headers=_AUTH,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"


def test_reject_task():
    response = client.post(
        "/api/v1/approvals/task-002/reject",
        json={"notes": "Missing supporting documentation."},
        headers=_AUTH,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"
    assert data["notes"] == "Missing supporting documentation."


def test_approval_stats():
    response = client.get("/api/v1/approvals/stats", headers=_AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["total_tasks"] == 2
    assert data["pending_count"] == 2
    assert data["avg_confidence"] > 0
