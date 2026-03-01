"""Tests for FHIR ClaimResponse and ExplanationOfBenefit MCP tools."""

import pytest

from medos.mcp.servers.fhir_server import (
    _fhir_store,
    _seed_demo_patients,
    fhir_create_claim_response,
    fhir_create_eob,
    fhir_search_eob,
)


@pytest.fixture(autouse=True)
def _setup():
    """Ensure demo data is seeded and stores are clean for each test."""
    _fhir_store.clear()
    _seed_demo_patients()


# ---------------------------------------------------------------------------
# fhir_create_claim_response
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_claim_response_basic():
    """Basic ClaimResponse creation with required fields."""
    result = await fhir_create_claim_response(
        claim_id="clm-100",
        outcome="complete",
        disposition="Claim processed",
        payer="Aetna",
        total_paid=200.0,
    )
    assert result["resourceType"] == "ClaimResponse"
    assert result["outcome"] == "complete"
    assert result["disposition"] == "Claim processed"
    assert result["payment"]["amount"]["value"] == 200.0
    assert result["payment"]["amount"]["currency"] == "USD"
    assert result["insurer"]["display"] == "Aetna"
    assert result["request"]["reference"] == "Claim/clm-100"
    assert result["status"] == "active"
    assert result["use"] == "claim"
    assert result["meta"]["versionId"] == "1"


@pytest.mark.asyncio
async def test_create_claim_response_with_adjudication():
    """ClaimResponse with adjudication details."""
    adj = {"eligible": 300.0, "copay": 50.0, "deductible": 25.0}
    result = await fhir_create_claim_response(
        claim_id="clm-200",
        outcome="partial",
        disposition="Partial payment",
        payer="BCBS",
        total_paid=225.0,
        adjudication_details=adj,
    )
    assert result["resourceType"] == "ClaimResponse"
    assert "adjudication" in result
    assert len(result["adjudication"]) == 3
    codes = [a["category"]["coding"][0]["code"] for a in result["adjudication"]]
    assert "eligible" in codes
    assert "copay" in codes
    assert "deductible" in codes


@pytest.mark.asyncio
async def test_create_claim_response_missing_claim_id():
    """ClaimResponse without claim_id returns error."""
    result = await fhir_create_claim_response(
        claim_id="",
        outcome="complete",
        disposition="Test",
        payer="Aetna",
        total_paid=100.0,
    )
    assert "error" in result


@pytest.mark.asyncio
async def test_claim_response_stored_in_fhir_store():
    """Created ClaimResponse is stored in the in-memory FHIR store."""
    result = await fhir_create_claim_response(
        claim_id="clm-300",
        outcome="complete",
        disposition="Stored check",
        payer="UHC",
        total_paid=150.0,
    )
    resource_id = result["id"]
    store = _fhir_store.get("ClaimResponse", {})
    assert resource_id in store
    assert store[resource_id]["outcome"] == "complete"


# ---------------------------------------------------------------------------
# fhir_create_eob
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_eob_basic():
    """Basic EOB creation with required fields."""
    result = await fhir_create_eob(
        claim_id="clm-400",
        patient_id="p-007",
        payer="Aetna",
        outcome="complete",
        total_billed=500.0,
        total_paid=400.0,
        patient_responsibility=100.0,
    )
    assert result["resourceType"] == "ExplanationOfBenefit"
    assert result["status"] == "active"
    assert result["use"] == "claim"
    assert result["patient"]["reference"] == "Patient/p-007"
    assert result["claim"]["reference"] == "Claim/clm-400"
    assert result["outcome"] == "complete"
    assert result["meta"]["versionId"] == "1"


