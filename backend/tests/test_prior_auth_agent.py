"""Tests for the Prior Authorization LangGraph agent."""

import pytest

from medos.agents.prior_auth.graph import build_prior_auth_graph, run_prior_auth
from medos.agents.prior_auth.nodes import check_pa_requirement, done_no_pa
from medos.mcp.servers.fhir_server import _seed_demo_patients


@pytest.fixture(autouse=True)
def _setup():
    _seed_demo_patients()


# ---------------------------------------------------------------------------
# Node tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_check_pa_requirement_required():
    state = {
        "patient_id": "p-001",
        "procedure_code": "73721",  # MRI - requires PA
        "payer": "Aetna",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await check_pa_requirement(state)
    assert result["pa_required"] is True
    assert result["status"] == "pa_check_complete"


@pytest.mark.asyncio
async def test_check_pa_requirement_not_required():
    state = {
        "patient_id": "p-001",
        "procedure_code": "99214",  # Office visit - no PA
        "payer": "Aetna",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await check_pa_requirement(state)
    assert result["pa_required"] is False


@pytest.mark.asyncio
async def test_done_no_pa():
    state = {
        "patient_id": "p-001",
        "procedure_code": "99214",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await done_no_pa(state)
    assert result["status"] == "completed_no_pa"


# ---------------------------------------------------------------------------
# Graph tests
# ---------------------------------------------------------------------------


def test_build_graph():
    graph = build_prior_auth_graph()
    assert graph is not None


@pytest.mark.asyncio
async def test_run_prior_auth_no_pa():
    """Test full pipeline for procedure that doesn't need PA."""
    result = await run_prior_auth(
        patient_id="p-001",
        procedure_code="99214",
        diagnosis_codes=["M23.21"],
        payer="Aetna",
    )
    assert result["status"] == "completed_no_pa"


@pytest.mark.asyncio
async def test_run_prior_auth_with_pa():
    """Test full pipeline for procedure that needs PA."""
    result = await run_prior_auth(
        patient_id="p-001",
        procedure_code="73721",
        diagnosis_codes=["M23.21"],
        payer="Aetna",
    )
    assert result["status"] == "submitted_for_approval"
    assert "pa_form" in result
    assert result["pa_form"]["form_id"].startswith("PA-")


@pytest.mark.asyncio
async def test_run_prior_auth_unknown_patient():
    """Test pipeline with unknown patient."""
    result = await run_prior_auth(
        patient_id="unknown",
        procedure_code="73721",
        payer="",
    )
    assert result["status"] == "error"
