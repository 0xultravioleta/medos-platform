"""Payment Posting -- match parsed 835 claim payments to existing claims.

Takes a ClaimPayment from the 835 parser and an internal claim dict,
calculates final balances, and returns a PostingResult.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from medos.billing.x12_835_parser import ClaimPayment, get_carc_description

# ---------------------------------------------------------------------------
# Claim status constants
# ---------------------------------------------------------------------------

STATUS_PROCESSED_PRIMARY = "1"
STATUS_PROCESSED_SECONDARY = "2"
STATUS_DENIED = "4"
STATUS_REVERSAL = "22"


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class AdjustmentDetail:
    """A flattened adjustment for reporting."""

    level: str  # "claim" or "service"
    group_code: str
    reason_code: str
    description: str
    amount: float
    procedure_code: str | None = None


@dataclass
class PostingResult:
    """Result of posting a payment against a claim."""

    claim_id: str
    status: str  # paid, partially_paid, denied, adjusted
    payer_paid: float
    patient_responsibility: float
    adjustments: list[AdjustmentDetail] = field(default_factory=list)
    write_off: float = 0.0
    balance_remaining: float = 0.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _collect_adjustments(claim_payment: ClaimPayment) -> list[AdjustmentDetail]:
    """Flatten all adjustments (claim + service level) into AdjustmentDetail list."""
    details: list[AdjustmentDetail] = []

    for adj in claim_payment.claim_adjustments:
        details.append(
            AdjustmentDetail(
                level="claim",
                group_code=adj.group_code,
                reason_code=adj.reason_code,
                description=get_carc_description(adj.reason_code),
                amount=adj.amount,
            )
        )

    for svc in claim_payment.service_payments:
        for adj in svc.adjustments:
            details.append(
                AdjustmentDetail(
                    level="service",
                    group_code=adj.group_code,
                    reason_code=adj.reason_code,
                    description=get_carc_description(adj.reason_code),
                    amount=adj.amount,
                    procedure_code=svc.procedure_code,
                )
            )

    return details


def _calculate_patient_responsibility(adjustments: list[AdjustmentDetail]) -> float:
    """Sum all PR (Patient Responsibility) adjustments."""
    return sum(a.amount for a in adjustments if a.group_code == "PR")


def _calculate_write_off(adjustments: list[AdjustmentDetail]) -> float:
    """Sum all CO (Contractual Obligation) adjustments -- these are write-offs."""
    return sum(a.amount for a in adjustments if a.group_code == "CO")


def _determine_status(claim_payment: ClaimPayment, balance_remaining: float) -> str:
    """Determine the posting status based on claim status and balance."""
    if claim_payment.claim_status == STATUS_DENIED:
        return "denied"
    if claim_payment.total_paid <= 0:
        return "denied"
    if balance_remaining > 0.005:  # float tolerance
        return "partially_paid"
    return "paid"


# ---------------------------------------------------------------------------
# Main posting function
# ---------------------------------------------------------------------------

def post_payment(claim: dict, claim_payment: ClaimPayment) -> PostingResult:
    """Match a parsed 835 claim payment to an existing claim and post it.

    Parameters
    ----------
    claim : dict
        The internal claim record. Expected keys:
        - ``claim_id`` (str): Internal claim identifier.
        - ``billed_amount`` (float): Original amount billed.
    claim_payment : ClaimPayment
        Parsed 835 payment data for this claim.

    Returns
    -------
    PostingResult
        Detailed breakdown of the posted payment.
    """
    claim_id: str = claim.get("claim_id", "")
    billed_amount: float = claim.get("billed_amount", 0.0)

    adjustments = _collect_adjustments(claim_payment)
    patient_resp = _calculate_patient_responsibility(adjustments)
    write_off = _calculate_write_off(adjustments)

    # Balance remaining = billed - payer_paid - write_off - patient_resp
    balance_remaining = max(0.0, billed_amount - claim_payment.total_paid - write_off - patient_resp)

    status = _determine_status(claim_payment, balance_remaining)

    # For denied claims, the full billed amount remains as balance
    if status == "denied":
        balance_remaining = billed_amount

    return PostingResult(
        claim_id=claim_id,
        status=status,
        payer_paid=claim_payment.total_paid,
        patient_responsibility=patient_resp,
        adjustments=adjustments,
        write_off=write_off,
        balance_remaining=balance_remaining,
    )
