"""Billing/Claims MCP Server - 8 tools for revenue cycle management.

Tools:
    billing_check_eligibility  - Verify patient insurance eligibility
    billing_submit_claim       - Submit a claim (requires approval)
    billing_claim_status       - Check claim processing status
    billing_parse_remittance   - Parse X12 835 remittance advice
    billing_denial_lookup      - Look up CARC/RARC denial codes
    billing_submit_appeal      - Submit a claim appeal (requires approval)
    billing_patient_balance    - Get patient balance and payment history
    billing_payer_rules        - Get payer-specific billing rules
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
