"""Tests for X12 835 Remittance Advice Parser."""

from __future__ import annotations

import pytest

from medos.billing.x12_835_parser import (
    CARC_DESCRIPTIONS,
    ClaimPayment,
    RemittanceAdvice,
    ServiceAdjustment,
    get_carc_description,
    parse_835,
)

# ---------------------------------------------------------------------------
# Mock 835 data
# ---------------------------------------------------------------------------

MOCK_835_BASIC = (
    "ISA*00*          *00*          *ZZ*AETNA          *ZZ*SUNSHINE       "
    "*260228*1200*^*00501*000000001*0*P*:~"
    "GS*HP*AETNA*SUNSHINE*20260228*1200*1*X*005010X221A1~"
    "ST*835*0001~"
    "BPR*I*2500.00*C*ACH*CTX*01*999999999*DA*12345678*1234567890**01*999999999*DA*87654321*20260228~"
    "TRN*1*123456789*1234567890~"
    "N1*PR*Aetna*XV*60054~"
    "N1*PE*Sunshine Orthopedics*XX*1234567893~"
    "CLP*CLM-001*1*500.00*400.00**12*AET-PPO-001~"
    "NM1*QC*1*Smith*John~"
    "SVC*HC:99213*150.00*120.00**1~"
    "CAS*CO*45*30.00~"
    "SVC*HC:99214*200.00*160.00**1~"
    "CAS*CO*45*25.00~"
    "CAS*PR*2*15.00~"
    "SVC*HC:20610*150.00*120.00**1~"
    "CAS*CO*45*15.00~"
    "CAS*PR*2*15.00~"
    "CLP*CLM-002*1*350.00*280.00**12*AET-PPO-002~"
    "NM1*QC*1*Doe*Jane~"
    "SVC*HC:99214*200.00*160.00**1~"
    "CAS*CO*45*40.00~"
    "SVC*HC:20610*150.00*120.00**1~"
    "CAS*CO*45*15.00~"
    "CAS*PR*2*15.00~"
    "SE*20*0001~"
    "GE*1*1~"
    "IEA*1*000000001~"
)

MOCK_835_DENIED = (
    "ISA*00*          *00*          *ZZ*BCBS           *ZZ*SUNSHINE       "
    "*260228*1200*^*00501*000000002*0*P*:~"
    "GS*HP*BCBS*SUNSHINE*20260228*1200*2*X*005010X221A1~"
    "ST*835*0002~"
    "BPR*I*0.00*C*ACH*CTX*01*999999999*DA*12345678*1234567890**01*999999999*DA*87654321*20260228~"
    "TRN*1*987654321*1234567890~"
    "N1*PR*Blue Cross Blue Shield*XV*12345~"
    "N1*PE*Sunshine Orthopedics*XX*1234567893~"
    "CLP*CLM-003*4*600.00*0.00**12*BCBS-HMO-001~"
    "NM1*QC*1*Garcia*Maria~"
    "SVC*HC:27447*600.00*0.00**1~"
    "CAS*CO*50*600.00~"
    "SE*10*0002~"
    "GE*1*2~"
    "IEA*1*000000002~"
)

MOCK_835_NEWLINES = (
    "ISA*00*          *00*          *ZZ*CIGNA          *ZZ*SUNSHINE       "
    "*260228*1200*^*00501*000000003*0*P*:~\n"
    "GS*HP*CIGNA*SUNSHINE*20260228*1200*3*X*005010X221A1~\n"
    "ST*835*0003~\n"
    "BPR*I*300.00*C*ACH*CTX*01*999999999*DA*12345678*1234567890**01*999999999*DA*87654321*20260228~\n"
    "TRN*1*111222333*1234567890~\n"
    "N1*PR*Cigna*XV*99999~\n"
    "N1*PE*Sunshine Orthopedics*XX*1234567893~\n"
    "CLP*CLM-004*1*400.00*300.00**12*CIG-PPO-001~\n"
    "NM1*QC*1*Johnson*Robert~\n"
    "SVC*HC:99213*400.00*300.00**1~\n"
    "CAS*CO*45*100.00~\n"
    "SE*10*0003~\n"
    "GE*1*3~\n"
    "IEA*1*000000003~\n"
)


# ---------------------------------------------------------------------------
# Parser tests
# ---------------------------------------------------------------------------

class TestParseBasic835:
    """Test basic 835 parsing -- payer info, check, claim count."""

    def test_payer_name(self):
        ra = parse_835(MOCK_835_BASIC)
        assert ra.payer_name == "Aetna"

    def test_payer_id(self):
        ra = parse_835(MOCK_835_BASIC)
        assert ra.payer_id == "60054"

    def test_payee_name(self):
        ra = parse_835(MOCK_835_BASIC)
        assert ra.payee_name == "Sunshine Orthopedics"

    def test_check_number(self):
        ra = parse_835(MOCK_835_BASIC)
        assert ra.check_number == "123456789"

    def test_total_paid(self):
        ra = parse_835(MOCK_835_BASIC)
        assert ra.total_paid == 2500.00

    def test_check_date(self):
        ra = parse_835(MOCK_835_BASIC)
        assert ra.check_date == "20260228"

    def test_claim_count(self):
        ra = parse_835(MOCK_835_BASIC)
        assert len(ra.claim_payments) == 2


