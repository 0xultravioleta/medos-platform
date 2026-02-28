"""Tests for FHIR Patient resource."""

from fastapi.testclient import TestClient

from medos.main import app

client = TestClient(app)


SAMPLE_PATIENT = {
    "resourceType": "Patient",
    "name": [{"family": "Garcia", "given": ["Maria", "Elena"]}],
    "birthDate": "1985-03-15",
    "gender": "female",
    "identifier": [{"system": "http://hospital.example/mrn", "value": "MRN-12345"}],
    "telecom": [{"system": "phone", "value": "305-555-0123"}],
    "address": [{"city": "Miami", "state": "FL", "postalCode": "33101"}],
}


def test_create_patient():
    response = client.post("/fhir/r4/Patient", json=SAMPLE_PATIENT)
    assert response.status_code == 201
    data = response.json()
    assert data["resourceType"] == "Patient"
    assert "id" in data
    assert data["meta"]["versionId"] == "1"
    assert data["name"][0]["family"] == "Garcia"


def test_read_patient():
    # Create first
    create_resp = client.post("/fhir/r4/Patient", json=SAMPLE_PATIENT)
    patient_id = create_resp.json()["id"]

    # Read
    response = client.get(f"/fhir/r4/Patient/{patient_id}")
    assert response.status_code == 200
    assert response.json()["id"] == patient_id


def test_read_patient_not_found():
    response = client.get("/fhir/r4/Patient/nonexistent-id")
    assert response.status_code == 404
    data = response.json()["detail"]
    assert data["resourceType"] == "OperationOutcome"


def test_search_by_name():
    # Create patient
    client.post("/fhir/r4/Patient", json=SAMPLE_PATIENT)

    # Search
    response = client.get("/fhir/r4/Patient", params={"name": "Garcia"})
    assert response.status_code == 200
    bundle = response.json()
    assert bundle["resourceType"] == "Bundle"
    assert bundle["total"] >= 1


def test_search_by_birthdate():
    client.post("/fhir/r4/Patient", json=SAMPLE_PATIENT)

    response = client.get("/fhir/r4/Patient", params={"birthdate": "1985-03-15"})
    assert response.status_code == 200
    assert response.json()["total"] >= 1


def test_search_by_identifier():
    client.post("/fhir/r4/Patient", json=SAMPLE_PATIENT)

    response = client.get("/fhir/r4/Patient", params={"identifier": "MRN-12345"})
    assert response.status_code == 200
    assert response.json()["total"] >= 1
