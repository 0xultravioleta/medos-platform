"""Tests for the underpayment detector module."""

from __future__ import annotations

import pytest

from medos.billing.underpayment_detector import (
    UnderpaymentFinding,
    detect_underpayment,
    get_contracted_rate,
    get_underpayment_summary,
    scan_claims_for_underpayments,
)


# ---------------------------------------------------------------------------
# get_contracted_rate
# ---------------------------------------------------------------------------


def test_contracted_rate_found():
    """Known payer+CPT returns the expected rate."""
    rate = get_contracted_rate("BCBS", "99213")
    assert rate == 125.00


def test_contracted_rate_found_alias():
    """Payer alias (case-insensitive, common name) resolves correctly."""
    rate = get_contracted_rate("Aetna", "99214")
    assert rate == 175.00


def test_contracted_rate_not_found():
    """Unknown payer+CPT returns None."""
    rate = get_contracted_rate("UNKNOWN_PAYER", "99999")
    assert rate is None


# ---------------------------------------------------------------------------
# detect_underpayment
# ---------------------------------------------------------------------------


def test_underpayment_detected():
    """Paid amount below contracted rate produces a finding."""
    finding = detect_underpayment("CLM-001", "BCBS", "99213", 100.00)
    assert finding is not None
    assert finding.expected_amount == 125.00
    assert finding.actual_paid == 100.00
    assert finding.variance == 25.00
    assert finding.variance_pct == 20.00
    assert finding.payer == "BCBS"


def test_no_underpayment():
    """Paid amount >= contracted rate returns None."""
    finding = detect_underpayment("CLM-001", "BCBS", "99213", 125.00)
    assert finding is None


def test_no_underpayment_overpaid():
    """Paid amount exceeding contracted rate returns None."""
    finding = detect_underpayment("CLM-001", "BCBS", "99213", 150.00)
    assert finding is None


def test_no_contracted_rate():
    """Unknown CPT/payer combo returns None (no finding)."""
    finding = detect_underpayment("CLM-001", "UNKNOWN", "00000", 50.00)
    assert finding is None


# ---------------------------------------------------------------------------
# Severity classification
# ---------------------------------------------------------------------------


def test_severity_critical():
    """>20% variance is classified as critical."""
    # BCBS 99213 = 125.00; paying 95.00 → variance_pct = 24%
    finding = detect_underpayment("CLM-001", "BCBS", "99213", 95.00)
    assert finding is not None
    assert finding.severity == "critical"
    assert finding.variance_pct == 24.0


def test_severity_moderate():
    """10-20% variance is classified as moderate."""
    # BCBS 99214 = 185.00; paying 160.00 → variance = 25, pct ~13.51%
    finding = detect_underpayment("CLM-001", "BCBS", "99214", 160.00)
    assert finding is not None
    assert finding.severity == "moderate"
    assert 10.0 < finding.variance_pct <= 20.0


def test_severity_minor():
    """<= 10% variance is classified as minor."""
    # BCBS 99213 = 125.00; paying 120.00 → variance = 5.00, pct = 4%
    finding = detect_underpayment("CLM-001", "BCBS", "99213", 120.00)
    assert finding is not None
    assert finding.severity == "minor"
    assert finding.variance_pct <= 10.0


# ---------------------------------------------------------------------------
# scan_claims_for_underpayments (batch)
# ---------------------------------------------------------------------------


def test_batch_scan():
    """Batch scan finds underpayments in paid claims and skips non-paid."""
    claims = [
        {
            "claim_id": "CLM-A",
            "payer": "Aetna",
            "cpt_codes": ["99214"],
            "paid_amount": 150.00,
            "status": "paid",
        },
        {
            "claim_id": "CLM-B",
            "payer": "BCBS",
            "cpt_codes": ["99213"],
            "paid_amount": 130.00,  # overpaid → no finding
            "status": "paid",
        },
        {
            "claim_id": "CLM-C",
            "payer": "Aetna",
            "cpt_codes": ["99213"],
            "paid_amount": 0,
            "status": "denied",  # skipped
        },
        {
            "claim_id": "CLM-D",
            "payer": "BCBS",
            "cpt_codes": ["99215"],
            "paid_amount": None,
            "status": "pending",  # skipped
        },
    ]
    findings = scan_claims_for_underpayments(claims)
    assert len(findings) == 1
    assert findings[0].claim_id == "CLM-A"
    assert findings[0].expected_amount == 175.00
    assert findings[0].actual_paid == 150.00


def test_batch_scan_multi_cpt():
    """Batch scan splits payment across multiple CPT codes."""
    claims = [
        {
            "claim_id": "CLM-M",
            "payer": "BCBS",
            "cpt_codes": ["99213", "99214"],
            "paid_amount": 200.00,  # 100 per line; both underpaid
            "status": "paid",
        },
    ]
    findings = scan_claims_for_underpayments(claims)
    # 100 vs 125 (99213) → underpaid, 100 vs 185 (99214) → underpaid
    assert len(findings) == 2


# ---------------------------------------------------------------------------
# get_underpayment_summary
# ---------------------------------------------------------------------------


def test_summary_stats():
    """Summary correctly aggregates findings."""
    findings = [
        UnderpaymentFinding(
            claim_id="CLM-1", cpt_code="99214", expected_amount=185.00,
            actual_paid=150.00, variance=35.00, variance_pct=18.92,
            payer="BCBS", severity="moderate",
        ),
        UnderpaymentFinding(
            claim_id="CLM-2", cpt_code="99213", expected_amount=118.00,
            actual_paid=80.00, variance=38.00, variance_pct=32.20,
            payer="AETNA", severity="critical",
        ),
        UnderpaymentFinding(
            claim_id="CLM-3", cpt_code="99213", expected_amount=125.00,
            actual_paid=120.00, variance=5.00, variance_pct=4.00,
            payer="BCBS", severity="minor",
        ),
    ]
    summary = get_underpayment_summary(findings)

    assert summary["finding_count"] == 3
    assert summary["total_variance"] == 78.00
    assert summary["count_by_severity"]["critical"] == 1
    assert summary["count_by_severity"]["moderate"] == 1
    assert summary["count_by_severity"]["minor"] == 1
    assert len(summary["top_payers"]) == 2
    # BCBS total = 35 + 5 = 40; AETNA total = 38
    assert summary["top_payers"][0]["payer"] == "BCBS"
    assert summary["top_payers"][0]["total_variance"] == 40.00


def test_summary_empty():
    """Empty findings list returns zeroed summary."""
    summary = get_underpayment_summary([])
    assert summary["finding_count"] == 0
    assert summary["total_variance"] == 0.0
    assert summary["count_by_severity"] == {"critical": 0, "moderate": 0, "minor": 0}
    assert summary["top_payers"] == []


# ---------------------------------------------------------------------------
# MCP tool integration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_mcp_tool_returns_findings():
    """billing_detect_underpayments MCP tool returns findings and summary."""
    from medos.mcp.servers.billing_server import billing_detect_underpayments

    result = await billing_detect_underpayments()
    assert "findings" in result
    assert "summary" in result
    assert isinstance(result["findings"], list)
    assert isinstance(result["summary"], dict)
    assert "finding_count" in result["summary"]
