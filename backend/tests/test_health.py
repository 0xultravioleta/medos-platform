"""Tests for health endpoint."""

from fastapi.testclient import TestClient

from medos.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "medos-platform"
    assert "version" in data
    assert "timestamp" in data


def test_fhir_metadata():
    response = client.get("/fhir/r4/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "CapabilityStatement"
    assert data["fhirVersion"] == "4.0.1"
