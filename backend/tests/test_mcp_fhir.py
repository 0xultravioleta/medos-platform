"""Tests for FHIR MCP Server tools."""

import pytest

from medos.mcp.servers.fhir_server import (
    _seed_demo_patients,
    fhir_batch,
    fhir_create,
    fhir_history,
    fhir_patient_everything,
    fhir_read,
    fhir_search,
    fhir_update,
    fhir_validate,
    register_fhir_tools,
)


@pytest.fixture(autouse=True)
def _setup():
    """Ensure demo patients are seeded for every test."""
    _seed_demo_patients()


# ---------------------------------------------------------------------------
# fhir_read
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_read_existing_patient():
    result = await fhir_read(resource_type="Patient", resource_id="p-001")
    assert result["resourceType"] == "Patient"
    assert result["id"] == "p-001"
    assert result["name"][0]["family"] == "Chen"


@pytest.mark.asyncio
async def test_fhir_read_not_found():
    result = await fhir_read(resource_type="Patient", resource_id="nonexistent")
    assert result["resourceType"] == "OperationOutcome"
    assert result["issue"][0]["code"] == "not-found"


@pytest.mark.asyncio
async def test_fhir_read_missing_id():
    result = await fhir_read(resource_type="Patient")
    assert "error" in result


# ---------------------------------------------------------------------------
# fhir_search
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_search_by_name():
    result = await fhir_search(resource_type="Patient", query={"name": "Chen"})
    assert result["resourceType"] == "Bundle"
    assert result["total"] >= 1
    names = [e["resource"]["name"][0]["family"] for e in result["entry"]]
    assert "Chen" in names


@pytest.mark.asyncio
async def test_fhir_search_by_gender():
    result = await fhir_search(resource_type="Patient", query={"gender": "female"})
    assert result["total"] >= 1
    for entry in result["entry"]:
        assert entry["resource"]["gender"] == "female"


@pytest.mark.asyncio
async def test_fhir_search_all_patients():
    result = await fhir_search(resource_type="Patient", query={})
    assert result["total"] == 8  # 8 demo patients (6 original + 2 Sprint 3)


@pytest.mark.asyncio
async def test_fhir_search_no_results():
    result = await fhir_search(resource_type="Patient", query={"name": "Nonexistent"})
    assert result["total"] == 0
    assert result["entry"] == []


# ---------------------------------------------------------------------------
# fhir_create
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_create_patient():
    result = await fhir_create(
        resource_type="Patient",
        resource={"name": [{"family": "Test", "given": ["User"]}], "gender": "male"},
    )
    assert result["resourceType"] == "Patient"
    assert "id" in result
    assert result["meta"]["versionId"] == "1"
    assert result["name"][0]["family"] == "Test"


# ---------------------------------------------------------------------------
# fhir_update
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_update_patient():
    result = await fhir_update(
        resource_type="Patient",
        resource_id="p-001",
        resource={"name": [{"family": "Chen", "given": ["Robert", "J."]}], "gender": "male"},
    )
    assert result["meta"]["versionId"] == "2"
    assert "J." in result["name"][0]["given"]


@pytest.mark.asyncio
async def test_fhir_update_not_found():
    result = await fhir_update(
        resource_type="Patient",
        resource_id="nonexistent",
        resource={"name": [{"family": "Nobody"}]},
    )
    assert "error" in result


# ---------------------------------------------------------------------------
# fhir_history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_history():
    result = await fhir_history(resource_type="Patient", resource_id="p-002")
    assert result["resourceType"] == "Bundle"
    assert result["type"] == "history"
    assert result["total"] >= 1


# ---------------------------------------------------------------------------
# fhir_validate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_validate_valid():
    result = await fhir_validate(resource={"resourceType": "Patient", "name": [{"family": "Valid"}]})
    assert result["resourceType"] == "OperationOutcome"
    assert result["issue"][0]["severity"] == "information"


@pytest.mark.asyncio
async def test_fhir_validate_missing_type():
    result = await fhir_validate(resource={})
    assert result["issue"][0]["severity"] == "error"


# ---------------------------------------------------------------------------
# fhir_patient_everything
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_patient_everything():
    result = await fhir_patient_everything(patient_id="p-001")
    assert result["resourceType"] == "Bundle"
    assert result["total"] >= 1
    assert result["entry"][0]["resource"]["resourceType"] == "Patient"


@pytest.mark.asyncio
async def test_fhir_patient_everything_not_found():
    result = await fhir_patient_everything(patient_id="nonexistent")
    assert "error" in result


# ---------------------------------------------------------------------------
# fhir_batch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fhir_batch():
    result = await fhir_batch(
        operations=[
            {"method": "GET", "params": {"resource_type": "Patient", "resource_id": "p-001"}},
            {"method": "SEARCH", "params": {"resource_type": "Patient", "query": {"name": "Martinez"}}},
        ]
    )
    assert result["resourceType"] == "Bundle"
    assert result["type"] == "batch-response"
    assert len(result["entry"]) == 2


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def test_register_fhir_tools():
    """Ensure register_fhir_tools seeds demo data."""
    register_fhir_tools()
    # Verify demo data is seeded by reading a patient
    from medos.mcp.servers.fhir_server import _fhir_store

    assert "Patient" in _fhir_store
    assert len(_fhir_store["Patient"]) >= 6
