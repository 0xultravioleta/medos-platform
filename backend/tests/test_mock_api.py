"""Tests for mock API endpoints."""

from fastapi.testclient import TestClient

from medos.main import app

client = TestClient(app)

BASE = "/api/v1"


def test_list_patients_returns_200():
    response = client.get(f"{BASE}/patients")
    assert response.status_code == 200


def test_list_patients_returns_six():
    response = client.get(f"{BASE}/patients")
    data = response.json()
    assert len(data) == 6


def test_list_patients_shape():
    response = client.get(f"{BASE}/patients")
    patient = response.json()[0]
    expected_keys = {
        "id",
        "name",
        "firstName",
        "lastName",
        "birthDate",
        "gender",
        "mrn",
        "phone",
        "email",
        "address",
        "insurance",
        "lastVisit",
        "nextAppointment",
        "conditions",
        "riskScore",
        "status",
    }
    assert expected_keys == set(patient.keys())


def test_get_patient_by_id():
    response = client.get(f"{BASE}/patients/p-001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "p-001"
    assert data["name"] == "Maria Garcia"


def test_get_patient_not_found():
    response = client.get(f"{BASE}/patients/nonexistent")
    assert response.status_code == 404


def test_appointments_today_returns_200():
    response = client.get(f"{BASE}/appointments/today")
    assert response.status_code == 200


def test_appointments_today_shape():
    response = client.get(f"{BASE}/appointments/today")
    apt = response.json()[0]
    expected_keys = {
        "id",
        "patientName",
        "patientId",
        "time",
        "type",
        "status",
        "provider",
    }
    assert expected_keys == set(apt.keys())


def test_dashboard_stats_returns_200():
    response = client.get(f"{BASE}/dashboard/stats")
    assert response.status_code == 200


def test_dashboard_stats_shape():
    response = client.get(f"{BASE}/dashboard/stats")
    data = response.json()
    expected_keys = {
        "totalPatients",
        "appointmentsToday",
        "pendingClaims",
        "pendingPriorAuths",
        "revenueThisMonth",
        "claimDenialRate",
        "avgWaitTime",
        "aiNotesGenerated",
    }
    assert expected_keys == set(data.keys())


def test_dashboard_activity_returns_200():
    response = client.get(f"{BASE}/dashboard/activity")
    assert response.status_code == 200


def test_dashboard_activity_shape():
    response = client.get(f"{BASE}/dashboard/activity")
    item = response.json()[0]
    expected_keys = {"id", "action", "detail", "time", "type"}
    assert expected_keys == set(item.keys())


def test_claims_returns_200():
    response = client.get(f"{BASE}/claims")
    assert response.status_code == 200


def test_claims_shape():
    response = client.get(f"{BASE}/claims")
    claim = response.json()[0]
    expected_keys = {
        "id",
        "patient",
        "cpt",
        "icd10",
        "amount",
        "payer",
        "status",
        "date",
    }
    assert expected_keys == set(claim.keys())


def test_notes_returns_200():
    response = client.get(f"{BASE}/notes")
    assert response.status_code == 200


def test_notes_shape():
    response = client.get(f"{BASE}/notes")
    note = response.json()[0]
    expected_keys = {
        "id",
        "patient",
        "type",
        "date",
        "confidence",
        "status",
        "preview",
    }
    assert expected_keys == set(note.keys())


def test_notes_confidence_is_float():
    response = client.get(f"{BASE}/notes")
    note = response.json()[0]
    assert isinstance(note["confidence"], float)
