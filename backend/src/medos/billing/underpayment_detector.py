"""Underpayment Detector -- compare claim payments against contracted rates.

Scans paid claims and identifies underpayments by comparing actual paid
amounts against payer-contracted rates per CPT code. Flags variances by
severity (critical >20%, moderate >10%, minor otherwise).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class ContractedRate:
    """A payer-specific contracted rate for a CPT code."""

    payer_id: str
    cpt_code: str
    contracted_rate: float
    effective_date: date
    expiration_date: date


@dataclass
class UnderpaymentFinding:
    """A single underpayment finding for a claim/CPT combination."""

    claim_id: str
    cpt_code: str
    expected_amount: float
    actual_paid: float
    variance: float
    variance_pct: float
    payer: str
    severity: str  # "critical", "moderate", "minor"


# ---------------------------------------------------------------------------
# Mock contracted rates database
# ---------------------------------------------------------------------------

_CONTRACTED_RATES: dict[tuple[str, str], float] = {
    ("BCBS", "99213"): 125.00,
    ("BCBS", "99214"): 185.00,
    ("BCBS", "99215"): 250.00,
    ("AETNA", "99213"): 118.00,
    ("AETNA", "99214"): 175.00,
    ("MEDICARE", "99213"): 108.50,
    ("MEDICARE", "99214"): 161.75,
    ("HUMANA", "99213"): 115.00,
    ("HUMANA", "99214"): 172.00,
    ("CIGNA", "99213"): 122.00,
    ("CIGNA", "99214"): 180.00,
}


# ---------------------------------------------------------------------------
# Helper: normalize payer name to lookup key
# ---------------------------------------------------------------------------

_PAYER_ALIASES: dict[str, str] = {
    "aetna": "AETNA",
    "bluecross blueshield": "BCBS",
    "bluecross": "BCBS",
    "bcbs": "BCBS",
    "medicare": "MEDICARE",
    "humana": "HUMANA",
    "cigna": "CIGNA",
}


def _normalize_payer(payer_id: str) -> str:
    """Map common payer names/variants to the canonical key."""
    key = payer_id.strip().lower()
    if key in _PAYER_ALIASES:
        return _PAYER_ALIASES[key]
    return payer_id.strip().upper()


# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------

def get_contracted_rate(payer_id: str, cpt_code: str) -> float | None:
    """Look up the contracted rate for a payer/CPT combination.

    Returns None if no contracted rate is on file.
    """
    normalized = _normalize_payer(payer_id)
    return _CONTRACTED_RATES.get((normalized, cpt_code))


def _classify_severity(variance_pct: float) -> str:
    """Return severity label based on variance percentage."""
    if variance_pct > 20.0:
        return "critical"
    if variance_pct > 10.0:
        return "moderate"
    return "minor"


def detect_underpayment(
    claim_id: str,
    payer_id: str,
    cpt_code: str,
    paid_amount: float,
) -> UnderpaymentFinding | None:
    """Compare a single claim payment against the contracted rate.

    Returns an UnderpaymentFinding if the paid amount is below the
    contracted rate, or None if payment meets or exceeds the rate
    (or if no contracted rate exists).
    """
    expected = get_contracted_rate(payer_id, cpt_code)
    if expected is None:
        return None

    if paid_amount >= expected:
        return None

    variance = round(expected - paid_amount, 2)
    variance_pct = round((variance / expected) * 100, 2)
    severity = _classify_severity(variance_pct)

    return UnderpaymentFinding(
        claim_id=claim_id,
        cpt_code=cpt_code,
        expected_amount=expected,
        actual_paid=paid_amount,
        variance=variance,
        variance_pct=variance_pct,
        payer=_normalize_payer(payer_id),
        severity=severity,
    )


def scan_claims_for_underpayments(
    claims: list[dict],
) -> list[UnderpaymentFinding]:
    """Batch-scan a list of claim dicts for underpayments.

    Each claim dict is expected to have:
        - claim_id (str)
        - payer (str)
        - cpt_codes (list[str])
        - paid_amount (float | None)
        - status (str) -- only "paid" claims are checked
    """
    findings: list[UnderpaymentFinding] = []

    for claim in claims:
        status = claim.get("status", "")
        if status != "paid":
            continue

        paid = claim.get("paid_amount")
        if paid is None or paid <= 0:
            continue

        claim_id = claim.get("claim_id", "")
        payer = claim.get("payer", "")
        cpt_codes = claim.get("cpt_codes", [])

        # For claims with multiple CPT codes, distribute paid proportionally
        # (simplified: check each code against the full paid amount only when
        # there's a single code; for multiple codes, skip -- real impl would
        # use service-line detail from the 835).
        if len(cpt_codes) == 1:
            finding = detect_underpayment(claim_id, payer, cpt_codes[0], paid)
            if finding:
                findings.append(finding)
        else:
            # Multi-code claims: check each CPT against per-line average
            per_line = paid / len(cpt_codes) if cpt_codes else 0
            for code in cpt_codes:
                finding = detect_underpayment(claim_id, payer, code, per_line)
                if finding:
                    findings.append(finding)

    return findings


def get_underpayment_summary(
    findings: list[UnderpaymentFinding],
) -> dict:
    """Aggregate underpayment findings into summary statistics.

    Returns:
        dict with total_variance, count_by_severity, top_payers,
        finding_count, and avg_variance_pct.
    """
    if not findings:
        return {
            "finding_count": 0,
            "total_variance": 0.0,
            "avg_variance_pct": 0.0,
            "count_by_severity": {"critical": 0, "moderate": 0, "minor": 0},
            "top_payers": [],
        }

    total_variance = round(sum(f.variance for f in findings), 2)
    avg_variance_pct = round(sum(f.variance_pct for f in findings) / len(findings), 2)

    count_by_severity: dict[str, int] = {"critical": 0, "moderate": 0, "minor": 0}
    for f in findings:
        count_by_severity[f.severity] = count_by_severity.get(f.severity, 0) + 1

    payer_totals: dict[str, float] = {}
    for f in findings:
        payer_totals[f.payer] = payer_totals.get(f.payer, 0) + f.variance
    top_payers = sorted(
        [{"payer": k, "total_variance": round(v, 2)} for k, v in payer_totals.items()],
        key=lambda x: -x["total_variance"],
    )

    return {
        "finding_count": len(findings),
        "total_variance": total_variance,
        "avg_variance_pct": avg_variance_pct,
        "count_by_severity": count_by_severity,
        "top_payers": top_payers,
    }
