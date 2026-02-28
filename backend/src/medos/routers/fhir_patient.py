"""FHIR R4 Patient resource endpoints.

Implements: POST /Patient, GET /Patient/{id}, GET /Patient?name=...
Per ADR-001: FHIR resources stored as native JSONB in PostgreSQL.
"""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

# In-memory store for demo -- replaced with PostgreSQL JSONB in Sprint 0
_patients: dict[str, dict] = {}


@router.post("/Patient", status_code=201)
async def create_patient(patient: dict):
    """Create a new FHIR Patient resource."""
    resource_id = str(uuid4())
    patient["id"] = resource_id
    patient["resourceType"] = "Patient"
    patient["meta"] = {
        "versionId": "1",
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }
    _patients[resource_id] = patient
    return patient


@router.get("/Patient/{patient_id}")
async def read_patient(patient_id: str):
    """Read a FHIR Patient by ID."""
    patient = _patients.get(patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail={
                "resourceType": "OperationOutcome",
                "issue": [{"severity": "error", "code": "not-found", "diagnostics": f"Patient/{patient_id} not found"}],
            },
        )
    return patient


@router.get("/Patient")
async def search_patients(
    name: str | None = Query(None, description="Patient name (partial match)"),
    birthdate: str | None = Query(None, description="Date of birth (YYYY-MM-DD)"),
    identifier: str | None = Query(None, description="Patient identifier (MRN, SSN-last4)"),
    _count: int = Query(20, alias="_count", description="Page size"),
):
    """Search FHIR Patients by parameters."""
    results = list(_patients.values())

    if name:
        name_lower = name.lower()
        results = [
            p for p in results
            if any(
                name_lower in n.get("family", "").lower() or name_lower in " ".join(n.get("given", [])).lower()
                for n in p.get("name", [])
            )
        ]

    if birthdate:
        results = [p for p in results if p.get("birthDate") == birthdate]

    if identifier:
        results = [
            p for p in results
            if any(identifier in i.get("value", "") for i in p.get("identifier", []))
        ]

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(results),
        "entry": [{"resource": p, "fullUrl": f"Patient/{p['id']}"} for p in results[:_count]],
    }


@router.get("/metadata")
async def capability_statement():
    """FHIR CapabilityStatement -- server capabilities."""
    return {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "kind": "instance",
        "fhirVersion": "4.0.1",
        "format": ["json"],
        "rest": [
            {
                "mode": "server",
                "resource": [
                    {
                        "type": "Patient",
                        "interaction": [
                            {"code": "read"},
                            {"code": "create"},
                            {"code": "search-type"},
                        ],
                        "searchParam": [
                            {"name": "name", "type": "string"},
                            {"name": "birthdate", "type": "date"},
                            {"name": "identifier", "type": "token"},
                        ],
                    }
                ],
            }
        ],
    }
