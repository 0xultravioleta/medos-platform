"""Tests for the Agent Runner API endpoint."""

from fastapi.testclient import TestClient

from medos.main import app
from medos.middleware.auth import create_dev_token

client = TestClient(app)

_TOKEN = create_dev_token(
    user_id="test-runner",
    tenant_id="dev-tenant-001",
    email="runner@medos.test",
    roles=["admin"],
)
_AUTH = {"Authorization": f"Bearer {_TOKEN}"}


def test_run_prior_auth_agent():
    """Test running the prior auth agent."""
    response = client.post(
        "/api/v1/agents/run",
        json={
            "agent_type": "prior_auth",
            "params": {
                "patient_id": "p-001",
                "procedure_code": "29881",
                "diagnosis_codes": ["M23.21"],
                "payer": "Aetna",
            },
        },
        headers=_AUTH,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["agent_type"] == "prior_auth"
    assert "status" in data
    assert "result" in data


def test_run_prior_auth_missing_params():
    """Test prior auth agent with missing required params."""
    response = client.post(
        "/api/v1/agents/run",
        json={
            "agent_type": "prior_auth",
            "params": {"payer": "Aetna"},
        },
        headers=_AUTH,
    )
    assert response.status_code == 400


def test_run_denial_management_agent():
    """Test running the denial management agent."""
    response = client.post(
        "/api/v1/agents/run",
        json={
            "agent_type": "denial_management",
            "params": {"claim_id": "CLM-2024-003"},
        },
        headers=_AUTH,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["agent_type"] == "denial_management"
    assert "status" in data


def test_run_denial_management_missing_claim_id():
    """Test denial management with missing claim_id."""
    response = client.post(
        "/api/v1/agents/run",
        json={
            "agent_type": "denial_management",
            "params": {},
        },
        headers=_AUTH,
    )
    assert response.status_code == 400


def test_run_unknown_agent():
    """Test running an unknown agent type."""
    response = client.post(
        "/api/v1/agents/run",
        json={
            "agent_type": "unknown_agent",
            "params": {},
        },
        headers=_AUTH,
    )
    assert response.status_code == 400
    assert "unknown_agent" in response.json()["detail"].lower()


def test_run_agent_requires_auth():
    """Test that the endpoint requires authentication."""
    response = client.post(
        "/api/v1/agents/run",
        json={
            "agent_type": "prior_auth",
            "params": {"patient_id": "p-001", "procedure_code": "29881"},
        },
    )
    assert response.status_code in (401, 403)
