"""X12 835 Remittance Advice Parser.

Parses X12 835 (Health Care Claim Payment/Advice) EDI content into
structured Python dataclasses for downstream payment posting.

Reference: ASC X12 005010X221A1
"""

from __future__ import annotations

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# CARC (Claim Adjustment Reason Code) lookup -- minimum set for MVP
# ---------------------------------------------------------------------------

CARC_DESCRIPTIONS: dict[str, str] = {
    "1": "Deductible amount",
    "2": "Coinsurance amount",
    "3": "Copay amount",
    "4": "The procedure code is inconsistent with the modifier used or a required modifier is missing",
    "16": "Claim/service lacks information or has submission/billing error(s)",
    "18": "Exact duplicate claim/service",
    "22": "This care may be covered by another payer per coordination of benefits",
    "29": "The time limit for filing has expired",
    "45": "Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement",
    "50": "These are non-covered services because this is not deemed a medical necessity",
    "96": "Non-covered charge(s)",
    "97": "The benefit for this service is included in the payment/allowance for another service/procedure",
    "253": "Sequestration - Loss in reimbursement as mandated by law",
}


def get_carc_description(code: str) -> str:
    """Return human-readable description for a CARC code."""
    return CARC_DESCRIPTIONS.get(code, f"Unknown adjustment reason ({code})")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class ServiceAdjustment:
    """A single CAS (Claim Adjustment Segment) entry at the service level."""

    group_code: str  # CO, PR, OA, PI
    reason_code: str  # CARC code
    amount: float
    quantity: int | None = None


@dataclass
class ServicePayment:
    """SVC segment -- payment detail for one procedure/service line."""

    procedure_code: str
    modifier: str | None
    charge_amount: float
    paid_amount: float
    adjustments: list[ServiceAdjustment] = field(default_factory=list)
    units: int = 1


@dataclass
class ClaimPayment:
    """CLP segment -- claim-level payment information."""

    payer_claim_id: str
    patient_name: str
    claim_status: str  # 1=processed primary, 2=processed secondary, 4=denied, 22=reversal
    total_charge: float
    total_paid: float
    patient_responsibility: float
    service_payments: list[ServicePayment] = field(default_factory=list)
    claim_adjustments: list[ServiceAdjustment] = field(default_factory=list)


@dataclass
class RemittanceAdvice:
    """Top-level 835 remittance advice."""

    payer_name: str
    payer_id: str
    payee_name: str
    payee_id: str
    check_number: str
    check_date: str
    total_paid: float
    claim_payments: list[ClaimPayment] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Segment helpers
# ---------------------------------------------------------------------------

def _split_segments(edi_content: str) -> list[str]:
    """Split raw EDI into segments, handling both ~ and ~\\n terminators."""
    # Normalize: strip whitespace, replace ~\n and ~\r\n with just ~
    cleaned = edi_content.strip()
    cleaned = cleaned.replace("~\r\n", "~").replace("~\n", "~")
    segments = [s.strip() for s in cleaned.split("~") if s.strip()]
    return segments


def _elements(segment: str) -> list[str]:
    """Split a segment into its data elements by '*'."""
    return segment.split("*")


def _parse_cas(elems: list[str]) -> list[ServiceAdjustment]:
    """Parse a CAS segment into one or more ServiceAdjustment instances.

    CAS format: CAS*group*reason1*amount1*qty1*reason2*amount2*qty2*...
    Up to 6 reason/amount/qty triplets per CAS segment.
    """
    group_code = elems[1]
    adjustments: list[ServiceAdjustment] = []
    idx = 2
    while idx < len(elems):
        reason = elems[idx] if idx < len(elems) else None
        if not reason:
            break
        amount_str = elems[idx + 1] if idx + 1 < len(elems) else "0"
        qty_str = elems[idx + 2] if idx + 2 < len(elems) else ""
        adjustments.append(
            ServiceAdjustment(
                group_code=group_code,
                reason_code=reason,
                amount=float(amount_str) if amount_str else 0.0,
                quantity=int(qty_str) if qty_str else None,
            )
        )
        idx += 3
    return adjustments


