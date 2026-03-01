"""Claims Scrubbing Rules Engine -- pre-submission claim validation.

Validates claims against demographics, coding, payer, duplicate, and financial
rules to catch preventable denials before submission to payers.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum


class Severity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ScrubFinding:
    rule_id: str
    severity: Severity
    category: str
    description: str
    field: str | None = None
    remediation: str | None = None


@dataclass
class ScrubResult:
    passed: bool
    denial_risk_score: int  # 0-100 (0=clean, 100=certain denial)
    findings: list[ScrubFinding] = field(default_factory=list)
    errors: int = 0
    warnings: int = 0


# ---------------------------------------------------------------------------
# NPI Validation
# ---------------------------------------------------------------------------

def validate_npi(npi: str) -> bool:
    """Validate NPI using Luhn algorithm with healthcare prefix 80840."""
    if len(npi) != 10 or not npi.isdigit():
        return False
    full = "80840" + npi
    total = 0
    for i, ch in enumerate(reversed(full)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


# ---------------------------------------------------------------------------
# ICD-10 / CPT helpers
# ---------------------------------------------------------------------------

ICD10_PATTERN = re.compile(r"^[A-Z]\d{2}(\.\d{1,4})?$")
CPT_PATTERN = re.compile(r"^\d{5}$")
VALID_MODIFIERS = {
    "22", "24", "25", "26", "50", "51", "52", "53", "54", "55",
    "56", "57", "58", "59", "62", "66", "76", "77", "78", "79",
    "80", "81", "82", "AS", "LT", "RT", "TC", "XE", "XP", "XS", "XU",
}

# Gender-specific diagnosis prefixes
MALE_ONLY_PREFIXES = ("N40", "N41", "N42", "N43", "N44", "N45", "N46", "N47", "N48", "N49", "N50", "C61")
FEMALE_ONLY_PREFIXES = ("N70", "N71", "N72", "N73", "N74", "N75", "N76", "N77", "O0", "O1", "O2", "O3", "O4",
                        "O6", "O7", "O8", "O9", "C56", "C57")

# Pediatric-only diagnosis prefixes (neonatal / congenital)
PEDIATRIC_PREFIXES = ("P0", "P1", "P2", "P3", "P4", "P5", "P7", "P8", "P9")

# CPT codes that typically require prior authorization
PA_REQUIRED_CPT_RANGES: list[tuple[int, int]] = [
    (27000, 27899),  # Lower extremity surgery
    (23000, 23929),  # Shoulder surgery
    (29800, 29999),  # Arthroscopy
    (70000, 79999),  # Radiology (MRI, CT)
    (99183, 99183),  # Hyperbaric oxygen
]
PA_REQUIRED_CPT_SINGLES = {"E0100", "E0105", "E0110", "E0130"}  # DME codes are HCPCS, check separately


# ---------------------------------------------------------------------------
# Demographics Rules (DEM-*)
# ---------------------------------------------------------------------------

def _rule_dem_001(claim: dict, findings: list[ScrubFinding]) -> None:
    """DEM-001: Valid billing provider NPI (10 digits, Luhn check)."""
    npi = (claim.get("billing_provider") or {}).get("npi", "")
    if not npi:
        findings.append(ScrubFinding(
            rule_id="DEM-001", severity=Severity.ERROR, category="demographics",
            description="Billing provider NPI is missing",
            field="billing_provider.npi",
            remediation="Add a valid 10-digit NPI for the billing provider",
        ))
    elif not validate_npi(npi):
        findings.append(ScrubFinding(
            rule_id="DEM-001", severity=Severity.ERROR, category="demographics",
            description=f"Billing provider NPI '{npi}' is invalid (fails Luhn check)",
            field="billing_provider.npi",
            remediation="Verify NPI at https://npiregistry.cms.hhs.gov/",
        ))


def _rule_dem_002(claim: dict, findings: list[ScrubFinding]) -> None:
    """DEM-002: Valid subscriber ID (not empty, not placeholder)."""
    sub_id = (claim.get("subscriber") or {}).get("id", "")
    placeholders = {"", "000000000", "123456789", "UNKNOWN", "N/A", "NONE", "TBD"}
    if not sub_id or sub_id.upper() in placeholders:
        findings.append(ScrubFinding(
            rule_id="DEM-002", severity=Severity.ERROR, category="demographics",
            description="Subscriber ID is missing or placeholder",
            field="subscriber.id",
            remediation="Obtain valid subscriber/member ID from insurance card",
        ))


def _rule_dem_003(claim: dict, findings: list[ScrubFinding]) -> None:
    """DEM-003: Patient name present (first + last)."""
    sub = claim.get("subscriber") or {}
    name = sub.get("name") or {}
    first = (name.get("first") or "").strip()
    last = (name.get("last") or "").strip()
    if not first or not last:
        findings.append(ScrubFinding(
            rule_id="DEM-003", severity=Severity.ERROR, category="demographics",
            description="Patient first and/or last name is missing",
            field="subscriber.name",
            remediation="Ensure both first and last name are populated",
        ))


def _rule_dem_004(claim: dict, findings: list[ScrubFinding]) -> None:
    """DEM-004: Patient DOB present and valid (not future date)."""
    sub = claim.get("subscriber") or {}
    dob_str = sub.get("dob", "")
    if not dob_str:
        findings.append(ScrubFinding(
            rule_id="DEM-004", severity=Severity.ERROR, category="demographics",
            description="Patient date of birth is missing",
            field="subscriber.dob",
            remediation="Add patient date of birth in YYYY-MM-DD format",
        ))
        return
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    except ValueError:
        findings.append(ScrubFinding(
            rule_id="DEM-004", severity=Severity.ERROR, category="demographics",
            description=f"Patient DOB '{dob_str}' is not a valid date",
            field="subscriber.dob",
            remediation="Use YYYY-MM-DD format for date of birth",
        ))
        return
    if dob > date.today():
        findings.append(ScrubFinding(
            rule_id="DEM-004", severity=Severity.ERROR, category="demographics",
            description="Patient date of birth is in the future",
            field="subscriber.dob",
            remediation="Correct the date of birth",
        ))


def _rule_dem_005(claim: dict, findings: list[ScrubFinding]) -> None:
    """DEM-005: Valid payer ID."""
    payer_id = (claim.get("payer") or {}).get("id", "")
    if not payer_id:
        findings.append(ScrubFinding(
            rule_id="DEM-005", severity=Severity.ERROR, category="demographics",
            description="Payer ID is missing",
            field="payer.id",
            remediation="Add the payer/insurance company ID",
        ))


# ---------------------------------------------------------------------------
# Coding Rules (COD-*)
# ---------------------------------------------------------------------------

def _rule_cod_001(claim: dict, findings: list[ScrubFinding]) -> None:
    """COD-001: At least one valid ICD-10 diagnosis code."""
    diagnoses = claim.get("diagnoses") or []
    if not diagnoses:
        findings.append(ScrubFinding(
            rule_id="COD-001", severity=Severity.ERROR, category="coding",
            description="No diagnosis codes present on claim",
            field="diagnoses",
            remediation="Add at least one ICD-10 diagnosis code",
        ))
        return
    for dx in diagnoses:
        code = dx.get("code", "")
        if not ICD10_PATTERN.match(code):
            findings.append(ScrubFinding(
                rule_id="COD-001", severity=Severity.ERROR, category="coding",
                description=f"Diagnosis code '{code}' is not valid ICD-10 format",
                field="diagnoses",
                remediation="ICD-10 format: letter + 2 digits + optional decimal + up to 4 digits (e.g., M17.11)",
            ))


def _rule_cod_002(claim: dict, findings: list[ScrubFinding]) -> None:
    """COD-002: At least one valid CPT procedure code."""
    lines = claim.get("service_lines") or []
    if not lines:
        findings.append(ScrubFinding(
            rule_id="COD-002", severity=Severity.ERROR, category="coding",
            description="No service lines / procedure codes on claim",
            field="service_lines",
            remediation="Add at least one service line with a CPT code",
        ))
        return
    for i, line in enumerate(lines):
        cpt = line.get("cpt", "")
        if not CPT_PATTERN.match(cpt):
            findings.append(ScrubFinding(
                rule_id="COD-002", severity=Severity.ERROR, category="coding",
                description=f"Service line {i + 1}: CPT code '{cpt}' is not a valid 5-digit code",
                field=f"service_lines[{i}].cpt",
                remediation="CPT codes must be exactly 5 digits",
            ))


def _rule_cod_003(claim: dict, findings: list[ScrubFinding]) -> None:
    """COD-003: Gender-specific diagnosis check."""
    gender = ((claim.get("subscriber") or {}).get("gender") or "").upper()
    if not gender:
        return
    diagnoses = claim.get("diagnoses") or []
    for dx in diagnoses:
        code = dx.get("code", "")
        if gender != "M" and any(code.startswith(p) for p in MALE_ONLY_PREFIXES):
            findings.append(ScrubFinding(
                rule_id="COD-003", severity=Severity.WARNING, category="coding",
                description=f"Diagnosis '{code}' is male-specific but patient gender is '{gender}'",
                field="diagnoses",
                remediation="Verify diagnosis matches patient gender or update gender on file",
            ))
        if gender != "F" and any(code.startswith(p) for p in FEMALE_ONLY_PREFIXES):
            findings.append(ScrubFinding(
                rule_id="COD-003", severity=Severity.WARNING, category="coding",
                description=f"Diagnosis '{code}' is female-specific but patient gender is '{gender}'",
                field="diagnoses",
                remediation="Verify diagnosis matches patient gender or update gender on file",
            ))


def _rule_cod_004(claim: dict, findings: list[ScrubFinding]) -> None:
    """COD-004: Age-appropriate diagnosis check (pediatric codes for age < 18)."""
    sub = claim.get("subscriber") or {}
    dob_str = sub.get("dob", "")
    if not dob_str:
        return
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    except ValueError:
        return
    service_date_str = claim.get("service_date", "")
    try:
        svc_date = datetime.strptime(service_date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        svc_date = date.today()
    age = (svc_date - dob).days // 365
    diagnoses = claim.get("diagnoses") or []
    for dx in diagnoses:
        code = dx.get("code", "")
        if any(code.startswith(p) for p in PEDIATRIC_PREFIXES) and age >= 18:
            findings.append(ScrubFinding(
                rule_id="COD-004", severity=Severity.WARNING, category="coding",
                description=f"Diagnosis '{code}' is pediatric/neonatal but patient age is {age}",
                field="diagnoses",
                remediation="Verify diagnosis is appropriate for patient age",
            ))


def _rule_cod_005(claim: dict, findings: list[ScrubFinding]) -> None:
    """COD-005: Modifier validation."""
    lines = claim.get("service_lines") or []
    for i, line in enumerate(lines):
        mod = line.get("modifier")
        if mod is None:
            continue
        mods = [mod] if isinstance(mod, str) else mod
        for m in mods:
            if m and m.upper() not in VALID_MODIFIERS:
                findings.append(ScrubFinding(
                    rule_id="COD-005", severity=Severity.WARNING, category="coding",
                    description=f"Service line {i + 1}: modifier '{m}' is not a recognized CPT modifier",
                    field=f"service_lines[{i}].modifier",
                    remediation=f"Valid modifiers include: {', '.join(sorted(VALID_MODIFIERS)[:10])}, etc.",
                ))


# ---------------------------------------------------------------------------
# Payer Rules (PAY-*)
# ---------------------------------------------------------------------------

def _rule_pay_001(claim: dict, findings: list[ScrubFinding]) -> None:
    """PAY-001: Timely filing check (max 365 days from service date)."""
    svc_str = claim.get("service_date", "")
    sub_str = claim.get("submission_date", "")
    if not svc_str or not sub_str:
        return
    try:
        svc_date = datetime.strptime(svc_str, "%Y-%m-%d").date()
        sub_date = datetime.strptime(sub_str, "%Y-%m-%d").date()
    except ValueError:
        return
    days = (sub_date - svc_date).days
    if days > 365:
        findings.append(ScrubFinding(
            rule_id="PAY-001", severity=Severity.ERROR, category="payer",
            description=f"Timely filing exceeded: {days} days between service and submission (max 365)",
            field="submission_date",
            remediation="File within payer timely filing limit or request exception",
        ))
    elif days > 300:
        findings.append(ScrubFinding(
            rule_id="PAY-001", severity=Severity.WARNING, category="payer",
            description=f"Approaching timely filing limit: {days} days (max 365)",
            field="submission_date",
            remediation="Submit claim promptly to avoid timely filing denial",
        ))


def _cpt_requires_pa(cpt: str) -> bool:
    """Check if a CPT code typically requires prior authorization."""
    if not CPT_PATTERN.match(cpt):
        return False
    cpt_int = int(cpt)
    return any(lo <= cpt_int <= hi for lo, hi in PA_REQUIRED_CPT_RANGES)


def _rule_pay_002(claim: dict, findings: list[ScrubFinding]) -> None:
    """PAY-002: Prior auth required check (surgery, MRI, CT, DME)."""
    lines = claim.get("service_lines") or []
    pa_needed = False
    for line in lines:
        cpt = line.get("cpt", "")
        if _cpt_requires_pa(cpt):
            pa_needed = True
            break
    if pa_needed:
        findings.append(ScrubFinding(
            rule_id="PAY-002", severity=Severity.WARNING, category="payer",
            description="One or more procedures typically require prior authorization",
            field="service_lines",
            remediation="Verify prior authorization was obtained before service",
        ))


def _rule_pay_003(claim: dict, findings: list[ScrubFinding]) -> None:
    """PAY-003: Authorization number present when PA required."""
    lines = claim.get("service_lines") or []
    pa_needed = any(_cpt_requires_pa(line.get("cpt", "")) for line in lines)
    if pa_needed and not claim.get("prior_auth_number"):
        findings.append(ScrubFinding(
            rule_id="PAY-003", severity=Severity.ERROR, category="payer",
            description="Prior authorization number missing for procedures that require PA",
            field="prior_auth_number",
            remediation="Add the prior authorization number obtained from the payer",
        ))


# ---------------------------------------------------------------------------
# Duplicate Detection (DUP-*)
# ---------------------------------------------------------------------------

def _rule_dup_001(claim: dict, findings: list[ScrubFinding]) -> None:
    """DUP-001: Duplicate service line detection (same CPT + same date)."""
    lines = claim.get("service_lines") or []
    seen: set[tuple[str, str]] = set()
    for i, line in enumerate(lines):
        key = (line.get("cpt", ""), line.get("date_of_service", ""))
        if key in seen:
            findings.append(ScrubFinding(
                rule_id="DUP-001", severity=Severity.WARNING, category="duplicate",
                description=f"Duplicate service line: CPT {key[0]} on {key[1]}",
                field=f"service_lines[{i}]",
                remediation="Remove duplicate or add appropriate modifier (e.g., 76, 77, 59)",
            ))
        seen.add(key)


def _rule_dup_002(claim: dict, findings: list[ScrubFinding]) -> None:
    """DUP-002: Duplicate claim detection (same patient + DOS + provider) -- placeholder.

    Full duplicate detection requires access to previously submitted claims.
    This rule checks the frequency_code field for resubmission without replacement.
    """
    freq = claim.get("frequency_code", "1")
    if freq == "1":
        # Original claim -- no duplicate concern from frequency code alone
        return
    if freq not in ("7", "8"):
        findings.append(ScrubFinding(
            rule_id="DUP-002", severity=Severity.INFO, category="duplicate",
            description=f"Claim frequency code '{freq}' -- verify this is not an unintended duplicate",
            field="frequency_code",
            remediation="Use frequency code 7 (replacement) or 8 (void) for resubmissions",
        ))


# ---------------------------------------------------------------------------
# Financial Rules (FIN-*)
# ---------------------------------------------------------------------------

def _rule_fin_001(claim: dict, findings: list[ScrubFinding]) -> None:
    """FIN-001: Total charges match sum of service line charges."""
    lines = claim.get("service_lines") or []
    if not lines:
        return
    line_total = sum(
        (line.get("charge") or 0.0) * (line.get("units") or 1)
        for line in lines
    )
    total = claim.get("total_charges")
    if total is not None and abs(total - line_total) > 0.01:
        findings.append(ScrubFinding(
            rule_id="FIN-001", severity=Severity.ERROR, category="financial",
            description=f"Total charges ${total:.2f} do not match service line sum ${line_total:.2f}",
            field="total_charges",
            remediation="Correct total charges to match the sum of service line charges x units",
        ))


def _rule_fin_002(claim: dict, findings: list[ScrubFinding]) -> None:
    """FIN-002: Charge amount > 0 for all service lines."""
    lines = claim.get("service_lines") or []
    for i, line in enumerate(lines):
        charge = line.get("charge")
        if charge is None or charge <= 0:
            findings.append(ScrubFinding(
                rule_id="FIN-002", severity=Severity.ERROR, category="financial",
                description=f"Service line {i + 1}: charge is ${charge or 0:.2f} (must be > 0)",
                field=f"service_lines[{i}].charge",
                remediation="Set a valid charge amount greater than zero",
            ))


def _rule_fin_003(claim: dict, findings: list[ScrubFinding]) -> None:
    """FIN-003: Units > 0 for all service lines."""
    lines = claim.get("service_lines") or []
    for i, line in enumerate(lines):
        units = line.get("units")
        if units is None or units <= 0:
            findings.append(ScrubFinding(
                rule_id="FIN-003", severity=Severity.ERROR, category="financial",
                description=f"Service line {i + 1}: units is {units or 0} (must be > 0)",
                field=f"service_lines[{i}].units",
                remediation="Set units to at least 1",
            ))


# ---------------------------------------------------------------------------
# Rule registry
# ---------------------------------------------------------------------------

ALL_RULES = [
    _rule_dem_001,
    _rule_dem_002,
    _rule_dem_003,
    _rule_dem_004,
    _rule_dem_005,
    _rule_cod_001,
    _rule_cod_002,
    _rule_cod_003,
    _rule_cod_004,
    _rule_cod_005,
    _rule_pay_001,
    _rule_pay_002,
    _rule_pay_003,
    _rule_dup_001,
    _rule_dup_002,
    _rule_fin_001,
    _rule_fin_002,
    _rule_fin_003,
]


# ---------------------------------------------------------------------------
# Denial risk scoring
# ---------------------------------------------------------------------------

def _compute_denial_risk(findings: list[ScrubFinding]) -> int:
    """Compute denial risk score 0-100 based on findings."""
    if not findings:
        return 0
    score = 0
    for f in findings:
        if f.severity == Severity.ERROR:
            score += 20
        elif f.severity == Severity.WARNING:
            score += 10
        else:
            score += 2
    return min(score, 100)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def scrub_claim(claim: dict) -> ScrubResult:
    """Run all scrubbing rules against a claim."""
    findings: list[ScrubFinding] = []
    for rule_fn in ALL_RULES:
        rule_fn(claim, findings)

    errors = sum(1 for f in findings if f.severity == Severity.ERROR)
    warnings = sum(1 for f in findings if f.severity == Severity.WARNING)
    denial_risk = _compute_denial_risk(findings)
    passed = errors == 0

    return ScrubResult(
        passed=passed,
        denial_risk_score=denial_risk,
        findings=findings,
        errors=errors,
        warnings=warnings,
    )
