"""Tests for Claims Scrubbing Rules Engine."""

from __future__ import annotations

import copy

import pytest

from medos.billing.claims_scrubber import (
    ScrubResult,
    Severity,
    scrub_claim,
    validate_npi,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _clean_claim() -> dict:
    """Return a minimal valid claim that passes all scrubbing rules."""
    return {
        "claim_id": "CLM-001",
        "billing_provider": {
            "npi": "1234567893",
            "name": "Sunshine Orthopedics",
            "tax_id": "12-3456789",
        },
        "subscriber": {
            "id": "AET-PPO-001",
            "name": {"first": "Robert", "last": "Chen"},
            "dob": "1965-03-15",
            "gender": "M",
        },
        "payer": {
            "id": "AET",
            "name": "Aetna",
        },
        "diagnoses": [
            {"code": "M17.11", "description": "Primary osteoarthritis, right knee"},
        ],
        "service_lines": [
            {
                "cpt": "99213",
                "modifier": None,
                "charge": 150.00,
                "units": 1,
                "date_of_service": "2026-02-28",
                "diagnosis_pointers": [1],
            },
        ],
        "service_date": "2026-02-28",
        "submission_date": "2026-02-28",
        "total_charges": 150.00,
        "prior_auth_number": None,
        "frequency_code": "1",
    }


# ---------------------------------------------------------------------------
# NPI validation unit tests
# ---------------------------------------------------------------------------

class TestValidateNpi:
    def test_valid_npi(self) -> None:
        assert validate_npi("1234567893") is True

    def test_invalid_npi_luhn(self) -> None:
        assert validate_npi("1234567890") is False

    def test_npi_too_short(self) -> None:
        assert validate_npi("12345") is False

    def test_npi_non_numeric(self) -> None:
        assert validate_npi("12345ABCDE") is False

    def test_npi_empty(self) -> None:
        assert validate_npi("") is False


# ---------------------------------------------------------------------------
# Scrubber integration tests
# ---------------------------------------------------------------------------

class TestCleanClaim:
    def test_clean_claim(self) -> None:
        """A well-formed claim should pass with score 0."""
        result = scrub_claim(_clean_claim())
        assert result.passed is True
        assert result.denial_risk_score == 0
        assert result.errors == 0
        assert result.warnings == 0
        assert len(result.findings) == 0


class TestDemographicsRules:
    def test_missing_npi(self) -> None:
        claim = _clean_claim()
        claim["billing_provider"]["npi"] = ""
        result = scrub_claim(claim)
        assert result.passed is False
        rule_ids = [f.rule_id for f in result.findings]
        assert "DEM-001" in rule_ids

    def test_invalid_npi_luhn(self) -> None:
        claim = _clean_claim()
        claim["billing_provider"]["npi"] = "1234567890"
        result = scrub_claim(claim)
        assert result.passed is False
        rule_ids = [f.rule_id for f in result.findings]
        assert "DEM-001" in rule_ids

    def test_missing_subscriber_id(self) -> None:
        claim = _clean_claim()
        claim["subscriber"]["id"] = ""
        result = scrub_claim(claim)
        assert result.passed is False
        rule_ids = [f.rule_id for f in result.findings]
        assert "DEM-002" in rule_ids

    def test_placeholder_subscriber_id(self) -> None:
        claim = _clean_claim()
        claim["subscriber"]["id"] = "UNKNOWN"
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "DEM-002" for f in result.findings)

    def test_missing_patient_name(self) -> None:
        claim = _clean_claim()
        claim["subscriber"]["name"] = {"first": "", "last": "Chen"}
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "DEM-003" for f in result.findings)

    def test_missing_dob(self) -> None:
        claim = _clean_claim()
        claim["subscriber"]["dob"] = ""
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "DEM-004" for f in result.findings)

    def test_future_dob(self) -> None:
        claim = _clean_claim()
        claim["subscriber"]["dob"] = "2099-01-01"
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "DEM-004" for f in result.findings)

    def test_missing_payer_id(self) -> None:
        claim = _clean_claim()
        claim["payer"]["id"] = ""
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "DEM-005" for f in result.findings)


