"""Tenant onboarding wizard endpoints.

Provides a mock onboarding flow for setting up new practices/tenants
in the MedOS platform.

Endpoints:
    POST /api/v1/onboarding/setup        - Create new practice/tenant
    GET  /api/v1/onboarding/specialties   - List supported specialties
    GET  /api/v1/onboarding/payers        - List supported payers
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/onboarding", tags=["Onboarding"])

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

SUPPORTED_SPECIALTIES = [
    {"code": "orthopedics", "display": "Orthopedics"},
    {"code": "dermatology", "display": "Dermatology"},
    {"code": "cardiology", "display": "Cardiology"},
    {"code": "general", "display": "General Practice"},
    {"code": "internal_medicine", "display": "Internal Medicine"},
    {"code": "pediatrics", "display": "Pediatrics"},
    {"code": "neurology", "display": "Neurology"},
    {"code": "oncology", "display": "Oncology"},
    {"code": "psychiatry", "display": "Psychiatry"},
    {"code": "ophthalmology", "display": "Ophthalmology"},
]

SUPPORTED_PAYERS = [
    {"code": "BCBS", "display": "Blue Cross Blue Shield"},
    {"code": "Aetna", "display": "Aetna"},
    {"code": "Medicare", "display": "Medicare"},
    {"code": "Medicaid", "display": "Medicaid"},
    {"code": "Humana", "display": "Humana"},
    {"code": "Cigna", "display": "Cigna"},
    {"code": "UnitedHealthcare", "display": "UnitedHealthcare"},
    {"code": "TriCare", "display": "TRICARE"},
    {"code": "Molina", "display": "Molina Healthcare"},
    {"code": "Centene", "display": "Centene / Ambetter"},
]

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class OnboardingRequest(BaseModel):
    """Request body for practice onboarding setup."""

    organization_name: str
    organization_type: str  # "solo_practice", "group_practice", "hospital"
    specialty: str
    admin_email: str
    admin_name: str
    state: str  # US state code e.g. "FL"
    city: str
    locations: list[dict] = []  # [{name, address, phone}]
    providers: list[dict] = []  # [{name, npi, specialty}]
    payers: list[str] = []  # ["BCBS", "Aetna", ...]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/specialties")
async def list_specialties():
    """Return the list of supported medical specialties."""
    return {"specialties": SUPPORTED_SPECIALTIES}


@router.get("/payers")
async def list_payers():
    """Return the list of supported insurance payers."""
    return {"payers": SUPPORTED_PAYERS}


@router.post("/setup")
async def setup_tenant(request: OnboardingRequest):
    """Create a new practice/tenant (mock implementation for demo).

    Returns a realistic response simulating full tenant provisioning
    including organization, admin user, locations, providers, payers,
    and FHIR resource seeding.
    """
    tenant_id = f"tn-{uuid.uuid4().hex[:8]}"

    location_count = len(request.locations)
    provider_count = len(request.providers)
    payer_count = len(request.payers)

    return {
        "tenant_id": tenant_id,
        "organization": {
            "name": request.organization_name,
            "type": request.organization_type,
            "specialty": request.specialty,
            "state": request.state,
            "city": request.city,
        },
        "admin_user": {
            "email": request.admin_email,
            "name": request.admin_name,
            "role": "admin",
        },
        "setup_status": {
            "organization": "created",
            "admin_user": "created",
            "locations": f"{location_count} configured" if location_count else "none",
            "providers": f"{provider_count} configured" if provider_count else "none",
            "payers": f"{payer_count} linked" if payer_count else "none",
            "fhir_resources": "seeded",
        },
        "next_steps": [
            "Import patient demographics",
            "Configure fee schedules",
            "Set up EHR integration",
        ],
    }
