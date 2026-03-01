"""Tests for the Denial Management LangGraph agent."""

import pytest

from medos.agents.denial_mgmt.graph import build_denial_mgmt_graph, run_denial_management
from medos.agents.denial_mgmt.nodes import analyze_denial, assess_appeal_viability
from medos.mcp.servers.fhir_server import _seed_demo_patients


@pytest.fixture(autouse=True)
def _setup():
    _seed_demo_patients()


# ---------------------------------------------------------------------------
# Node tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analyze_denial_valid():
    state = {
        "claim_id": "CLM-2024-003",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await analyze_denial(state)
    assert result["status"] == "denial_analyzed"
    assert result["denial_code"] == "CO-4"
    assert result["root_cause"] == "coding_error"


@pytest.mark.asyncio
async def test_analyze_denial_not_denied():
    state = {
        "claim_id": "CLM-2024-001",  # paid claim
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await analyze_denial(state)
    assert result["status"] == "error"


@pytest.mark.asyncio
async def test_assess_viability_viable():
    state = {
        "denial_info": {"appeal_success_rate": 0.72},
        "root_cause": "coding_error",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await assess_appeal_viability(state)
    assert result["appeal_viable"] is True
    assert result["appeal_probability"] > 0


@pytest.mark.asyncio
async def test_assess_viability_not_viable():
    state = {
        "denial_info": {"appeal_success_rate": 0.05},
        "root_cause": "patient_responsibility",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await assess_appeal_viability(state)
    assert result["appeal_viable"] is False


# ---------------------------------------------------------------------------
# Graph tests
# ---------------------------------------------------------------------------


def test_build_graph():
    graph = build_denial_mgmt_graph()
    assert graph is not None


@pytest.mark.asyncio
async def test_run_denial_viable_appeal():
    """Test full pipeline for a denial where appeal is viable."""
    result = await run_denial_management(claim_id="CLM-2024-003")
    assert result["status"] == "submitted_for_approval"
    assert "appeal_letter" in result
    assert len(result["appeal_letter"]) > 100


@pytest.mark.asyncio
async def test_run_denial_not_found():
    """Test pipeline with unknown claim."""
    result = await run_denial_management(claim_id="CLM-FAKE")
    assert result["status"] == "error"


@pytest.mark.asyncio
async def test_run_denial_co16():
    """Test denial with CO-16 (missing info) - high success rate."""
    result = await run_denial_management(claim_id="CLM-2024-004")
    assert result["status"] == "submitted_for_approval"
    assert result.get("appeal_probability", 0) > 0.5