def _parse_svc(elems: list[str]) -> ServicePayment:
    """Parse an SVC segment into a ServicePayment.

    SVC format: SVC*composite_medical_procedure*charge*paid*...*units
    The composite procedure is sub-delimited by ':' → qualifier:code[:modifier]
    """
    proc_composite = elems[1]
    parts = proc_composite.split(":")
    procedure_code = parts[1] if len(parts) > 1 else parts[0]
    modifier = parts[2] if len(parts) > 2 else None

    charge = float(elems[2]) if len(elems) > 2 and elems[2] else 0.0
    paid = float(elems[3]) if len(elems) > 3 and elems[3] else 0.0
    units = int(elems[6]) if len(elems) > 6 and elems[6] else 1

    return ServicePayment(
        procedure_code=procedure_code,
        modifier=modifier,
        charge_amount=charge,
        paid_amount=paid,
        units=units,
    )


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def parse_835(edi_content: str) -> RemittanceAdvice:
    """Parse X12 835 EDI content into a structured RemittanceAdvice.

    Implements a segment-by-segment state machine that tracks whether we are
    inside a claim (CLP) and routes CAS segments to the correct parent
    (claim-level vs. service-level).
    """
    segments = _split_segments(edi_content)

    # Top-level fields
    payer_name = ""
    payer_id = ""
    payee_name = ""
    payee_id = ""
    check_number = ""
    check_date = ""
    total_paid = 0.0

    # State tracking
    claims: list[ClaimPayment] = []
    current_claim: ClaimPayment | None = None
    current_service: ServicePayment | None = None
    in_service = False  # True when we've seen an SVC inside a CLP

    for raw_segment in segments:
        elems = _elements(raw_segment)
        seg_id = elems[0]

        if seg_id == "BPR":
            # BPR*I*amount*...payment date is the last element
            total_paid = float(elems[2]) if len(elems) > 2 else 0.0
            # Payment date is typically element 16
            if len(elems) > 16 and elems[16]:
                check_date = elems[16]

        elif seg_id == "TRN":
            # TRN*1*check_number*originator_id
            check_number = elems[2] if len(elems) > 2 else ""

        elif seg_id == "N1":
            entity_code = elems[1] if len(elems) > 1 else ""
            name = elems[2] if len(elems) > 2 else ""
            entity_id = elems[4] if len(elems) > 4 else ""

            if entity_code == "PR":
                payer_name = name
                payer_id = entity_id
            elif entity_code == "PE":
                payee_name = name
                payee_id = entity_id

        elif seg_id == "CLP":
            # Finalize previous claim if any
            if current_claim is not None:
                if current_service is not None:
                    current_claim.service_payments.append(current_service)
                claims.append(current_claim)

            # CLP*claim_id*status*charge*paid*patient_resp*plan_code*ref_id
            patient_resp = float(elems[5]) if len(elems) > 5 and elems[5] else 0.0
            current_claim = ClaimPayment(
                payer_claim_id=elems[1] if len(elems) > 1 else "",
                patient_name="",  # Will be set by NM1 segment if present
                claim_status=elems[2] if len(elems) > 2 else "",
                total_charge=float(elems[3]) if len(elems) > 3 and elems[3] else 0.0,
                total_paid=float(elems[4]) if len(elems) > 4 and elems[4] else 0.0,
                patient_responsibility=patient_resp,
            )
            current_service = None
            in_service = False

        elif seg_id == "NM1" and current_claim is not None:
            # NM1*QC*1*LastName*FirstName*...
            entity_type = elems[1] if len(elems) > 1 else ""
            if entity_type == "QC":
                last_name = elems[3] if len(elems) > 3 else ""
                first_name = elems[4] if len(elems) > 4 else ""
                current_claim.patient_name = f"{last_name}, {first_name}".strip(", ")

        elif seg_id == "SVC" and current_claim is not None:
            # Finalize previous service if any
            if current_service is not None:
                current_claim.service_payments.append(current_service)
            current_service = _parse_svc(elems)
            in_service = True

        elif seg_id == "CAS":
            adjustments = _parse_cas(elems)
            if current_claim is not None:
                if in_service and current_service is not None:
                    # Service-level adjustment
                    current_service.adjustments.extend(adjustments)
                else:
                    # Claim-level adjustment (before any SVC in this CLP)
                    current_claim.claim_adjustments.extend(adjustments)

        elif seg_id in ("SE", "GE", "IEA"):
            # Closing segments -- finalize current state
            if current_claim is not None:
                if current_service is not None:
                    current_claim.service_payments.append(current_service)
                    current_service = None
                claims.append(current_claim)
                current_claim = None
            in_service = False

    # Handle edge case: if file ended without SE
    if current_claim is not None:
        if current_service is not None:
            current_claim.service_payments.append(current_service)
        claims.append(current_claim)

    return RemittanceAdvice(
        payer_name=payer_name,
        payer_id=payer_id,
        payee_name=payee_name,
        payee_id=payee_id,
        check_number=check_number,
        check_date=check_date,
        total_paid=total_paid,
        claim_payments=claims,
    )