@pytest.mark.asyncio
async def test_create_eob_with_service_items():
    """EOB with service line items."""
    items = [
        {"code": "99214", "display": "Office visit", "billed": 250.0, "paid": 200.0},
        {"code": "85025", "display": "CBC panel", "billed": 100.0, "paid": 80.0},
    ]
    result = await fhir_create_eob(
        claim_id="clm-500",
        patient_id="p-008",
        payer="BCBS",
        outcome="complete",
        total_billed=350.0,
        total_paid=280.0,
        patient_responsibility=70.0,
        service_items=items,
    )
    assert "item" in result
    assert len(result["item"]) == 2
    assert result["item"][0]["sequence"] == 1
    assert result["item"][0]["productOrService"]["coding"][0]["code"] == "99214"
    assert result["item"][1]["sequence"] == 2


@pytest.mark.asyncio
async def test_create_eob_missing_claim_id():
    """EOB without claim_id returns error."""
    result = await fhir_create_eob(
        claim_id="",
        patient_id="p-007",
        payer="Aetna",
        outcome="complete",
        total_billed=100.0,
        total_paid=80.0,
        patient_responsibility=20.0,
    )
    assert "error" in result


@pytest.mark.asyncio
async def test_create_eob_missing_patient_id():
    """EOB without patient_id returns error."""
    result = await fhir_create_eob(
        claim_id="clm-600",
        patient_id="",
        payer="Aetna",
        outcome="complete",
        total_billed=100.0,
        total_paid=80.0,
        patient_responsibility=20.0,
    )
    assert "error" in result


@pytest.mark.asyncio
async def test_eob_has_correct_totals():
    """EOB total array has submitted, benefit, and copay amounts."""
    result = await fhir_create_eob(
        claim_id="clm-700",
        patient_id="p-007",
        payer="UHC",
        outcome="complete",
        total_billed=600.0,
        total_paid=480.0,
        patient_responsibility=120.0,
    )
    assert len(result["total"]) == 3
    totals_by_code = {
        t["category"]["coding"][0]["code"]: t["amount"]["value"]
        for t in result["total"]
    }
    assert totals_by_code["submitted"] == 600.0
    assert totals_by_code["benefit"] == 480.0
    assert totals_by_code["copay"] == 120.0


@pytest.mark.asyncio
async def test_eob_references_correct_claim():
    """EOB claim reference points to the correct Claim resource."""
    result = await fhir_create_eob(
        claim_id="clm-800",
        patient_id="p-008",
        payer="Cigna",
        outcome="partial",
        total_billed=400.0,
        total_paid=250.0,
        patient_responsibility=150.0,
    )
    assert result["claim"]["reference"] == "Claim/clm-800"
    assert result["patient"]["reference"] == "Patient/p-008"
    assert result["outcome"] == "partial"


# ---------------------------------------------------------------------------
# fhir_search_eob
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_eob_by_patient():
    """Search EOBs filtered by patient_id."""
    result = await fhir_search_eob(patient_id="p-007")
    assert result["resourceType"] == "Bundle"
    assert result["type"] == "searchset"
    # Demo data has 2 EOBs for p-007 (eob-001, eob-003)
    assert result["total"] == 2
    for entry in result["entry"]:
        assert entry["resource"]["patient"]["reference"] == "Patient/p-007"


@pytest.mark.asyncio
async def test_search_eob_by_outcome():
    """Search EOBs filtered by outcome."""
    result = await fhir_search_eob(outcome="partial")
    assert result["resourceType"] == "Bundle"
    # Demo data has 1 partial EOB (eob-002)
    assert result["total"] == 1
    assert result["entry"][0]["resource"]["outcome"] == "partial"


@pytest.mark.asyncio
async def test_search_eob_empty_results():
    """Search with no matching EOBs returns empty Bundle."""
    result = await fhir_search_eob(patient_id="nonexistent-patient")
    assert result["resourceType"] == "Bundle"
    assert result["total"] == 0
    assert result["entry"] == []


@pytest.mark.asyncio
async def test_search_eob_all():
    """Search with no filters returns all seeded EOBs."""
    result = await fhir_search_eob()
    assert result["resourceType"] == "Bundle"
    # Demo data has 3 EOBs
    assert result["total"] == 3
