"""Tests for the Tenant Onboarding API endpoints."""

from fastapi.testclient import TestClient

from medos.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_VALID_PAYLOAD = {
    "organization_name": "Sunshine Ortho Group",
    "organization_type": "group_practice",
    "specialty": "orthopedics",
    "admin_email": "admin@sunshine-ortho.com",
    "admin_name": "Dr. Maria Lopez",
    "state": "FL",
    "city": "Miami",
    "locations": [
        {"name": "Main Office", "address": "100 Brickell Ave", "phone": "305-555-0100"},
        {"name": "Doral Clinic", "address": "200 NW 87th Ave", "phone": "305-555-0200"},
    ],
    "providers": [
        {"name": "Dr. Maria Lopez", "npi": "1234567890", "specialty": "orthopedics"},
        {"name": "Dr. James Chen", "npi": "0987654321", "specialty": "orthopedics"},
        {"name": "PA Sarah Kim", "npi": "1122334455", "specialty": "orthopedics"},
    ],
    "payers": ["BCBS", "Aetna", "Medicare", "UnitedHealthcare"],
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_setup_creates_tenant():
    response = client.post("/api/v1/onboarding/setup", json=_VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"].startswith("tn-")
    assert len(data["tenant_id"]) == 11  # "tn-" + 8 hex chars


def test_setup_returns_all_sections():
    response = client.post("/api/v1/onboarding/setup", json=_VALID_PAYLOAD)
    data = response.json()
    assert "tenant_id" in data
    assert "organization" in data
    assert "admin_user" in data
    assert "setup_status" in data
    assert "next_steps" in data


def test_setup_missing_required_field():
    incomplete = {"organization_name": "Test Practice"}
    response = client.post("/api/v1/onboarding/setup", json=incomplete)
    assert response.status_code == 422


def test_specialties_endpoint():
    response = client.get("/api/v1/onboarding/specialties")
    assert response.status_code == 200
    data = response.json()
    assert "specialties" in data
    codes = [s["code"] for s in data["specialties"]]
    assert "orthopedics" in codes
    assert "dermatology" in codes


def test_payers_endpoint():
    response = client.get("/api/v1/onboarding/payers")
    assert response.status_code == 200
    data = response.json()
    assert "payers" in data
    codes = [p["code"] for p in data["payers"]]
    assert "BCBS" in codes
    assert "Medicare" in codes


def test_setup_with_locations():
    response = client.post("/api/v1/onboarding/setup", json=_VALID_PAYLOAD)
    data = response.json()
    assert data["setup_status"]["locations"] == "2 configured"


def test_setup_with_providers():
    response = client.post("/api/v1/onboarding/setup", json=_VALID_PAYLOAD)
    data = response.json()
    assert data["setup_status"]["providers"] == "3 configured"


def test_setup_response_has_next_steps():
    response = client.post("/api/v1/onboarding/setup", json=_VALID_PAYLOAD)
    data = response.json()
    assert len(data["next_steps"]) == 3
    assert "Import patient demographics" in data["next_steps"]


def test_setup_organization_details():
    response = client.post("/api/v1/onboarding/setup", json=_VALID_PAYLOAD)
    data = response.json()
    org = data["organization"]
    assert org["name"] == "Sunshine Ortho Group"
    assert org["type"] == "group_practice"
    assert org["specialty"] == "orthopedics"
    assert org["state"] == "FL"


def test_setup_admin_user_details():
    response = client.post("/api/v1/onboarding/setup", json=_VALID_PAYLOAD)
    data = response.json()
    admin = data["admin_user"]
    assert admin["email"] == "admin@sunshine-ortho.com"
    assert admin["name"] == "Dr. Maria Lopez"
    assert admin["role"] == "admin"


def test_setup_without_optional_lists():
    minimal = {
        "organization_name": "Solo Doc",
        "organization_type": "solo_practice",
        "specialty": "general",
        "admin_email": "doc@solo.com",
        "admin_name": "Dr. Solo",
        "state": "CA",
        "city": "Los Angeles",
    }
    response = client.post("/api/v1/onboarding/setup", json=minimal)
    assert response.status_code == 200
    data = response.json()
    assert data["setup_status"]["locations"] == "none"
    assert data["setup_status"]["providers"] == "none"
    assert data["setup_status"]["payers"] == "none"