class TestCodingRules:
    def test_missing_diagnosis(self) -> None:
        claim = _clean_claim()
        claim["diagnoses"] = []
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "COD-001" for f in result.findings)

    def test_invalid_icd10_format(self) -> None:
        claim = _clean_claim()
        claim["diagnoses"] = [{"code": "INVALID", "description": "Bad code"}]
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "COD-001" for f in result.findings)

    def test_valid_icd10_no_decimal(self) -> None:
        claim = _clean_claim()
        claim["diagnoses"] = [{"code": "J06", "description": "URI"}]
        result = scrub_claim(claim)
        cod001 = [f for f in result.findings if f.rule_id == "COD-001"]
        assert len(cod001) == 0

    def test_missing_service_lines(self) -> None:
        claim = _clean_claim()
        claim["service_lines"] = []
        claim["total_charges"] = 0
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "COD-002" for f in result.findings)

    def test_invalid_cpt(self) -> None:
        claim = _clean_claim()
        claim["service_lines"][0]["cpt"] = "ABC"
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "COD-002" for f in result.findings)

    def test_gender_mismatch(self) -> None:
        """Male-only diagnosis on female patient."""
        claim = _clean_claim()
        claim["subscriber"]["gender"] = "F"
        claim["diagnoses"] = [{"code": "N40.0", "description": "Enlarged prostate"}]
        result = scrub_claim(claim)
        assert any(f.rule_id == "COD-003" for f in result.findings)
        cod003 = [f for f in result.findings if f.rule_id == "COD-003"]
        assert cod003[0].severity == Severity.WARNING

    def test_gender_mismatch_female_code_on_male(self) -> None:
        """Female-only diagnosis on male patient."""
        claim = _clean_claim()
        claim["subscriber"]["gender"] = "M"
        claim["diagnoses"] = [{"code": "O80", "description": "Full-term delivery"}]
        result = scrub_claim(claim)
        assert any(f.rule_id == "COD-003" for f in result.findings)

    def test_pediatric_code_on_adult(self) -> None:
        claim = _clean_claim()
        claim["diagnoses"] = [{"code": "P07.1", "description": "Low birth weight"}]
        result = scrub_claim(claim)
        assert any(f.rule_id == "COD-004" for f in result.findings)

    def test_invalid_modifier(self) -> None:
        claim = _clean_claim()
        claim["service_lines"][0]["modifier"] = "ZZ"
        result = scrub_claim(claim)
        assert any(f.rule_id == "COD-005" for f in result.findings)

    def test_valid_modifier(self) -> None:
        claim = _clean_claim()
        claim["service_lines"][0]["modifier"] = "25"
        result = scrub_claim(claim)
        cod005 = [f for f in result.findings if f.rule_id == "COD-005"]
        assert len(cod005) == 0


class TestPayerRules:
    def test_timely_filing_expired(self) -> None:
        claim = _clean_claim()
        claim["service_date"] = "2024-01-01"
        claim["submission_date"] = "2026-02-28"
        result = scrub_claim(claim)
        assert result.passed is False
        pay001 = [f for f in result.findings if f.rule_id == "PAY-001"]
        assert len(pay001) == 1
        assert pay001[0].severity == Severity.ERROR

    def test_timely_filing_warning(self) -> None:
        claim = _clean_claim()
        claim["service_date"] = "2025-04-01"
        claim["submission_date"] = "2026-02-28"
        result = scrub_claim(claim)
        pay001 = [f for f in result.findings if f.rule_id == "PAY-001"]
        assert len(pay001) == 1
        assert pay001[0].severity == Severity.WARNING

    def test_pa_required_no_auth(self) -> None:
        """Surgery CPT that requires PA without auth number."""
        claim = _clean_claim()
        claim["service_lines"] = [{
            "cpt": "27447",  # Total knee arthroplasty
            "modifier": None,
            "charge": 5000.00,
            "units": 1,
            "date_of_service": "2026-02-28",
            "diagnosis_pointers": [1],
        }]
        claim["total_charges"] = 5000.00
        claim["prior_auth_number"] = None
        result = scrub_claim(claim)
        rule_ids = [f.rule_id for f in result.findings]
        assert "PAY-002" in rule_ids
        assert "PAY-003" in rule_ids

    def test_pa_present(self) -> None:
        """Surgery CPT with auth number -- PAY-003 should NOT fire."""
        claim = _clean_claim()
        claim["service_lines"] = [{
            "cpt": "27447",
            "modifier": None,
            "charge": 5000.00,
            "units": 1,
            "date_of_service": "2026-02-28",
            "diagnosis_pointers": [1],
        }]
        claim["total_charges"] = 5000.00
        claim["prior_auth_number"] = "AUTH-12345"
        result = scrub_claim(claim)
        rule_ids = [f.rule_id for f in result.findings]
        assert "PAY-003" not in rule_ids


