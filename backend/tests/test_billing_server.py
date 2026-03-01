"""Tests for Billing/Claims MCP Server tools."""

import pytest

from medos.mcp.servers.billing_server import (
    billing_check_eligibility,
    billing_claim_status,
    billing_denial_lookup,
    billing_parse_remittance,
    billing_patient_balance,
    billing_payer_rules,
    billing_submit_appeal,
    billing_submit_claim,
)


# ---------------------------------------------------------------------------
# billing_check_eligibility
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_eligibility_active_patient():
    result = await billing_check_eligibility(patient_id="p-001")
    assert result["status"] == "active"
    assert result["payer"] == "Aetna"
    assert "copay" in result
    assert "deductible" in result


@pytest.mark.asyncio
async def test_eligibility_inactive_patient():
    result = await billing_check_eligibility(patient_id="p-004")
    assert result["status"] == "inactive"


@pytest.mark.asyncio
async def test_eligibility_unknown_patient():
    result = await billing_check_eligibility(patient_id="unknown")
    assert "error" in result


# ---------------------------------------------------------------------------
# billing_submit_claim
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_claim():
    result = await billing_submit_claim(
        patient_id="p-001",
        cpt_codes=["99214"],
        icd10_codes=["M23.21"],
        billed_amount=250.0,
    )
    assert result["status"] == "pending_approval"
    assert result["requires_approval"] is True
    assert result["claim_id"].startswith("CLM-")


# ---------------------------------------------------------------------------
# billing_claim_status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_claim_status_paid():
    result = await billing_claim_status(claim_id="CLM-2024-001")
    assert result["status"] == "paid"
    assert result["paid_amount"] == 304.00


@pytest.mark.asyncio
async def test_claim_status_denied():
    result = await billing_claim_status(claim_id="CLM-2024-003")
    assert result["status"] == "denied"
    assert "denial_code" in result


@pytest.mark.asyncio
async def test_claim_status_not_found():
    result = await billing_claim_status(claim_id="CLM-FAKE")
    assert "error" in result


# ---------------------------------------------------------------------------
# billing_parse_remittance
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_parse_remittance_paid():
    result = await billing_parse_remittance(claim_id="CLM-2024-001")
    assert result["status"] == "paid"
    assert result["paid_amount"] == 304.00


@pytest.mark.asyncio
async def test_parse_remittance_pending():
    result = await billing_parse_remittance(claim_id="CLM-2024-002")
    assert "error" in result  # No remittance for pending claims


# ---------------------------------------------------------------------------
# billing_denial_lookup
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_denial_lookup_known_code():
    result = await billing_denial_lookup(denial_code="CO-4")
    assert result["code"] == "CO-4"
    assert "common_fix" in result
    assert result["appeal_success_rate"] > 0


@pytest.mark.asyncio
async def test_denial_lookup_unknown_code():
    result = await billing_denial_lookup(denial_code="XX-999")
    assert "error" in result


# ---------------------------------------------------------------------------
# billing_submit_appeal
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_appeal_denied_claim():
    result = await billing_submit_appeal(
        claim_id="CLM-2024-003",
        appeal_reason="Modifier was correct per documentation",
    )
    assert result["status"] == "pending_approval"
    assert result["appeal_id"].startswith("APL-")


@pytest.mark.asyncio
async def test_submit_appeal_non_denied():
    result = await billing_submit_appeal(claim_id="CLM-2024-001")
    assert "error" in result  # Can't appeal paid claims


# ---------------------------------------------------------------------------
# billing_patient_balance
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_patient_balance():
    result = await billing_patient_balance(patient_id="p-001")
    assert result["total_balance"] == 76.00
    assert len(result["payments"]) > 0


@pytest.mark.asyncio
async def test_patient_balance_no_history():
    result = await billing_patient_balance(patient_id="p-006")
    assert result["total_balance"] == 0.00


# ---------------------------------------------------------------------------
# billing_payer_rules
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_payer_rules_aetna():
    result = await billing_payer_rules(payer_name="aetna")
    assert result["name"] == "Aetna"
    assert result["timely_filing_days"] == 365


@pytest.mark.asyncio
async def test_payer_rules_no_name():
    result = await billing_payer_rules()
    assert "available_payers" in result
