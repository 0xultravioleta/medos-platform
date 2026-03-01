"""X12 837P Professional Claims Generator -- HIPAA 005010X222A1.

Generates valid X12 837P electronic claim files from structured claim data.
Implements the CMS-1500 professional claim in EDI format, supporting original,
corrected, and void claim types.

Reference: ASC X12 005010X222A1 Health Care Claim: Professional

Separators:
    element   = *
    component = :
    segment   = ~
    repetition = ^
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass, field
from datetime import date, datetime

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class Address:
    """Postal address."""

    line1: str
    city: str
    state: str
    zip_code: str
    line2: str = ""


@dataclass
class Provider:
    """Billing or rendering provider."""

    name: str
    npi: str
    tax_id: str
    taxonomy_code: str = "207X00000X"  # Orthopedic Surgery default
    address: Address | None = None
    contact_name: str = ""
    contact_phone: str = ""
    entity_type: str = "2"  # 1=person, 2=organization


@dataclass
class Subscriber:
    """Insurance subscriber (the person on the insurance plan)."""

    first_name: str
    last_name: str
    member_id: str
    group_number: str = ""
    address: Address | None = None
    date_of_birth: date | None = None
    gender: str = ""  # M or F
    payer_responsibility: str = "P"  # P=primary, S=secondary, T=tertiary
    relationship_code: str = "18"  # 18=self
    insurance_type: str = "CI"  # CI=commercial, MB=Medicare Part B, MC=Medicaid, etc.


@dataclass
class Payer:
    """Insurance payer."""

    name: str
    payer_id: str
    address: Address | None = None


@dataclass
class ServiceLine:
    """A single service line on a claim (Loop 2400)."""

    procedure_code: str  # CPT/HCPCS
    charge_amount: float
    units: int = 1
    unit_type: str = "UN"  # UN=unit
    modifiers: list[str] = field(default_factory=list)
    service_date: date | None = None
    diagnosis_pointers: list[int] = field(default_factory=lambda: [1])
    line_item_control: str = ""
    rendering_provider_npi: str = ""


@dataclass
class ClaimData:
    """Complete data for an 837P professional claim."""

    claim_id: str
    total_charge: float
    service_lines: list[ServiceLine]
    billing_provider: Provider
    subscriber: Subscriber
    payer: Payer
    diagnosis_codes: list[str]  # ICD-10 codes

    # Claim metadata
    service_date: date | None = None
    place_of_service: str = "11"  # 11=office, 22=outpatient hospital
    frequency_code: str = "1"  # 1=original, 7=corrected, 8=void
    prior_auth_number: str = ""
    original_reference_number: str = ""  # Required for corrected/void claims

    # Envelope / control numbers (auto-generated if not provided)
    interchange_control: int = 0
    group_control: int = 0
    transaction_control: int = 0

    # Submitter / receiver (defaults to billing provider info)
    submitter_name: str = ""
    submitter_id: str = ""
    submitter_contact_name: str = ""
    submitter_contact_phone: str = ""
    receiver_name: str = ""
    receiver_id: str = ""


# ---------------------------------------------------------------------------
# Control number generator (simple incrementing counter)
# ---------------------------------------------------------------------------

_control_counter = itertools.count(1)


def _next_control() -> int:
    """Return the next control number."""
    return next(_control_counter)


def reset_control_numbers(start: int = 1) -> None:
    """Reset the global control number counter. Useful for testing."""
    global _control_counter
    _control_counter = itertools.count(start)


# ---------------------------------------------------------------------------
# Segment helpers
# ---------------------------------------------------------------------------

ELEMENT_SEP = "*"
COMPONENT_SEP = ":"
SEGMENT_TERM = "~"
REPETITION_SEP = "^"


def _seg(*elements: str) -> str:
    """Build a segment from elements, terminated with ~."""
    return ELEMENT_SEP.join(elements) + SEGMENT_TERM


def _pad(value: str, length: int) -> str:
    """Right-pad a string to a fixed length (for ISA fields)."""
    return value.ljust(length)[:length]


def _date8(d: date | None) -> str:
    """Format a date as CCYYMMDD."""
    if d is None:
        return ""
    return d.strftime("%Y%m%d")


def _time4(dt: datetime | None = None) -> str:
    """Format a time as HHMM."""
    dt = dt or datetime.now()
    return dt.strftime("%H%M")


def _amount(val: float) -> str:
    """Format a monetary amount (no leading zeros, 2 decimal places)."""
    return f"{val:.2f}"


# ---------------------------------------------------------------------------
# Segment builders
# ---------------------------------------------------------------------------

def _build_isa(claim: ClaimData, now: datetime) -> str:
    """ISA - Interchange Control Header."""
    ctrl = claim.interchange_control or _next_control()
    submitter_id = claim.submitter_id or claim.billing_provider.tax_id
    receiver_id = claim.receiver_id or claim.payer.payer_id
    return _seg(
        "ISA",
        "00",                           # ISA01: auth info qualifier (no auth)
        _pad("", 10),                   # ISA02: auth info (blank)
        "00",                           # ISA03: security info qualifier (no security)
        _pad("", 10),                   # ISA04: security info (blank)
        "ZZ",                           # ISA05: sender ID qualifier (mutually defined)
        _pad(submitter_id, 15),         # ISA06: sender ID
        "ZZ",                           # ISA07: receiver ID qualifier
        _pad(receiver_id, 15),          # ISA08: receiver ID
        now.strftime("%y%m%d"),         # ISA09: date YYMMDD
        _time4(now),                    # ISA10: time HHMM
        REPETITION_SEP,                 # ISA11: repetition separator
        "00501",                        # ISA12: version
        str(ctrl).zfill(9),            # ISA13: interchange control number
        "0",                            # ISA14: ack requested (0=no)
        "P",                            # ISA15: usage indicator (P=production)
        COMPONENT_SEP,                  # ISA16: component separator
    )


def _build_gs(claim: ClaimData, now: datetime) -> str:
    """GS - Functional Group Header."""
    ctrl = claim.group_control or _next_control()
    submitter_id = claim.submitter_id or claim.billing_provider.tax_id
    receiver_id = claim.receiver_id or claim.payer.payer_id
    return _seg(
        "GS",
        "HC",                           # GS01: functional ID code (health care claim)
        submitter_id,                   # GS02: sender code
        receiver_id,                    # GS03: receiver code
        now.strftime("%Y%m%d"),         # GS04: date CCYYMMDD
        _time4(now),                    # GS05: time HHMM
        str(ctrl),                      # GS06: group control number
        "X",                            # GS07: responsible agency (X12)
        "005010X222A1",                 # GS08: version
    )


def _build_st(claim: ClaimData) -> str:
    """ST - Transaction Set Header."""
    ctrl = claim.transaction_control or _next_control()
    return _seg("ST", "837", str(ctrl).zfill(4), "005010X222A1")


def _build_bht(claim: ClaimData, now: datetime) -> str:
    """BHT - Beginning of Hierarchical Transaction."""
    # Frequency code mapping for BHT02: 00=original, 18=reissue
    purpose = "00" if claim.frequency_code == "1" else "18"
    return _seg(
        "BHT",
        "0019",                         # BHT01: hierarchical structure code (0019 for 837)
        purpose,                        # BHT02: transaction set purpose
        claim.claim_id,                 # BHT03: reference identification
        now.strftime("%Y%m%d"),         # BHT04: date
        _time4(now),                    # BHT05: time
        "CH",                           # BHT06: transaction type code (CH=chargeable)
    )


def _build_submitter(claim: ClaimData) -> list[str]:
    """Loop 1000A - Submitter Name."""
    segs: list[str] = []
    name = claim.submitter_name or claim.billing_provider.name
    tax_id = claim.submitter_id or claim.billing_provider.tax_id
    segs.append(_seg("NM1", "41", "2", name, "", "", "", "", "46", tax_id))
    contact_name = claim.submitter_contact_name or claim.billing_provider.contact_name or "BILLING DEPT"
    contact_phone = claim.submitter_contact_phone or claim.billing_provider.contact_phone or ""
    if contact_phone:
        segs.append(_seg("PER", "IC", contact_name, "TE", contact_phone))
    else:
        segs.append(_seg("PER", "IC", contact_name))
    return segs


def _build_receiver(claim: ClaimData) -> list[str]:
    """Loop 1000B - Receiver Name."""
    name = claim.receiver_name or claim.payer.name
    payer_id = claim.receiver_id or claim.payer.payer_id
    return [_seg("NM1", "40", "2", name, "", "", "", "", "46", payer_id)]


def _build_billing_provider(claim: ClaimData, hl_id: int) -> list[str]:
    """Loop 2000A/2010AA - Billing Provider."""
    segs: list[str] = []
    prov = claim.billing_provider

    # HL segment - billing provider level
    segs.append(_seg("HL", str(hl_id), "", "20", "1"))

    # PRV - Provider specialty
    segs.append(_seg("PRV", "BI", "PXC", prov.taxonomy_code))

    # NM1 - Billing provider name
    if prov.entity_type == "1":
        # Individual: last*first
        parts = prov.name.split(" ", 1)
        last = parts[-1] if len(parts) > 1 else parts[0]
        first = parts[0] if len(parts) > 1 else ""
        segs.append(_seg("NM1", "85", "1", last, first, "", "", "", "XX", prov.npi))
    else:
        segs.append(_seg("NM1", "85", "2", prov.name, "", "", "", "", "XX", prov.npi))

    # N3/N4 - Address
    if prov.address:
        segs.append(_seg("N3", prov.address.line1))
        segs.append(_seg("N4", prov.address.city, prov.address.state, prov.address.zip_code))

    # REF - Tax ID
    segs.append(_seg("REF", "EI", prov.tax_id))

    return segs


def _build_subscriber(claim: ClaimData, hl_id: int, parent_hl: int) -> list[str]:
    """Loop 2000B/2010BA/2010BB - Subscriber."""
    segs: list[str] = []
    sub = claim.subscriber

    # HL segment - subscriber level (0 = no children since we don't support patient != subscriber)
    segs.append(_seg("HL", str(hl_id), str(parent_hl), "22", "0"))

    # SBR - Subscriber information
    segs.append(_seg(
        "SBR",
        sub.payer_responsibility,       # SBR01: payer responsibility sequence
        sub.relationship_code,          # SBR02: individual relationship code
        sub.group_number,               # SBR03: group/policy number
        "", "", "", "", "",             # SBR04-08: reserved
        sub.insurance_type,             # SBR09: claim filing indicator
    ))

    # NM1 - Subscriber name
    segs.append(_seg(
        "NM1", "IL", "1",
        sub.last_name,
        sub.first_name,
        "", "", "",
        "MI", sub.member_id,
    ))

    # N3/N4 - Subscriber address
    if sub.address:
        segs.append(_seg("N3", sub.address.line1))
        segs.append(_seg("N4", sub.address.city, sub.address.state, sub.address.zip_code))

    # DMG - Demographics
    if sub.date_of_birth:
        segs.append(_seg("DMG", "D8", _date8(sub.date_of_birth), sub.gender))

    # NM1 - Payer name (Loop 2010BB)
    payer = claim.payer
    segs.append(_seg("NM1", "PR", "2", payer.name, "", "", "", "", "PI", payer.payer_id))

    # Payer address
    if payer.address:
        segs.append(_seg("N3", payer.address.line1))
        segs.append(_seg("N4", payer.address.city, payer.address.state, payer.address.zip_code))

    return segs


def _build_claim_info(claim: ClaimData) -> list[str]:
    """Loop 2300 - Claim information."""
    segs: list[str] = []

    # CLM - Claim segment
    # CLM05 is composite: place_of_service:B:frequency_code
    # B = default claim submission reason code (not applicable)
    facility_code = f"{claim.place_of_service}{COMPONENT_SEP}B{COMPONENT_SEP}{claim.frequency_code}"
    segs.append(_seg(
        "CLM",
        claim.claim_id,                 # CLM01: patient control number
        _amount(claim.total_charge),    # CLM02: total claim charge
        "",                             # CLM03: reserved
        "",                             # CLM04: reserved
        facility_code,                  # CLM05: facility code value
        "Y",                            # CLM06: provider signature on file
        "A",                            # CLM07: assignment of benefits (A=assigned)
        "Y",                            # CLM08: benefits assignment certification
        "Y",                            # CLM09: release of information
    ))

    # DTP - Service date(s)
    svc_date = claim.service_date
    if not svc_date and claim.service_lines:
        svc_date = claim.service_lines[0].service_date
    if svc_date:
        segs.append(_seg("DTP", "472", "D8", _date8(svc_date)))

    # REF - Prior authorization number
    if claim.prior_auth_number:
        segs.append(_seg("REF", "G1", claim.prior_auth_number))

    # REF - Original reference number (for corrected/void claims)
    if claim.frequency_code in ("7", "8") and claim.original_reference_number:
        segs.append(_seg("REF", "F8", claim.original_reference_number))

    # HI - Diagnosis codes
    if claim.diagnosis_codes:
        # First diagnosis = principal (ABK qualifier)
        segs.append(_seg("HI", f"ABK{COMPONENT_SEP}{claim.diagnosis_codes[0]}"))
        # Additional diagnoses (ABF qualifier)
        for dx in claim.diagnosis_codes[1:]:
            segs.append(_seg("HI", f"ABF{COMPONENT_SEP}{dx}"))

    return segs


def _build_service_lines(claim: ClaimData) -> list[str]:
    """Loop 2400 - Service line information."""
    segs: list[str] = []

    for idx, line in enumerate(claim.service_lines, start=1):
        # LX - Line counter
        segs.append(_seg("LX", str(idx)))

        # SV1 - Professional service
        # SV1-01 composite: HC:procedure_code[:modifier1[:modifier2...]]
        proc_parts = ["HC", line.procedure_code] + line.modifiers[:4]
        procedure_composite = COMPONENT_SEP.join(proc_parts)

        # SV1-07: diagnosis pointer(s) -- colon-separated
        diag_ptrs = COMPONENT_SEP.join(str(p) for p in line.diagnosis_pointers)

        segs.append(_seg(
            "SV1",
            procedure_composite,            # SV1-01: composite medical procedure
            _amount(line.charge_amount),    # SV1-02: charge amount
            line.unit_type,                 # SV1-03: unit basis (UN=unit)
            str(line.units),                # SV1-04: service unit count
            "",                             # SV1-05: place of service (use claim-level)
            "",                             # SV1-06: reserved
            diag_ptrs,                      # SV1-07: diagnosis code pointer
        ))

        # DTP - Service date for this line
        line_date = line.service_date or claim.service_date
        if line_date:
            segs.append(_seg("DTP", "472", "D8", _date8(line_date)))

        # REF - Line item control number
        if line.line_item_control:
            segs.append(_seg("REF", "6R", line.line_item_control))

    return segs


def _build_se(segment_count: int, claim: ClaimData) -> str:
    """SE - Transaction Set Trailer."""
    ctrl = claim.transaction_control or 0
    # We use the same control number assigned during ST generation
    # The caller passes it through claim.transaction_control after ST is built
    return _seg("SE", str(segment_count), str(ctrl).zfill(4))


def _build_ge(claim: ClaimData) -> str:
    """GE - Functional Group Trailer."""
    ctrl = claim.group_control or 0
    return _seg("GE", "1", str(ctrl))


def _build_iea(claim: ClaimData) -> str:
    """IEA - Interchange Control Trailer."""
    ctrl = claim.interchange_control or 0
    return _seg("IEA", "1", str(ctrl).zfill(9))


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_837p(claim_data: dict | ClaimData, *, timestamp: datetime | None = None) -> str:
    """Generate an X12 837P 005010X222A1 professional claim.

    Args:
        claim_data: Structured claim data, either as a ClaimData dataclass
            or a dict that will be converted to ClaimData.
        timestamp: Optional timestamp override (defaults to now). Useful for
            deterministic test output.

    Returns:
        Complete X12 837P string with ISA/GS/ST envelope and all loops.

    Raises:
        ValueError: If required fields are missing or invalid.
    """
    claim = _dict_to_claim(claim_data) if isinstance(claim_data, dict) else claim_data

    _validate_claim(claim)

    now = timestamp or datetime.now()

    # Assign control numbers if not set
    if not claim.interchange_control:
        claim.interchange_control = _next_control()
    if not claim.group_control:
        claim.group_control = _next_control()
    if not claim.transaction_control:
        claim.transaction_control = _next_control()

    # Build all segments
    segments: list[str] = []

    # Envelope open
    segments.append(_build_isa(claim, now))
    segments.append(_build_gs(claim, now))
    segments.append(_build_st(claim))

    # Transaction content (these count toward SE segment count)
    content: list[str] = []
    content.append(_build_bht(claim, now))
    content.extend(_build_submitter(claim))
    content.extend(_build_receiver(claim))
    content.extend(_build_billing_provider(claim, hl_id=1))
    content.extend(_build_subscriber(claim, hl_id=2, parent_hl=1))
    content.extend(_build_claim_info(claim))
    content.extend(_build_service_lines(claim))

    segments.extend(content)

    # SE counts ST + content + SE itself
    se_count = 1 + len(content) + 1  # ST + content segments + SE
    segments.append(_build_se(se_count, claim))

    # Envelope close
    segments.append(_build_ge(claim))
    segments.append(_build_iea(claim))

    return "\n".join(segments)


# ---------------------------------------------------------------------------
# Dict -> ClaimData converter
# ---------------------------------------------------------------------------

def _parse_date(val: str | date | None) -> date | None:
    """Parse a date from string (YYYY-MM-DD) or return as-is."""
    if val is None:
        return None
    if isinstance(val, date):
        return val
    return date.fromisoformat(val)


def _dict_to_address(data: dict | None) -> Address | None:
    """Convert a dict to Address."""
    if not data:
        return None
    return Address(
        line1=data.get("line1", ""),
        city=data.get("city", ""),
        state=data.get("state", ""),
        zip_code=data.get("zip_code", ""),
        line2=data.get("line2", ""),
    )


def _dict_to_claim(data: dict) -> ClaimData:
    """Convert a plain dict to a ClaimData dataclass."""
    # Provider
    prov_data = data.get("billing_provider", {})
    billing_provider = Provider(
        name=prov_data.get("name", ""),
        npi=prov_data.get("npi", ""),
        tax_id=prov_data.get("tax_id", ""),
        taxonomy_code=prov_data.get("taxonomy_code", "207X00000X"),
        address=_dict_to_address(prov_data.get("address")),
        contact_name=prov_data.get("contact_name", ""),
        contact_phone=prov_data.get("contact_phone", ""),
        entity_type=prov_data.get("entity_type", "2"),
    )

    # Subscriber
    sub_data = data.get("subscriber", {})
    subscriber = Subscriber(
        first_name=sub_data.get("first_name", ""),
        last_name=sub_data.get("last_name", ""),
        member_id=sub_data.get("member_id", ""),
        group_number=sub_data.get("group_number", ""),
        address=_dict_to_address(sub_data.get("address")),
        date_of_birth=_parse_date(sub_data.get("date_of_birth")),
        gender=sub_data.get("gender", ""),
        payer_responsibility=sub_data.get("payer_responsibility", "P"),
        relationship_code=sub_data.get("relationship_code", "18"),
        insurance_type=sub_data.get("insurance_type", "CI"),
    )

    # Payer
    payer_data = data.get("payer", {})
    payer = Payer(
        name=payer_data.get("name", ""),
        payer_id=payer_data.get("payer_id", ""),
        address=_dict_to_address(payer_data.get("address")),
    )

    # Service lines
    lines_data = data.get("service_lines", [])
    service_lines = [
        ServiceLine(
            procedure_code=ln.get("procedure_code", ""),
            charge_amount=float(ln.get("charge_amount", 0)),
            units=int(ln.get("units", 1)),
            unit_type=ln.get("unit_type", "UN"),
            modifiers=ln.get("modifiers", []),
            service_date=_parse_date(ln.get("service_date")),
            diagnosis_pointers=ln.get("diagnosis_pointers", [1]),
            line_item_control=ln.get("line_item_control", ""),
            rendering_provider_npi=ln.get("rendering_provider_npi", ""),
        )
        for ln in lines_data
    ]

    return ClaimData(
        claim_id=data.get("claim_id", ""),
        total_charge=float(data.get("total_charge", 0)),
        service_lines=service_lines,
        billing_provider=billing_provider,
        subscriber=subscriber,
        payer=payer,
        diagnosis_codes=data.get("diagnosis_codes", []),
        service_date=_parse_date(data.get("service_date")),
        place_of_service=data.get("place_of_service", "11"),
        frequency_code=str(data.get("frequency_code", "1")),
        prior_auth_number=data.get("prior_auth_number", ""),
        original_reference_number=data.get("original_reference_number", ""),
        interchange_control=int(data.get("interchange_control", 0)),
        group_control=int(data.get("group_control", 0)),
        transaction_control=int(data.get("transaction_control", 0)),
        submitter_name=data.get("submitter_name", ""),
        submitter_id=data.get("submitter_id", ""),
        submitter_contact_name=data.get("submitter_contact_name", ""),
        submitter_contact_phone=data.get("submitter_contact_phone", ""),
        receiver_name=data.get("receiver_name", ""),
        receiver_id=data.get("receiver_id", ""),
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_claim(claim: ClaimData) -> None:
    """Validate required fields before generating the claim."""
    errors: list[str] = []

    if not claim.claim_id:
        errors.append("claim_id is required")
    if claim.total_charge <= 0:
        errors.append("total_charge must be positive")
    if not claim.service_lines:
        errors.append("at least one service line is required")
    if not claim.billing_provider.npi:
        errors.append("billing_provider.npi is required")
    if not claim.billing_provider.tax_id:
        errors.append("billing_provider.tax_id is required")
    if not claim.subscriber.last_name:
        errors.append("subscriber.last_name is required")
    if not claim.subscriber.member_id:
        errors.append("subscriber.member_id is required")
    if not claim.payer.payer_id:
        errors.append("payer.payer_id is required")
    if not claim.diagnosis_codes:
        errors.append("at least one diagnosis code is required")
    if claim.frequency_code in ("7", "8") and not claim.original_reference_number:
        errors.append("original_reference_number is required for corrected/void claims")

    for i, line in enumerate(claim.service_lines):
        if not line.procedure_code:
            errors.append(f"service_lines[{i}].procedure_code is required")
        if line.charge_amount <= 0:
            errors.append(f"service_lines[{i}].charge_amount must be positive")

    if errors:
        raise ValueError(f"Invalid claim data: {'; '.join(errors)}")
