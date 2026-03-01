"""Tests for X12 837P Professional Claims Generator."""

from __future__ import annotations

from datetime import date, datetime

import pytest

from medos.billing.x12_837p import (
    Address,
    ClaimData,
    Payer,
    Provider,
    ServiceLine,
    Subscriber,
    generate_837p,
    reset_control_numbers,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset_controls():
    """Reset control numbers before each test for deterministic output."""
    reset_control_numbers(1)


def _make_provider() -> Provider:
    return Provider(
        name="MEDOS ORTHOPEDIC GROUP",
        npi="1234567890",
        tax_id="123456789",
        taxonomy_code="207X00000X",
        address=Address(
            line1="123 MAIN STREET",
            city="MIAMI",
            state="FL",
            zip_code="33101",
        ),
        contact_name="BILLING DEPT",
        contact_phone="3055551234",
        entity_type="2",
    )


def _make_subscriber() -> Subscriber:
    return Subscriber(
        first_name="JANE",
        last_name="DOE",
        member_id="XYZ123456789",
        group_number="GROUP123",
        address=Address(
            line1="456 OAK AVENUE",
            city="MIAMI",
            state="FL",
            zip_code="33102",
        ),
        date_of_birth=date(1985, 3, 15),
        gender="F",
        payer_responsibility="P",
        relationship_code="18",
        insurance_type="CI",
    )


def _make_payer() -> Payer:
    return Payer(
        name="AETNA",
        payer_id="60054",
        address=Address(
            line1="PO BOX 98765",
            city="HARTFORD",
            state="CT",
            zip_code="06101",
        ),
    )


def _make_basic_claim(**overrides) -> ClaimData:
    """Build a basic single-service-line claim for testing."""
    defaults = dict(
        claim_id="CLM-TEST-001",
        total_charge=150.00,
        service_lines=[
            ServiceLine(
                procedure_code="99213",
                charge_amount=150.00,
                units=1,
                modifiers=["25"],
                service_date=date(2026, 2, 27),
                diagnosis_pointers=[1],
            ),
        ],
        billing_provider=_make_provider(),
        subscriber=_make_subscriber(),
        payer=_make_payer(),
        diagnosis_codes=["M79.3"],
        service_date=date(2026, 2, 27),
        place_of_service="11",
        frequency_code="1",
    )
    defaults.update(overrides)
    return ClaimData(**defaults)


FIXED_TS = datetime(2026, 2, 27, 15, 0, 0)


# ---------------------------------------------------------------------------
# Test: basic claim structure
# ---------------------------------------------------------------------------

class TestGenerateBasicClaim:
    """test_generate_basic_claim -- verify ISA/GS/ST/BHT/HL structure."""

    def test_envelope_present(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert output.startswith("ISA*")
        assert "GS*HC*" in output
        assert "ST*837*" in output
        assert "*005010X222A1~" in output

    def test_bht_segment(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        # BHT for original claim: purpose=00, type=CH
        assert "BHT*0019*00*CLM-TEST-001*20260227*1500*CH~" in output

    def test_hl_structure(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        # HL*1 = billing provider (level 20, has children)
        assert "HL*1**20*1~" in output
        # HL*2 = subscriber (level 22, parent=1, no children)
        assert "HL*2*1*22*0~" in output

    def test_billing_provider_npi(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "NM1*85*2*MEDOS ORTHOPEDIC GROUP*****XX*1234567890~" in output
        assert "REF*EI*123456789~" in output

    def test_subscriber_info(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "NM1*IL*1*DOE*JANE****MI*XYZ123456789~" in output
        assert "DMG*D8*19850315*F~" in output

    def test_payer_info(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "NM1*PR*2*AETNA*****PI*60054~" in output

    def test_claim_segment(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "CLM*CLM-TEST-001*150.00***11:B:1*Y*A*Y*Y~" in output

    def test_service_line(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "LX*1~" in output
        assert "SV1*HC:99213:25*150.00*UN*1***1~" in output
        assert "DTP*472*D8*20260227~" in output

    def test_iea_closes_envelope(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        lines = output.strip().split("\n")
        assert lines[-1].startswith("IEA*1*")
        assert lines[-2].startswith("GE*1*")


# ---------------------------------------------------------------------------
# Test: multi-service claim
# ---------------------------------------------------------------------------

class TestGenerateMultiServiceClaim:
    """test_generate_multi_service -- 2+ service lines."""

    def test_two_service_lines(self):
        claim = _make_basic_claim(
            total_charge=250.00,
            service_lines=[
                ServiceLine(
                    procedure_code="99213",
                    charge_amount=150.00,
                    modifiers=["25"],
                    service_date=date(2026, 2, 27),
                    diagnosis_pointers=[1],
                ),
                ServiceLine(
                    procedure_code="20610",
                    charge_amount=100.00,
                    service_date=date(2026, 2, 27),
                    diagnosis_pointers=[1, 2],
                ),
            ],
            diagnosis_codes=["M79.3", "Z79.899"],
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "LX*1~" in output
        assert "SV1*HC:99213:25*150.00*UN*1***1~" in output
        assert "LX*2~" in output
        assert "SV1*HC:20610*100.00*UN*1***1:2~" in output

    def test_three_service_lines(self):
        claim = _make_basic_claim(
            total_charge=500.00,
            service_lines=[
                ServiceLine(procedure_code="99214", charge_amount=200.00, service_date=date(2026, 2, 27)),
                ServiceLine(procedure_code="73721", charge_amount=200.00, service_date=date(2026, 2, 27)),
                ServiceLine(procedure_code="97110", charge_amount=100.00, service_date=date(2026, 2, 27)),
            ],
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "LX*1~" in output
        assert "LX*2~" in output
        assert "LX*3~" in output
        assert "SV1*HC:99214*200.00*" in output
        assert "SV1*HC:73721*200.00*" in output
        assert "SV1*HC:97110*100.00*" in output


# ---------------------------------------------------------------------------
# Test: corrected claim
# ---------------------------------------------------------------------------

class TestCorrectedClaim:
    """test_corrected_claim -- frequency code 7."""

    def test_frequency_code_7(self):
        claim = _make_basic_claim(
            frequency_code="7",
            original_reference_number="CLM-ORIG-001",
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        # BHT purpose should be 18 (reissue) for corrected claims
        assert "BHT*0019*18*" in output
        # CLM facility code should have :7
        assert "11:B:7*" in output
        # Original reference number
        assert "REF*F8*CLM-ORIG-001~" in output

    def test_corrected_requires_original_ref(self):
        claim = _make_basic_claim(frequency_code="7", original_reference_number="")
        with pytest.raises(ValueError, match="original_reference_number"):
            generate_837p(claim, timestamp=FIXED_TS)


# ---------------------------------------------------------------------------
# Test: void claim
# ---------------------------------------------------------------------------

class TestVoidClaim:
    """test_void_claim -- frequency code 8."""

    def test_frequency_code_8(self):
        claim = _make_basic_claim(
            frequency_code="8",
            original_reference_number="CLM-ORIG-002",
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        # BHT purpose should be 18 for void
        assert "BHT*0019*18*" in output
        # CLM facility code should have :8
        assert "11:B:8*" in output
        # Original reference number
        assert "REF*F8*CLM-ORIG-002~" in output

    def test_void_requires_original_ref(self):
        claim = _make_basic_claim(frequency_code="8", original_reference_number="")
        with pytest.raises(ValueError, match="original_reference_number"):
            generate_837p(claim, timestamp=FIXED_TS)


# ---------------------------------------------------------------------------
# Test: diagnosis pointers
# ---------------------------------------------------------------------------

class TestDiagnosisPointers:
    """test_diagnosis_pointers -- ICD-10 codes mapped correctly in HI segment."""

    def test_single_diagnosis(self):
        claim = _make_basic_claim(diagnosis_codes=["M23.21"])
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "HI*ABK:M23.21~" in output
        # No ABF since only one code
        assert "ABF:" not in output

    def test_multiple_diagnoses(self):
        claim = _make_basic_claim(
            diagnosis_codes=["M23.21", "M17.11", "M79.3"],
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "HI*ABK:M23.21~" in output  # principal
        assert "HI*ABF:M17.11~" in output  # additional
        assert "HI*ABF:M79.3~" in output   # additional

    def test_pointer_references_correct_diagnosis(self):
        claim = _make_basic_claim(
            total_charge=250.00,
            diagnosis_codes=["M23.21", "M17.11"],
            service_lines=[
                ServiceLine(
                    procedure_code="99213",
                    charge_amount=150.00,
                    service_date=date(2026, 2, 27),
                    diagnosis_pointers=[1],
                ),
                ServiceLine(
                    procedure_code="20610",
                    charge_amount=100.00,
                    service_date=date(2026, 2, 27),
                    diagnosis_pointers=[1, 2],
                ),
            ],
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        lines = output.split("\n")
        sv1_lines = [ln for ln in lines if ln.startswith("SV1*")]
        assert len(sv1_lines) == 2
        # First SV1 points to diagnosis 1
        assert sv1_lines[0].endswith("1~")
        # Second SV1 points to diagnoses 1 and 2
        assert sv1_lines[1].endswith("1:2~")


# ---------------------------------------------------------------------------
# Test: SE segment count
# ---------------------------------------------------------------------------

class TestSegmentCounts:
    """test_segment_counts -- SE segment count matches actual segments."""

    def test_se_count_basic(self):
        claim = _make_basic_claim()
        output = generate_837p(claim, timestamp=FIXED_TS)

        lines = output.strip().split("\n")
        # Find SE line
        se_line = next(ln for ln in lines if ln.startswith("SE*"))
        se_count = int(se_line.split("*")[1])

        # Count segments between ST and SE inclusive
        st_idx = next(i for i, ln in enumerate(lines) if ln.startswith("ST*"))
        se_idx = next(i for i, ln in enumerate(lines) if ln.startswith("SE*"))
        actual_count = se_idx - st_idx + 1  # inclusive of both ST and SE
        assert se_count == actual_count

    def test_se_count_multi_service(self):
        claim = _make_basic_claim(
            total_charge=350.00,
            service_lines=[
                ServiceLine(procedure_code="99214", charge_amount=200.00, service_date=date(2026, 2, 27)),
                ServiceLine(procedure_code="73721", charge_amount=150.00, service_date=date(2026, 2, 27)),
            ],
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        lines = output.strip().split("\n")
        se_line = next(ln for ln in lines if ln.startswith("SE*"))
        se_count = int(se_line.split("*")[1])

        st_idx = next(i for i, ln in enumerate(lines) if ln.startswith("ST*"))
        se_idx = next(i for i, ln in enumerate(lines) if ln.startswith("SE*"))
        actual_count = se_idx - st_idx + 1
        assert se_count == actual_count


# ---------------------------------------------------------------------------
# Test: control numbers
# ---------------------------------------------------------------------------

class TestControlNumbers:
    """test_control_numbers -- ISA/GS/ST numbers increment."""

    def test_explicit_control_numbers(self):
        claim = _make_basic_claim(
            interchange_control=100,
            group_control=200,
            transaction_control=300,
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "*000000100*" in output  # ISA13
        assert "GE*1*200~" in output
        assert "ST*837*0300*" in output

    def test_auto_increment_control_numbers(self):
        claim1 = _make_basic_claim()
        claim2 = _make_basic_claim(claim_id="CLM-TEST-002")

        out1 = generate_837p(claim1, timestamp=FIXED_TS)
        out2 = generate_837p(claim2, timestamp=FIXED_TS)

        # First claim gets control numbers 1, 2, 3
        assert "ST*837*0003*" in out1
        # Second claim gets control numbers 4, 5, 6
        assert "ST*837*0006*" in out2


# ---------------------------------------------------------------------------
# Test: dict input
# ---------------------------------------------------------------------------

class TestDictInput:
    """Test that generate_837p accepts dict input and converts it."""

    def test_dict_claim(self):
        data = {
            "claim_id": "CLM-DICT-001",
            "total_charge": 275.00,
            "diagnosis_codes": ["M54.5"],
            "service_date": "2026-02-27",
            "billing_provider": {
                "name": "DR WILLIAMS PRACTICE",
                "npi": "9876543210",
                "tax_id": "987654321",
                "address": {
                    "line1": "789 MEDICAL BLVD",
                    "city": "MIAMI",
                    "state": "FL",
                    "zip_code": "33101",
                },
                "contact_name": "FRONT DESK",
                "contact_phone": "3055559999",
            },
            "subscriber": {
                "first_name": "ROBERT",
                "last_name": "CHEN",
                "member_id": "AET-PPO-2024",
                "group_number": "GRP456",
                "date_of_birth": "1990-06-15",
                "gender": "M",
            },
            "payer": {
                "name": "AETNA",
                "payer_id": "60054",
            },
            "service_lines": [
                {
                    "procedure_code": "99213",
                    "charge_amount": 275.00,
                    "service_date": "2026-02-27",
                    "diagnosis_pointers": [1],
                },
            ],
        }
        output = generate_837p(data, timestamp=FIXED_TS)

        assert "CLM*CLM-DICT-001*275.00*" in output
        assert "NM1*85*2*DR WILLIAMS PRACTICE*****XX*9876543210~" in output
        assert "NM1*IL*1*CHEN*ROBERT****MI*AET-PPO-2024~" in output
        assert "HI*ABK:M54.5~" in output


# ---------------------------------------------------------------------------
# Test: prior auth
# ---------------------------------------------------------------------------

class TestPriorAuth:
    """Test that prior authorization reference is included."""

    def test_prior_auth_number(self):
        claim = _make_basic_claim(prior_auth_number="AUTH-2026-001")
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "REF*G1*AUTH-2026-001~" in output


# ---------------------------------------------------------------------------
# Test: validation errors
# ---------------------------------------------------------------------------

class TestValidation:
    """Test input validation catches bad data."""

    def test_missing_claim_id(self):
        claim = _make_basic_claim(claim_id="")
        with pytest.raises(ValueError, match="claim_id"):
            generate_837p(claim, timestamp=FIXED_TS)

    def test_zero_total_charge(self):
        claim = _make_basic_claim(total_charge=0)
        with pytest.raises(ValueError, match="total_charge"):
            generate_837p(claim, timestamp=FIXED_TS)

    def test_no_service_lines(self):
        claim = _make_basic_claim(service_lines=[])
        with pytest.raises(ValueError, match="service line"):
            generate_837p(claim, timestamp=FIXED_TS)

    def test_no_diagnosis_codes(self):
        claim = _make_basic_claim(diagnosis_codes=[])
        with pytest.raises(ValueError, match="diagnosis code"):
            generate_837p(claim, timestamp=FIXED_TS)

    def test_missing_npi(self):
        prov = _make_provider()
        prov.npi = ""
        claim = _make_basic_claim(billing_provider=prov)
        with pytest.raises(ValueError, match="npi"):
            generate_837p(claim, timestamp=FIXED_TS)


# ---------------------------------------------------------------------------
# Test: modifiers
# ---------------------------------------------------------------------------

class TestModifiers:
    """Test that CPT modifiers are correctly placed in SV1 composite."""

    def test_multiple_modifiers(self):
        claim = _make_basic_claim(
            service_lines=[
                ServiceLine(
                    procedure_code="99215",
                    charge_amount=150.00,
                    modifiers=["25", "59"],
                    service_date=date(2026, 2, 27),
                    diagnosis_pointers=[1],
                ),
            ],
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "SV1*HC:99215:25:59*150.00*" in output

    def test_no_modifiers(self):
        claim = _make_basic_claim(
            service_lines=[
                ServiceLine(
                    procedure_code="20610",
                    charge_amount=150.00,
                    modifiers=[],
                    service_date=date(2026, 2, 27),
                    diagnosis_pointers=[1],
                ),
            ],
        )
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "SV1*HC:20610*150.00*" in output


# ---------------------------------------------------------------------------
# Test: place of service
# ---------------------------------------------------------------------------

class TestPlaceOfService:
    """Test different place-of-service codes."""

    def test_outpatient_hospital(self):
        claim = _make_basic_claim(place_of_service="22")
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "22:B:1*" in output

    def test_office(self):
        claim = _make_basic_claim(place_of_service="11")
        output = generate_837p(claim, timestamp=FIXED_TS)

        assert "11:B:1*" in output