class TestDuplicateDetection:
    def test_duplicate_service_line(self) -> None:
        claim = _clean_claim()
        line = claim["service_lines"][0]
        claim["service_lines"] = [copy.deepcopy(line), copy.deepcopy(line)]
        claim["total_charges"] = 300.00
        result = scrub_claim(claim)
        assert any(f.rule_id == "DUP-001" for f in result.findings)

    def test_no_duplicate_different_dates(self) -> None:
        claim = _clean_claim()
        line1 = copy.deepcopy(claim["service_lines"][0])
        line2 = copy.deepcopy(claim["service_lines"][0])
        line2["date_of_service"] = "2026-03-01"
        claim["service_lines"] = [line1, line2]
        claim["total_charges"] = 300.00
        result = scrub_claim(claim)
        dup001 = [f for f in result.findings if f.rule_id == "DUP-001"]
        assert len(dup001) == 0


class TestFinancialRules:
    def test_charge_mismatch(self) -> None:
        claim = _clean_claim()
        claim["total_charges"] = 999.99
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "FIN-001" for f in result.findings)

    def test_zero_charge(self) -> None:
        claim = _clean_claim()
        claim["service_lines"][0]["charge"] = 0
        claim["total_charges"] = 0
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "FIN-002" for f in result.findings)

    def test_zero_units(self) -> None:
        claim = _clean_claim()
        claim["service_lines"][0]["units"] = 0
        result = scrub_claim(claim)
        assert result.passed is False
        assert any(f.rule_id == "FIN-003" for f in result.findings)

    def test_multi_line_total_matches(self) -> None:
        """Multiple lines with units -- total should match sum(charge * units)."""
        claim = _clean_claim()
        claim["service_lines"] = [
            {"cpt": "99213", "modifier": None, "charge": 150.00, "units": 1,
             "date_of_service": "2026-02-28", "diagnosis_pointers": [1]},
            {"cpt": "99214", "modifier": None, "charge": 200.00, "units": 2,
             "date_of_service": "2026-02-28", "diagnosis_pointers": [1]},
        ]
        claim["total_charges"] = 550.00  # 150*1 + 200*2
        result = scrub_claim(claim)
        fin001 = [f for f in result.findings if f.rule_id == "FIN-001"]
        assert len(fin001) == 0


class TestMultipleFindings:
    def test_multiple_findings(self) -> None:
        """Claim with 3+ issues."""
        claim = _clean_claim()
        claim["billing_provider"]["npi"] = ""      # DEM-001
        claim["subscriber"]["id"] = ""              # DEM-002
        claim["diagnoses"] = []                     # COD-001
        claim["total_charges"] = 999.99             # FIN-001
        result = scrub_claim(claim)
        assert result.passed is False
        assert len(result.findings) >= 3
        assert result.errors >= 3

    def test_denial_risk_scoring(self) -> None:
        """More findings -> higher denial risk score."""
        clean = _clean_claim()
        clean_result = scrub_claim(clean)
        assert clean_result.denial_risk_score == 0

        # One error
        one_err = _clean_claim()
        one_err["billing_provider"]["npi"] = ""
        one_result = scrub_claim(one_err)
        assert one_result.denial_risk_score > 0

        # Many errors
        many_err = _clean_claim()
        many_err["billing_provider"]["npi"] = ""
        many_err["subscriber"]["id"] = ""
        many_err["subscriber"]["name"] = {"first": "", "last": ""}
        many_err["payer"]["id"] = ""
        many_err["diagnoses"] = []
        many_result = scrub_claim(many_err)
        assert many_result.denial_risk_score > one_result.denial_risk_score

    def test_risk_caps_at_100(self) -> None:
        """Risk score should never exceed 100."""
        claim = _clean_claim()
        claim["billing_provider"]["npi"] = ""
        claim["subscriber"]["id"] = ""
        claim["subscriber"]["name"] = {"first": "", "last": ""}
        claim["subscriber"]["dob"] = ""
        claim["payer"]["id"] = ""
        claim["diagnoses"] = []
        claim["service_lines"] = []
        claim["total_charges"] = 999.99
        result = scrub_claim(claim)
        assert result.denial_risk_score <= 100
