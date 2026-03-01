"""Tests for Payment Posting module."""

from __future__ import annotations

import pytest

from medos.billing.payment_posting import AdjustmentDetail, PostingResult, post_payment
from medos.billing.x12_835_parser import (
    ClaimPayment,
    ServiceAdjustment,
    ServicePayment,
    parse_835,
)

# ---------------------------------------------------------------------------
# Helpers to build test fixtures
# ---------------------------------------------------------------------------


def _make_claim_payment(
    *,
    claim_id: str = "CLM-100",
    status: str = "1",
    charge: float = 500.00,
    paid: float = 400.00,
    patient_resp: float = 0.0,
    services: list[ServicePayment] | None = None,
    claim_adjustments: list[ServiceAdjustment] | None = None,
) -> ClaimPayment:
    return ClaimPayment(
        payer_claim_id=claim_id,
        patient_name="Test Patient",
        claim_status=status,
        total_charge=charge,
        total_paid=paid,
        patient_responsibility=patient_resp,
        service_payments=services or [],
        claim_adjustments=claim_adjustments or [],
    )


def _make_service(
    code: str = "99213",
    charge: float = 150.00,
    paid: float = 120.00,
    adjustments: list[ServiceAdjustment] | None = None,
) -> ServicePayment:
    return ServicePayment(
        procedure_code=code,
        modifier=None,
        charge_amount=charge,
        paid_amount=paid,
        adjustments=adjustments or [],
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestPostFullPayment:
    """Claim fully paid -- no remaining balance."""

    def test_status_is_paid(self):
        cp = _make_claim_payment(
            charge=500.00,
            paid=400.00,
            services=[
                _make_service(
                    charge=500.00,
                    paid=400.00,
                    adjustments=[ServiceAdjustment(group_code="CO", reason_code="45", amount=100.00)],
                ),
            ],
        )
        claim = {"claim_id": "INT-001", "billed_amount": 500.00}
        result = post_payment(claim, cp)
        assert result.status == "paid"

    def test_balance_remaining_zero(self):
        cp = _make_claim_payment(
            charge=500.00,
            paid=400.00,
            services=[
                _make_service(
                    charge=500.00,
                    paid=400.00,
                    adjustments=[ServiceAdjustment(group_code="CO", reason_code="45", amount=100.00)],
                ),
            ],
        )
        claim = {"claim_id": "INT-001", "billed_amount": 500.00}
        result = post_payment(claim, cp)
        assert result.balance_remaining == 0.0

    def test_payer_paid_amount(self):
        cp = _make_claim_payment(paid=400.00, services=[
            _make_service(adjustments=[ServiceAdjustment(group_code="CO", reason_code="45", amount=100.00)]),
        ])
        claim = {"claim_id": "INT-001", "billed_amount": 500.00}
        result = post_payment(claim, cp)
        assert result.payer_paid == 400.00


class TestPostPartialPayment:
    """Claim partially paid -- patient owes coinsurance."""

    def test_status_partially_paid(self):
        cp = _make_claim_payment(
            charge=500.00,
            paid=350.00,
            services=[
                _make_service(
                    charge=500.00,
                    paid=350.00,
                    adjustments=[
                        ServiceAdjustment(group_code="CO", reason_code="45", amount=100.00),
                        ServiceAdjustment(group_code="PR", reason_code="2", amount=40.00),
                    ],
                ),
            ],
        )
        claim = {"claim_id": "INT-002", "billed_amount": 500.00}
        result = post_payment(claim, cp)
        # billed=500, paid=350, CO=100, PR=40 → balance = 500-350-100-40 = 10
        assert result.status == "partially_paid"
        assert result.balance_remaining == pytest.approx(10.00)

    def test_patient_responsibility(self):
        cp = _make_claim_payment(
            charge=500.00,
            paid=350.00,
            services=[
                _make_service(
                    adjustments=[
                        ServiceAdjustment(group_code="CO", reason_code="45", amount=100.00),
                        ServiceAdjustment(group_code="PR", reason_code="2", amount=40.00),
                    ],
                ),
            ],
        )
        claim = {"claim_id": "INT-002", "billed_amount": 500.00}
        result = post_payment(claim, cp)
        assert result.patient_responsibility == 40.00


class TestPostDenied:
    """Claim denied -- full balance remaining."""

    def test_denied_status(self):
        cp = _make_claim_payment(
            status="4",
            charge=600.00,
            paid=0.00,
            services=[
                _make_service(
                    code="27447",
                    charge=600.00,
                    paid=0.00,
                    adjustments=[ServiceAdjustment(group_code="CO", reason_code="50", amount=600.00)],
                ),
            ],
        )
        claim = {"claim_id": "INT-003", "billed_amount": 600.00}
        result = post_payment(claim, cp)
        assert result.status == "denied"

    def test_denied_full_balance(self):
        cp = _make_claim_payment(
            status="4",
            charge=600.00,
            paid=0.00,
            services=[
                _make_service(
                    code="27447",
                    charge=600.00,
                    paid=0.00,
                    adjustments=[ServiceAdjustment(group_code="CO", reason_code="50", amount=600.00)],
                ),
            ],
        )
        claim = {"claim_id": "INT-003", "billed_amount": 600.00}
        result = post_payment(claim, cp)
        assert result.balance_remaining == 600.00

    def test_denied_zero_payer_paid(self):
        cp = _make_claim_payment(status="4", paid=0.00, services=[
            _make_service(
                paid=0.00,
                adjustments=[ServiceAdjustment(group_code="CO", reason_code="50", amount=500.00)],
            ),
        ])
        claim = {"claim_id": "INT-003", "billed_amount": 500.00}
        result = post_payment(claim, cp)
        assert result.payer_paid == 0.00


class TestPatientResponsibilityCalc:
    """Test copay + coinsurance + deductible calculations."""

    def test_copay_plus_coinsurance_plus_deductible(self):
        cp = _make_claim_payment(
            charge=1000.00,
            paid=600.00,
            services=[
                _make_service(
                    code="99215",
                    charge=1000.00,
                    paid=600.00,
                    adjustments=[
                        ServiceAdjustment(group_code="PR", reason_code="1", amount=100.00),  # deductible
                        ServiceAdjustment(group_code="PR", reason_code="2", amount=80.00),   # coinsurance
                        ServiceAdjustment(group_code="PR", reason_code="3", amount=40.00),   # copay
                        ServiceAdjustment(group_code="CO", reason_code="45", amount=180.00), # write-off
                    ],
                ),
            ],
        )
        claim = {"claim_id": "INT-004", "billed_amount": 1000.00}
        result = post_payment(claim, cp)

        # PR total = 100 + 80 + 40 = 220
        assert result.patient_responsibility == pytest.approx(220.00)
        # CO total = 180
        assert result.write_off == pytest.approx(180.00)
        # balance = 1000 - 600 - 180 - 220 = 0
        assert result.balance_remaining == pytest.approx(0.00)
        assert result.status == "paid"

    def test_adjustments_detail_list(self):
        cp = _make_claim_payment(
            charge=500.00,
            paid=350.00,
            services=[
                _make_service(
                    adjustments=[
                        ServiceAdjustment(group_code="CO", reason_code="45", amount=100.00),
                        ServiceAdjustment(group_code="PR", reason_code="2", amount=50.00),
                    ],
                ),
            ],
        )
        claim = {"claim_id": "INT-005", "billed_amount": 500.00}
        result = post_payment(claim, cp)
        assert len(result.adjustments) == 2
        reason_codes = {a.reason_code for a in result.adjustments}
        assert reason_codes == {"45", "2"}


class TestWriteOff:
    """Test CO (contractual obligation) write-off calculation."""

    def test_write_off_amount(self):
        cp = _make_claim_payment(
            charge=300.00,
            paid=250.00,
            services=[
                _make_service(
                    charge=300.00,
                    paid=250.00,
                    adjustments=[ServiceAdjustment(group_code="CO", reason_code="45", amount=50.00)],
                ),
            ],
        )
        claim = {"claim_id": "INT-006", "billed_amount": 300.00}
        result = post_payment(claim, cp)
        assert result.write_off == 50.00
        assert result.balance_remaining == 0.00


class TestIntegrationWith835Parser:
    """End-to-end: parse 835 → post payments."""

    MOCK_835 = (
        "ISA*00*          *00*          *ZZ*AETNA          *ZZ*SUNSHINE       "
        "*260228*1200*^*00501*000000001*0*P*:~"
        "GS*HP*AETNA*SUNSHINE*20260228*1200*1*X*005010X221A1~"
        "ST*835*0001~"
        "BPR*I*400.00*C*ACH*CTX*01*999999999*DA*12345678*1234567890**01*999999999*DA*87654321*20260228~"
        "TRN*1*555666777*1234567890~"
        "N1*PR*Aetna*XV*60054~"
        "N1*PE*Sunshine Orthopedics*XX*1234567893~"
        "CLP*CLM-E2E*1*500.00*400.00**12*AET-PPO-E2E~"
        "NM1*QC*1*TestLast*TestFirst~"
        "SVC*HC:99213*250.00*200.00**1~"
        "CAS*CO*45*50.00~"
        "SVC*HC:99214*250.00*200.00**1~"
        "CAS*CO*45*30.00~"
        "CAS*PR*2*20.00~"
        "SE*12*0001~"
        "GE*1*1~"
        "IEA*1*000000001~"
    )

    def test_parse_then_post(self):
        ra = parse_835(self.MOCK_835)
        cp = ra.claim_payments[0]
        claim = {"claim_id": "INT-E2E", "billed_amount": 500.00}
        result = post_payment(claim, cp)

        assert result.claim_id == "INT-E2E"
        assert result.payer_paid == 400.00
        assert result.patient_responsibility == pytest.approx(20.00)
        assert result.write_off == pytest.approx(80.00)
        assert result.balance_remaining == pytest.approx(0.00)
        assert result.status == "paid"
