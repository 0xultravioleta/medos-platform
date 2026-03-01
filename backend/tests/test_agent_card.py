"""Tests for A2A Agent Card and agent task router endpoints."""

from fastapi.testclient import TestClient

from medos.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Agent Card
# ---------------------------------------------------------------------------


def test_agent_card_endpoint():
    response = client.get("/.well-known/agent.json")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "MedOS Healthcare OS"
    assert "skills" in data
    assert len(data["skills"]) == 8  # 4 original + 3 Sprint 2 + 1 device-bridge


def test_agent_card_has_fhir_skill():
    response = client.get("/.well-known/agent.json")
    data = response.json()
    fhir_skills = [s for s in data["skills"] if s["id"] == "fhir-resources"]
    assert len(fhir_skills) == 1


def test_agent_card_has_scribe_skill():
    response = client.get("/.well-known/agent.json")
    data = response.json()
    scribe_skills = [s for s in data["skills"] if s["id"] == "clinical-scribe"]
    assert len(scribe_skills) == 1


def test_agent_card_compliance():
    response = client.get("/.well-known/agent.json")
    data = response.json()
    assert data["compliance"]["hipaa"] is True
    assert data["compliance"]["hipaaBaa"] is True
    assert data["compliance"]["auditTrail"] == "fhir-audit-event"


def test_agent_card_mcp_endpoint():
    response = client.get("/.well-known/agent.json")
    data = response.json()
    assert data["mcpEndpoint"] == "/mcp"
    assert data["mcpTransport"] == "streamable-http"


def test_agent_card_authentication():
    response = client.get("/.well-known/agent.json")
    data = response.json()
    assert "Bearer" in data["authentication"]["schemes"]


def test_agent_card_has_sprint2_skills():
    """Verify Sprint 2 skills are included."""
    response = client.get("/.well-known/agent.json")
    data = response.json()
    skill_ids = [s["id"] for s in data["skills"]]
    assert "scheduling" in skill_ids
    assert "prior-auth" in skill_ids
    assert "denial-management" in skill_ids