class TestClaimPayments:
    """Test claim-level payment parsing."""

    @pytest.fixture()
    def remittance(self) -> RemittanceAdvice:
        return parse_835(MOCK_835_BASIC)

    def test_first_claim_id(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].payer_claim_id == "CLM-001"

    def test_first_claim_status(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].claim_status == "1"

    def test_first_claim_charge(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].total_charge == 500.00

    def test_first_claim_paid(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].total_paid == 400.00

    def test_first_claim_patient_name(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].patient_name == "Smith, John"

    def test_second_claim_id(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[1].payer_claim_id == "CLM-002"

    def test_second_claim_paid(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[1].total_paid == 280.00

    def test_second_claim_patient_name(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[1].patient_name == "Doe, Jane"

    def test_first_claim_service_count(self, remittance: RemittanceAdvice):
        assert len(remittance.claim_payments[0].service_payments) == 3

    def test_second_claim_service_count(self, remittance: RemittanceAdvice):
        assert len(remittance.claim_payments[1].service_payments) == 2


class TestServiceAdjustments:
    """Test service-level CAS adjustment parsing."""

    @pytest.fixture()
    def remittance(self) -> RemittanceAdvice:
        return parse_835(MOCK_835_BASIC)

    def test_co_adjustment_on_first_service(self, remittance: RemittanceAdvice):
        svc = remittance.claim_payments[0].service_payments[0]
        co_adjs = [a for a in svc.adjustments if a.group_code == "CO"]
        assert len(co_adjs) == 1
        assert co_adjs[0].reason_code == "45"
        assert co_adjs[0].amount == 30.00

    def test_pr_adjustment_on_second_service(self, remittance: RemittanceAdvice):
        svc = remittance.claim_payments[0].service_payments[1]
        pr_adjs = [a for a in svc.adjustments if a.group_code == "PR"]
        assert len(pr_adjs) == 1
        assert pr_adjs[0].reason_code == "2"
        assert pr_adjs[0].amount == 15.00

    def test_multiple_adjustments_on_third_service(self, remittance: RemittanceAdvice):
        svc = remittance.claim_payments[0].service_payments[2]
        assert len(svc.adjustments) == 2
        group_codes = {a.group_code for a in svc.adjustments}
        assert group_codes == {"CO", "PR"}

    def test_procedure_codes(self, remittance: RemittanceAdvice):
        codes = [s.procedure_code for s in remittance.claim_payments[0].service_payments]
        assert codes == ["99213", "99214", "20610"]

    def test_service_charge_amounts(self, remittance: RemittanceAdvice):
        charges = [s.charge_amount for s in remittance.claim_payments[0].service_payments]
        assert charges == [150.00, 200.00, 150.00]

    def test_service_paid_amounts(self, remittance: RemittanceAdvice):
        paid = [s.paid_amount for s in remittance.claim_payments[0].service_payments]
        assert paid == [120.00, 160.00, 120.00]


class TestDeniedClaim:
    """Test parsing of a denied claim (status 4)."""

    @pytest.fixture()
    def remittance(self) -> RemittanceAdvice:
        return parse_835(MOCK_835_DENIED)

    def test_denied_payer(self, remittance: RemittanceAdvice):
        assert remittance.payer_name == "Blue Cross Blue Shield"

    def test_denied_claim_status(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].claim_status == "4"

    def test_denied_paid_zero(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].total_paid == 0.00

    def test_denied_charge(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].total_charge == 600.00

    def test_denied_adjustment_reason(self, remittance: RemittanceAdvice):
        svc = remittance.claim_payments[0].service_payments[0]
        assert svc.adjustments[0].reason_code == "50"
        assert svc.adjustments[0].amount == 600.00

    def test_denied_patient_name(self, remittance: RemittanceAdvice):
        assert remittance.claim_payments[0].patient_name == "Garcia, Maria"


class TestCARCCodeLookup:
    """Test CARC code description lookup."""

    def test_deductible(self):
        assert "Deductible" in get_carc_description("1")

    def test_coinsurance(self):
        assert "Coinsurance" in get_carc_description("2")

    def test_copay(self):
        assert "Copay" in get_carc_description("3")

    def test_fee_schedule(self):
        assert "fee schedule" in get_carc_description("45").lower()

    def test_non_covered(self):
        assert "non-covered" in get_carc_description("50").lower()

    def test_sequestration(self):
        assert "Sequestration" in get_carc_description("253")

    def test_unknown_code(self):
        desc = get_carc_description("9999")
        assert "Unknown" in desc
        assert "9999" in desc

    def test_all_defined_codes_have_descriptions(self):
        for code in CARC_DESCRIPTIONS:
            assert len(get_carc_description(code)) > 0


class TestSegmentTerminatorVariations:
    """Test that parser handles ~\\n terminators correctly."""

    def test_newline_terminated_segments(self):
        ra = parse_835(MOCK_835_NEWLINES)
        assert ra.payer_name == "Cigna"
        assert ra.check_number == "111222333"
        assert len(ra.claim_payments) == 1
        assert ra.claim_payments[0].total_paid == 300.00

    def test_mixed_terminators(self):
        mixed = MOCK_835_BASIC.replace("~N1*PR", "~\nN1*PR").replace("~CLP*CLM-002", "~\nCLP*CLM-002")
        ra = parse_835(mixed)
        assert len(ra.claim_payments) == 2
        assert ra.payer_name == "Aetna"
