"""Tests for the Patient Intake Workflow endpoint."""

from fastapi.testclient import TestClient

from medos.main import app
from medos.middleware.auth import create_dev_token

client = TestClient(app)

_TOKEN = create_dev_token(
    user_id="test-workflow",
    tenant_id="dev-tenant-001",
    email="workflow@medos.test",
    roles=["admin"],
)
_AUTH = {"Authorization": f"Bearer {_TOKEN}"}


def test_patient_intake_success():
    """Test full patient intake workflow with known patient."""
    response = client.post(
        "/api/v1/workflows/patient-intake",
        json={
            "patient_id": "p-001",
            "provider_id": "prov-001",
            "visit_type": "follow_up",
            "reason": "Knee pain follow-up",
        },
        headers=_AUTH,
    )
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "completed"
    assert data["patient_id"] == "p-001"
    assert len(data["steps"]) == 3

    # Step 1: eligibility
    assert data["steps"][0]["step"] == "eligibility"
    assert data["steps"][0]["status"] == "completed"
    assert data["eligibility_status"] == "active"

    # Step 2: scheduling
    assert data["steps"][1]["step"] == "scheduling"
    assert data["steps"][1]["status"] == "completed"
    assert "appointment_id" in data

    # Step 3: encounter stub
    assert data["steps"][2]["step"] == "encounter_stub"
    assert data["steps"][2]["status"] == "completed"
    assert "encounter_id" in data


def test_patient_intake_unknown_eligibility():
    """Test intake with patient that has no eligibility data."""
    response = client.post(
        "/api/v1/workflows/patient-intake",
        json={
            "patient_id": "p-999",
            "provider_id": "prov-001",
        },
        headers=_AUTH,
    )
    assert response.status_code == 200
    data = response.json()

    # Eligibility step should be skipped
    assert data["steps"][0]["step"] == "eligibility"
    assert data["steps"][0]["status"] == "skipped"

    # Workflow should still complete (scheduling + encounter)
    assert data["status"] == "completed"


def test_patient_intake_requires_auth():
    """Test that intake workflow requires authentication."""
    response = client.post(
        "/api/v1/workflows/patient-intake",
        json={"patient_id": "p-001"},
    )
    assert response.status_code in (401, 403)


def test_patient_intake_default_provider():
    """Test intake with default provider."""
    response = client.post(
        "/api/v1/workflows/patient-intake",
        json={"patient_id": "p-002"},
        headers=_AUTH,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    # Default provider is prov-001
    assert "Dr. Sarah Williams" in data["steps"][1].get("provider_name", "")
