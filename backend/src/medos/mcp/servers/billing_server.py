"""Billing/Claims MCP Server - 12 tools for revenue cycle management.

Tools:
    billing_check_eligibility  - Verify patient insurance eligibility
    billing_submit_claim       - Submit a claim (requires approval)
    billing_claim_status       - Check claim processing status
    billing_parse_remittance   - Parse X12 835 remittance advice
    billing_denial_lookup      - Look up CARC/RARC denial codes
    billing_submit_appeal      - Submit a claim appeal (requires approval)
    billing_patient_balance    - Get patient balance and payment history
    billing_payer_rules        - Get payer-specific billing rules
    billing_generate_claim     - Generate X12 837P from claim data (requires approval)
    billing_scrub_claim        - Run pre-submission scrubbing rules
    billing_post_payment       - Post X12 835 payment against a claim (requires approval)
    billing_claims_analytics   - Claims pipeline analytics and KPIs
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from medos.mcp.decorators import hipaa_tool
from medos.schemas.agent import AgentType

logger = logging.getLogger(__name__)

_BILLING_AGENTS = [AgentType.BILLING, AgentType.SYSTEM, AgentType.PRIOR_AUTH, AgentType.DENIAL_MANAGEMENT]
_BILLING_WRITE_AGENTS = [AgentType.BILLING, AgentType.SYSTEM]

# ---------------------------------------------------------------------------
# Mock Data
# ---------------------------------------------------------------------------

_MOCK_ELIGIBILITY = {
    "p-001": {
        "patient_id": "p-001",
        "patient_name": "Robert Chen",
        "payer": "Aetna",
        "plan_id": "AET-PPO-2024",
        "plan_type": "PPO",
        "status": "active",
        "effective_date": "2024-01-01",
        "termination_date": None,
        "copay": {"office_visit": 30, "specialist": 50, "er": 250},
        "deductible": {"individual": 1500, "family": 3000, "met": 1200},
        "coinsurance": 0.20,
        "out_of_pocket_max": {"individual": 6000, "met": 3800},
        "prior_auth_required": ["MRI", "CT", "surgery", "DME"],
    },
    "p-002": {
        "patient_id": "p-002",
        "patient_name": "Maria Martinez",
        "payer": "BlueCross BlueShield",
        "plan_id": "BCBS-HMO-2024",
        "plan_type": "HMO",
        "status": "active",
        "effective_date": "2024-03-01",
        "termination_date": None,
        "copay": {"office_visit": 20, "specialist": 40, "er": 200},
        "deductible": {"individual": 1000, "family": 2500, "met": 800},
        "coinsurance": 0.15,
        "out_of_pocket_max": {"individual": 5000, "met": 2100},
        "prior_auth_required": ["MRI", "surgery", "biologics"],
    },
    "p-003": {
        "patient_id": "p-003",
        "patient_name": "Sarah Johnson",
        "payer": "UnitedHealthcare",
        "plan_id": "UHC-EPO-2024",
        "plan_type": "EPO",
        "status": "active",
        "effective_date": "2024-01-01",
        "termination_date": None,
        "copay": {"office_visit": 25, "specialist": 45, "er": 300},
        "deductible": {"individual": 2000, "family": 4000, "met": 500},
        "coinsurance": 0.25,
        "out_of_pocket_max": {"individual": 7500, "met": 1500},
        "prior_auth_required": ["MRI", "CT", "surgery", "DME", "PT_beyond_12"],
    },
    "p-004": {
        "patient_id": "p-004",
        "patient_name": "James Williams",
        "payer": "Cigna",
        "plan_id": "CIG-PPO-2024",
        "plan_type": "PPO",
        "status": "inactive",
        "effective_date": "2023-01-01",
        "termination_date": "2024-12-31",
        "copay": {},
        "deductible": {},
        "coinsurance": 0,
        "out_of_pocket_max": {},
        "prior_auth_required": [],
    },
}

_MOCK_CLAIMS: dict[str, dict[str, Any]] = {
    "CLM-2024-001": {
        "claim_id": "CLM-2024-001",
        "patient_id": "p-001",
        "patient_name": "Robert Chen",
        "provider": "Dr. Sarah Williams",
        "date_of_service": "2024-12-15",
        "status": "paid",
        "billed_amount": 450.00,
        "allowed_amount": 380.00,
        "paid_amount": 304.00,
        "patient_responsibility": 76.00,
        "cpt_codes": ["99214", "73721"],
        "icd10_codes": ["M23.21", "M17.11"],
        "payer": "Aetna",
        "payer_claim_id": "AET-20241215-8832",
    },
    "CLM-2024-002": {
        "claim_id": "CLM-2024-002",
        "patient_id": "p-002",
        "patient_name": "Maria Martinez",
        "provider": "Dr. Sarah Williams",
        "date_of_service": "2025-01-08",
        "status": "pending",
        "billed_amount": 275.00,
        "allowed_amount": None,
        "paid_amount": None,
        "patient_responsibility": None,
        "cpt_codes": ["99213"],
        "icd10_codes": ["M54.5"],
        "payer": "BlueCross BlueShield",
        "payer_claim_id": None,
    },
    "CLM-2024-003": {
        "claim_id": "CLM-2024-003",
        "patient_id": "p-003",
        "patient_name": "Sarah Johnson",
        "provider": "Dr. Sarah Williams",
        "date_of_service": "2025-01-15",
        "status": "denied",
        "billed_amount": 1200.00,
        "allowed_amount": 0,
        "paid_amount": 0,
        "patient_responsibility": 0,
        "cpt_codes": ["99215", "20610"],
        "icd10_codes": ["M19.011"],
        "payer": "UnitedHealthcare",
        "payer_claim_id": "UHC-20250115-4411",
        "denial_code": "CO-4",
        "denial_reason": "The procedure code is inconsistent with the modifier used.",
    },
    "CLM-2024-004": {
        "claim_id": "CLM-2024-004",
        "patient_id": "p-001",
        "patient_name": "Robert Chen",
        "provider": "Dr. Michael Torres",
        "date_of_service": "2025-02-01",
        "status": "denied",
        "billed_amount": 3500.00,
        "allowed_amount": 0,
        "paid_amount": 0,
        "patient_responsibility": 0,
        "cpt_codes": ["29881"],
        "icd10_codes": ["M23.21"],
        "payer": "Aetna",
        "payer_claim_id": "AET-20250201-9944",
        "denial_code": "CO-16",
        "denial_reason": "Claim/service lacks information or has submission/billing error(s).",
    },
    "CLM-2024-005": {
        "claim_id": "CLM-2024-005",
        "patient_id": "p-005",
        "patient_name": "Priya Patel",
        "provider": "Dr. Sarah Williams",
        "date_of_service": "2025-02-10",
        "status": "in_review",
        "billed_amount": 550.00,
        "allowed_amount": None,
        "paid_amount": None,
        "patient_responsibility": None,
        "cpt_codes": ["99214", "97110"],
        "icd10_codes": ["M54.5", "M47.812"],
        "payer": "Aetna",
        "payer_claim_id": "AET-20250210-1122",
    },
}

_CARC_RARC_CODES: dict[str, dict[str, Any]] = {
    "CO-4": {
        "code": "CO-4",
        "group": "CO",
        "group_name": "Contractual Obligations",
        "reason": "The procedure code is inconsistent with the modifier used or a required modifier is missing.",
        "common_fix": "Review modifier usage. Ensure correct modifier (e.g., -25, -59, -LT/RT) is appended.",
        "appeal_success_rate": 0.72,
    },
    "CO-16": {
        "code": "CO-16",
        "group": "CO",
        "group_name": "Contractual Obligations",
        "reason": "Claim/service lacks information or has submission/billing error(s).",
        "common_fix": "Review claim for missing info (auth number, referring provider NPI, etc.) and resubmit.",
        "appeal_success_rate": 0.85,
    },
    "PR-1": {
        "code": "PR-1",
        "group": "PR",
        "group_name": "Patient Responsibility",
        "reason": "Deductible amount.",
        "common_fix": "Patient responsibility. Bill patient for deductible amount.",
        "appeal_success_rate": 0.05,
    },
    "OA-23": {
        "code": "OA-23",
        "group": "OA",
        "group_name": "Other Adjustments",
        "reason": "The impact of prior payer(s) adjudication including payments and/or adjustments.",
        "common_fix": "Review coordination of benefits. Ensure primary payer processed first.",
        "appeal_success_rate": 0.45,
    },
    "CO-197": {
        "code": "CO-197",
        "group": "CO",
        "group_name": "Contractual Obligations",
        "reason": "Precertification/authorization/notification absent.",
        "common_fix": "Obtain retroactive authorization if possible. Submit with auth number.",
        "appeal_success_rate": 0.65,
    },
    "CO-50": {
        "code": "CO-50",
        "group": "CO",
        "group_name": "Contractual Obligations",
        "reason": "These are non-covered services because this is not deemed a medical necessity.",
        "common_fix": "Submit appeal with clinical documentation supporting medical necessity.",
        "appeal_success_rate": 0.55,
    },
}

_PAYER_RULES: dict[str, dict[str, Any]] = {
    "aetna": {
        "payer_id": "60054",
        "name": "Aetna",
        "timely_filing_days": 365,
        "appeal_deadline_days": 180,
        "electronic_submission": True,
        "clearinghouse": "Availity",
        "prior_auth_portal": "https://www.aetna.com/providerportal",
        "common_modifiers": ["-25", "-59", "-76", "-77"],
        "notes": "Requires referring provider NPI for specialist visits",
    },
    "bcbs": {
        "payer_id": "BCBS0",
        "name": "BlueCross BlueShield",
        "timely_filing_days": 180,
        "appeal_deadline_days": 120,
        "electronic_submission": True,
        "clearinghouse": "Availity",
        "prior_auth_portal": "https://provider.bcbs.com",
        "common_modifiers": ["-25", "-59"],
        "notes": "HMO plans require PCP referral for specialist visits",
    },
    "uhc": {
        "payer_id": "87726",
        "name": "UnitedHealthcare",
        "timely_filing_days": 365,
        "appeal_deadline_days": 180,
        "electronic_submission": True,
        "clearinghouse": "Optum/Availity",
        "prior_auth_portal": "https://www.uhcprovider.com",
        "common_modifiers": ["-25", "-59", "-XE", "-XS"],
        "notes": "Strict medical necessity documentation requirements for PT beyond 12 visits",
    },
    "cigna": {
        "payer_id": "62308",
        "name": "Cigna",
        "timely_filing_days": 365,
        "appeal_deadline_days": 180,
        "electronic_submission": True,
        "clearinghouse": "Availity",
        "prior_auth_portal": "https://cignaforhcp.cigna.com",
        "common_modifiers": ["-25", "-59"],
        "notes": "Requires pre-service review for advanced imaging",
    },
}

_PATIENT_BALANCES: dict[str, dict[str, Any]] = {
    "p-001": {
        "patient_id": "p-001",
        "patient_name": "Robert Chen",
        "total_balance": 76.00,
        "payments": [
            {"date": "2024-12-20", "amount": 30.00, "method": "copay_at_visit"},
        ],
        "outstanding_claims": ["CLM-2024-004"],
    },
    "p-002": {
        "patient_id": "p-002",
        "patient_name": "Maria Martinez",
        "total_balance": 0.00,
        "payments": [],
        "outstanding_claims": ["CLM-2024-002"],
    },
    "p-003": {
        "patient_id": "p-003",
        "patient_name": "Sarah Johnson",
        "total_balance": 125.00,
        "payments": [
            {"date": "2025-01-20", "amount": 25.00, "method": "copay_at_visit"},
            {"date": "2025-02-01", "amount": 100.00, "method": "online_payment"},
        ],
        "outstanding_claims": ["CLM-2024-003"],
    },
}


# ---------------------------------------------------------------------------
# Tool Handlers
# ---------------------------------------------------------------------------


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_check_eligibility(patient_id: str = "") -> dict[str, Any]:
    """Verify patient insurance eligibility and coverage details."""
    if not patient_id:
        return {"error": "patient_id is required"}

    eligibility = _MOCK_ELIGIBILITY.get(patient_id)
    if not eligibility:
        return {"error": f"No eligibility data found for patient {patient_id}"}

    return {
        **eligibility,
        "checked_at": datetime.now(UTC).isoformat(),
        "source": "mock_eligibility_service",
    }


@hipaa_tool(
    phi_level="full", allowed_agents=_BILLING_WRITE_AGENTS,
    server="billing", requires_approval=True,
)
async def billing_submit_claim(
    patient_id: str = "",
    encounter_id: str = "",
    cpt_codes: list[str] | None = None,
    icd10_codes: list[str] | None = None,
    provider_npi: str = "",
    billed_amount: float = 0.0,
) -> dict[str, Any]:
    """Submit a new insurance claim. Requires human approval before processing."""
    cpt_codes = cpt_codes or []
    icd10_codes = icd10_codes or []

    claim_id = f"CLM-{datetime.now(UTC).strftime('%Y')}-{uuid4().hex[:3].upper()}"

    claim = {
        "claim_id": claim_id,
        "patient_id": patient_id,
        "encounter_id": encounter_id,
        "cpt_codes": cpt_codes,
        "icd10_codes": icd10_codes,
        "provider_npi": provider_npi,
        "billed_amount": billed_amount,
        "status": "pending_approval",
        "created_at": datetime.now(UTC).isoformat(),
        "requires_approval": True,
        "message": "Claim created and queued for human review before submission to payer.",
    }

    _MOCK_CLAIMS[claim_id] = claim
    logger.info("Created claim %s for patient %s (pending approval)", claim_id, patient_id)
    return claim


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_claim_status(claim_id: str = "") -> dict[str, Any]:
    """Check the processing status of a submitted claim."""
    if not claim_id:
        return {"error": "claim_id is required"}

    claim = _MOCK_CLAIMS.get(claim_id)
    if not claim:
        return {"error": f"Claim {claim_id} not found"}

    return claim


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_parse_remittance(claim_id: str = "") -> dict[str, Any]:
    """Parse X12 835 remittance advice for a claim."""
    claim = _MOCK_CLAIMS.get(claim_id)
    if not claim:
        return {"error": f"Claim {claim_id} not found"}

    if claim["status"] not in ("paid", "denied"):
        return {"error": f"No remittance available for claim in '{claim['status']}' status"}

    return {
        "claim_id": claim_id,
        "payer": claim.get("payer", "Unknown"),
        "payer_claim_id": claim.get("payer_claim_id", ""),
        "date_of_service": claim.get("date_of_service", ""),
        "billed_amount": claim.get("billed_amount", 0),
        "allowed_amount": claim.get("allowed_amount", 0),
        "paid_amount": claim.get("paid_amount", 0),
        "patient_responsibility": claim.get("patient_responsibility", 0),
        "adjustment_codes": [claim.get("denial_code")] if claim.get("denial_code") else [],
        "adjustment_reason": claim.get("denial_reason", ""),
        "status": claim["status"],
        "format": "X12_835_mock",
    }


@hipaa_tool(phi_level="none", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_denial_lookup(denial_code: str = "") -> dict[str, Any]:
    """Look up CARC/RARC denial code details and common fixes."""
    if not denial_code:
        return {"error": "denial_code is required"}

    code_info = _CARC_RARC_CODES.get(denial_code)
    if not code_info:
        return {
            "error": f"Code {denial_code} not found in database",
            "available_codes": list(_CARC_RARC_CODES.keys()),
        }

    return code_info


@hipaa_tool(
    phi_level="full", allowed_agents=_BILLING_WRITE_AGENTS,
    server="billing", requires_approval=True,
)
async def billing_submit_appeal(
    claim_id: str = "",
    appeal_reason: str = "",
    supporting_documents: list[str] | None = None,
) -> dict[str, Any]:
    """Submit an appeal for a denied claim. Requires human approval."""
    supporting_documents = supporting_documents or []
    claim = _MOCK_CLAIMS.get(claim_id)
    if not claim:
        return {"error": f"Claim {claim_id} not found"}

    if claim["status"] != "denied":
        return {"error": f"Cannot appeal claim in '{claim['status']}' status. Only denied claims can be appealed."}

    appeal_id = f"APL-{uuid4().hex[:6].upper()}"
    return {
        "appeal_id": appeal_id,
        "claim_id": claim_id,
        "status": "pending_approval",
        "appeal_reason": appeal_reason,
        "supporting_documents": supporting_documents,
        "created_at": datetime.now(UTC).isoformat(),
        "requires_approval": True,
        "message": "Appeal created and queued for human review before submission to payer.",
    }


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_patient_balance(patient_id: str = "") -> dict[str, Any]:
    """Get patient balance and payment history."""
    if not patient_id:
        return {"error": "patient_id is required"}

    balance = _PATIENT_BALANCES.get(patient_id)
    if not balance:
        return {
            "patient_id": patient_id,
            "total_balance": 0.00,
            "payments": [],
            "outstanding_claims": [],
            "message": "No billing history found",
        }

    return balance


@hipaa_tool(phi_level="none", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_payer_rules(payer_name: str = "") -> dict[str, Any]:
    """Get payer-specific billing rules and requirements."""
    if not payer_name:
        return {
            "available_payers": list(_PAYER_RULES.keys()),
            "message": "Provide a payer_name to get specific rules",
        }

    key = payer_name.lower().replace(" ", "").replace("bluecross", "bcbs").replace("blueShield", "")
    # Fuzzy match
    for k, v in _PAYER_RULES.items():
        if k in key or key in k or key in v["name"].lower():
            return v

    return {
        "error": f"Payer '{payer_name}' not found",
        "available_payers": [v["name"] for v in _PAYER_RULES.values()],
    }


# ---------------------------------------------------------------------------
# Sprint 4 — Claims Pipeline Tools
# ---------------------------------------------------------------------------


@hipaa_tool(
    phi_level="full", allowed_agents=_BILLING_WRITE_AGENTS,
    server="billing", requires_approval=True,
)
async def billing_generate_claim(
    claim_id: str = "",
    patient_id: str = "",
    provider_npi: str = "1234567893",
    provider_name: str = "Sunshine Orthopedics",
    provider_tax_id: str = "12-3456789",
    cpt_codes: list[str] | None = None,
    icd10_codes: list[str] | None = None,
    billed_amount: float = 0.0,
    date_of_service: str = "",
    frequency_code: str = "1",
) -> dict[str, Any]:
    """Generate an X12 837P professional claim from structured claim data. Requires human approval."""
    from medos.billing.x12_837p import generate_837p

    cpt_codes = cpt_codes or []
    icd10_codes = icd10_codes or []

    if not claim_id:
        claim_id = f"CLM-{datetime.now(UTC).strftime('%Y')}-{uuid4().hex[:3].upper()}"
    if not date_of_service:
        date_of_service = datetime.now(UTC).strftime("%Y-%m-%d")

    # Build claim data dict matching x12_837p._dict_to_claim expected format
    patient = _MOCK_ELIGIBILITY.get(patient_id, {})
    patient_name = patient.get("patient_name", "Unknown Patient")
    name_parts = patient_name.split(maxsplit=1)
    first_name = name_parts[0] if name_parts else "Unknown"
    last_name = name_parts[1] if len(name_parts) > 1 else "Patient"

    charge_per_line = billed_amount / max(len(cpt_codes), 1)
    claim_data = {
        "claim_id": claim_id,
        "total_charge": billed_amount,
        "billing_provider": {
            "npi": provider_npi,
            "name": provider_name,
            "tax_id": provider_tax_id,
            "taxonomy_code": "207X00000X",
            "address": {"line1": "100 Palm Ave", "city": "Miami", "state": "FL", "zip_code": "33101"},
        },
        "subscriber": {
            "first_name": first_name,
            "last_name": last_name,
            "member_id": patient.get("plan_id", "UNKNOWN-001"),
            "date_of_birth": "1965-03-15",
            "gender": "M",
        },
        "payer": {
            "payer_id": patient.get("payer", "UNKNOWN"),
            "name": patient.get("payer", "Unknown Payer"),
        },
        "diagnosis_codes": icd10_codes,
        "service_lines": [
            {
                "procedure_code": code,
                "charge_amount": round(charge_per_line, 2),
                "units": 1,
                "service_date": date_of_service,
                "diagnosis_pointers": list(range(1, min(len(icd10_codes), 4) + 1)),
            }
            for code in cpt_codes
        ],
        "service_date": date_of_service,
        "frequency_code": frequency_code,
    }

    try:
        edi_output = generate_837p(claim_data)
        segment_count = edi_output.count("~")
        logger.info("Generated 837P for claim %s (%d segments)", claim_id, segment_count)
        return {
            "claim_id": claim_id,
            "status": "generated",
            "format": "X12_837P_005010X222A1",
            "segment_count": segment_count,
            "edi_preview": edi_output[:500] + ("..." if len(edi_output) > 500 else ""),
            "edi_size_bytes": len(edi_output),
            "requires_approval": True,
            "message": "X12 837P generated. Queued for human review before clearinghouse submission.",
        }
    except (ValueError, KeyError) as exc:
        return {"error": f"Failed to generate 837P: {exc}", "claim_id": claim_id}


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_scrub_claim(
    claim_id: str = "",
    patient_id: str = "",
    provider_npi: str = "",
    cpt_codes: list[str] | None = None,
    icd10_codes: list[str] | None = None,
    billed_amount: float = 0.0,
    date_of_service: str = "",
) -> dict[str, Any]:
    """Run pre-submission scrubbing rules on a claim. Returns findings and denial risk score."""
    from medos.billing.claims_scrubber import scrub_claim

    cpt_codes = cpt_codes or []
    icd10_codes = icd10_codes or []

    if not date_of_service:
        date_of_service = datetime.now(UTC).strftime("%Y-%m-%d")

    # Look up patient data from mock
    patient = _MOCK_ELIGIBILITY.get(patient_id, {})
    charge_per_line = billed_amount / max(len(cpt_codes), 1)

    claim_dict = {
        "claim_id": claim_id or "SCRUB-CHECK",
        "billing_provider": {"npi": provider_npi, "name": "Provider", "tax_id": "00-0000000"},
        "subscriber": {
            "id": patient.get("plan_id", "UNKNOWN"),
            "name": {"first": patient.get("patient_name", "Unknown").split()[0],
                      "last": patient.get("patient_name", "Unknown").split()[-1]},
            "dob": "1965-01-01",
            "gender": "M",
        },
        "payer": {"id": patient.get("payer", "UNK"), "name": patient.get("payer", "Unknown")},
        "diagnoses": [{"code": code} for code in icd10_codes],
        "service_lines": [
            {
                "cpt": code,
                "charge": round(charge_per_line, 2),
                "units": 1,
                "date_of_service": date_of_service,
                "diagnosis_pointers": [1],
            }
            for code in cpt_codes
        ],
        "service_date": date_of_service,
        "submission_date": datetime.now(UTC).strftime("%Y-%m-%d"),
        "total_charges": billed_amount,
        "prior_auth_number": None,
        "frequency_code": "1",
    }

    result = scrub_claim(claim_dict)
    return {
        "claim_id": claim_dict["claim_id"],
        "passed": result.passed,
        "denial_risk_score": result.denial_risk_score,
        "errors": result.errors,
        "warnings": result.warnings,
        "findings": [
            {
                "rule_id": f.rule_id,
                "severity": f.severity.value,
                "category": f.category,
                "description": f.description,
                "remediation": f.remediation,
            }
            for f in result.findings
        ],
        "recommendation": (
            "SUBMIT" if result.passed
            else "FIX_ERRORS" if result.errors > 0
            else "REVIEW_WARNINGS"
        ),
    }


@hipaa_tool(
    phi_level="full", allowed_agents=_BILLING_WRITE_AGENTS,
    server="billing", requires_approval=True,
)
async def billing_post_payment(
    claim_id: str = "",
    edi_835_content: str = "",
) -> dict[str, Any]:
    """Post an X12 835 remittance payment against a claim. Requires human approval."""
    from medos.billing.payment_posting import post_payment
    from medos.billing.x12_835_parser import parse_835

    claim = _MOCK_CLAIMS.get(claim_id)
    if not claim:
        return {"error": f"Claim {claim_id} not found"}

    if not edi_835_content.strip():
        return {"error": "edi_835_content is required (X12 835 EDI string)"}

    try:
        remittance = parse_835(edi_835_content)
    except Exception as exc:
        return {"error": f"Failed to parse 835: {exc}"}

    # Find matching claim payment in the remittance
    matching = None
    for cp in remittance.claim_payments:
        if cp.payer_claim_id == claim_id or cp.payer_claim_id == claim.get("payer_claim_id"):
            matching = cp
            break

    if not matching:
        return {
            "error": f"No matching payment found for claim {claim_id} in 835",
            "claims_in_835": [cp.payer_claim_id for cp in remittance.claim_payments],
        }

    result = post_payment(claim, matching)

    # Update mock claim status
    claim["status"] = result.status
    claim["paid_amount"] = result.payer_paid
    claim["patient_responsibility"] = result.patient_responsibility

    logger.info("Posted payment for %s: %s ($%.2f paid)", claim_id, result.status, result.payer_paid)
    return {
        "claim_id": claim_id,
        "status": result.status,
        "payer_paid": result.payer_paid,
        "patient_responsibility": result.patient_responsibility,
        "write_off": result.write_off,
        "balance_remaining": result.balance_remaining,
        "adjustments": [
            {"group": a.group_code, "reason": a.reason_code, "description": a.description, "amount": a.amount}
            for a in result.adjustments
        ],
        "requires_approval": True,
        "message": "Payment posted. Queued for human review before finalization.",
    }


@hipaa_tool(phi_level="none", allowed_agents=_BILLING_AGENTS, server="billing")
async def billing_claims_analytics() -> dict[str, Any]:
    """Get claims pipeline analytics: clean claim rate, denial breakdown, AR aging, KPIs."""
    claims = list(_MOCK_CLAIMS.values())
    total = len(claims)
    if total == 0:
        return {"error": "No claims data available"}

    paid = [c for c in claims if c["status"] == "paid"]
    denied = [c for c in claims if c["status"] == "denied"]
    pending = [c for c in claims if c["status"] in ("pending", "pending_approval", "in_review")]

    total_billed = sum(c.get("billed_amount", 0) for c in claims)
    total_collected = sum(c.get("paid_amount", 0) or 0 for c in paid)
    total_denied_amount = sum(c.get("billed_amount", 0) for c in denied)

    # Denial breakdown by code
    denial_codes: dict[str, int] = {}
    for c in denied:
        code = c.get("denial_code", "unknown")
        denial_codes[code] = denial_codes.get(code, 0) + 1

    # AR aging buckets (mock since we don't have real dates)
    ar_aging = {
        "0_30_days": len(pending),
        "31_60_days": 0,
        "61_90_days": 0,
        "90_plus_days": 0,
    }

    return {
        "summary": {
            "total_claims": total,
            "clean_claim_rate": round((len(paid) / total) * 100, 1) if total else 0,
            "denial_rate": round((len(denied) / total) * 100, 1) if total else 0,
            "collection_rate": round((total_collected / total_billed) * 100, 1) if total_billed else 0,
        },
        "financial": {
            "total_billed": round(total_billed, 2),
            "total_collected": round(total_collected, 2),
            "total_denied": round(total_denied_amount, 2),
            "outstanding_ar": round(total_billed - total_collected - total_denied_amount, 2),
        },
        "status_breakdown": {
            "paid": len(paid),
            "denied": len(denied),
            "pending": len(pending),
        },
        "denial_by_code": denial_codes,
        "ar_aging": ar_aging,
        "top_denial_reasons": [
            {**_CARC_RARC_CODES[code], "count": count}
            for code, count in sorted(denial_codes.items(), key=lambda x: -x[1])
            if code in _CARC_RARC_CODES
        ][:5],
        "kpis": {
            "avg_days_to_payment": 18.5,
            "first_pass_resolution_rate": 80.0,
            "claims_per_provider_per_day": 12.3,
        },
    }
