"""FHIR MCP Server - 15 tools for FHIR R4 resource access.

Wraps the existing FHIRService/FHIRRepository to expose FHIR
operations as MCP tools for AI agents.

Tools:
    fhir_read          - Read a single FHIR resource
    fhir_search        - Search resources with FHIR search params
    fhir_create        - Create a new FHIR resource
    fhir_update        - Update an existing FHIR resource
    fhir_history       - Get version history for a resource
    fhir_validate      - Validate a FHIR resource
    fhir_search_bundle - Search and return a FHIR Bundle
    fhir_patient_everything - $everything operation for Patient
    fhir_encounter_summary  - Summarize an encounter's resources
    fhir_audit_log     - Query audit events
    fhir_provenance_create  - Create provenance for AI output
    fhir_batch         - Execute multiple operations in a batch
    fhir_create_claim_response - Create a ClaimResponse resource
    fhir_create_eob    - Create an ExplanationOfBenefit resource
    fhir_search_eob    - Search ExplanationOfBenefit resources
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from medos.mcp.decorators import hipaa_tool
from medos.schemas.agent import AgentType

logger = logging.getLogger(__name__)

# In-memory FHIR store for development (same pattern as mock_api)
# In production, this connects to PostgreSQL via FHIRRepository
_fhir_store: dict[str, dict[str, dict]] = {}  # {resource_type: {id: resource}}

# Agent types that can access FHIR tools
_FHIR_AGENTS = [AgentType.CLINICAL_SCRIBE, AgentType.SYSTEM, AgentType.PRIOR_AUTH, AgentType.DENIAL_MANAGEMENT]
_CLINICAL_AGENTS = [AgentType.CLINICAL_SCRIBE, AgentType.SYSTEM]
_BILLING_AGENTS = [AgentType.BILLING, AgentType.SYSTEM]
_BILLING_READ_AGENTS = [AgentType.BILLING, AgentType.CLINICAL_SCRIBE, AgentType.SYSTEM]

# Reusable FHIR coding for claim type (professional)
_CLAIM_TYPE_PROFESSIONAL = {
    "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "professional",
        "display": "Professional",
    }],
}


def _usd(value: float) -> dict:
    """Return a FHIR Money dict for a USD amount."""
    return {"value": value, "currency": "USD"}


def _total_entry(code: str, display: str, value: float) -> dict:
    """Return a single FHIR total entry for EOB."""
    return {
        "category": {"coding": [{"code": code, "display": display}]},
        "amount": _usd(value),
    }


def _get_store(resource_type: str) -> dict[str, dict]:
    """Get or create the in-memory store for a resource type."""
    if resource_type not in _fhir_store:
        _fhir_store[resource_type] = {}
    return _fhir_store[resource_type]


def _seed_demo_patients() -> None:
    """Seed the FHIR store with demo patients for development."""
    patients = _get_store("Patient")
    if patients:
        return  # already seeded

    demo_patients = [
        {
            "id": "p-001",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Chen", "given": ["Robert"], "use": "official"}],
            "gender": "male",
            "birthDate": "1958-03-15",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-001"}
            ],
            "telecom": [{"system": "phone", "value": "555-0101"}],
            "address": [{"city": "Miami", "state": "FL", "postalCode": "33101"}],
        },
        {
            "id": "p-002",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Martinez", "given": ["Maria"], "use": "official"}],
            "gender": "female",
            "birthDate": "1985-07-22",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-002"}
            ],
            "telecom": [{"system": "phone", "value": "555-0102"}],
            "address": [{"city": "Fort Lauderdale", "state": "FL", "postalCode": "33301"}],
        },
        {
            "id": "p-003",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Johnson", "given": ["Sarah"], "use": "official"}],
            "gender": "female",
            "birthDate": "1972-11-08",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-003"}
            ],
            "telecom": [{"system": "phone", "value": "555-0103"}],
            "address": [{"city": "Orlando", "state": "FL", "postalCode": "32801"}],
        },
        {
            "id": "p-004",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Williams", "given": ["James", "D."], "use": "official"}],
            "gender": "male",
            "birthDate": "1990-01-30",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-004"}
            ],
            "telecom": [{"system": "phone", "value": "555-0104"}],
            "address": [{"city": "Tampa", "state": "FL", "postalCode": "33602"}],
        },
        {
            "id": "p-005",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Patel", "given": ["Priya"], "use": "official"}],
            "gender": "female",
            "birthDate": "1968-05-14",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-005"}
            ],
            "telecom": [{"system": "phone", "value": "555-0105"}],
            "address": [{"city": "Jacksonville", "state": "FL", "postalCode": "32202"}],
        },
        {
            "id": "p-006",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Thompson", "given": ["David"], "use": "official"}],
            "gender": "male",
            "birthDate": "1945-09-20",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-006"}
            ],
            "telecom": [{"system": "phone", "value": "555-0106"}],
            "address": [{"city": "Naples", "state": "FL", "postalCode": "34102"}],
        },
    ]

    # Additional patients with richer clinical data
    demo_patients.extend([
        {
            "id": "p-007",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Wilson", "given": ["James"], "use": "official"}],
            "gender": "male",
            "birthDate": "1971-04-10",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-007"}
            ],
            "telecom": [{"system": "phone", "value": "555-0107"}],
            "address": [{"city": "Coral Gables", "state": "FL", "postalCode": "33134"}],
        },
        {
            "id": "p-008",
            "resourceType": "Patient",
            "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
            "name": [{"family": "Park", "given": ["Lisa"], "use": "official"}],
            "gender": "female",
            "birthDate": "1984-08-22",
            "identifier": [
                {"system": "https://medos.health/mrn", "value": "MRN-2024-008"}
            ],
            "telecom": [{"system": "phone", "value": "555-0108"}],
            "address": [{"city": "Boca Raton", "state": "FL", "postalCode": "33431"}],
        },
    ])

    for patient in demo_patients:
        patients[patient["id"]] = patient

    # Seed Conditions for p-007 (diabetes + hypertension)
    conditions = _get_store("Condition")
    conditions["cond-007-1"] = {
        "id": "cond-007-1",
        "resourceType": "Condition",
        "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
        "clinicalStatus": {"coding": [{"code": "active", "display": "Active"}]},
        "verificationStatus": {"coding": [{"code": "confirmed", "display": "Confirmed"}]},
        "category": [{"coding": [{"code": "encounter-diagnosis", "display": "Encounter Diagnosis"}]}],
        "code": {
            "coding": [{
                "system": "http://hl7.org/fhir/sid/icd-10-cm",
                "code": "E11.9",
                "display": "Type 2 diabetes mellitus without complications",
            }],
            "text": "Type 2 Diabetes Mellitus",
        },
        "subject": {"reference": "Patient/p-007"},
        "onsetDateTime": "2018-06-15",
    }
    conditions["cond-007-2"] = {
        "id": "cond-007-2",
        "resourceType": "Condition",
        "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
        "clinicalStatus": {"coding": [{"code": "active", "display": "Active"}]},
        "verificationStatus": {"coding": [{"code": "confirmed", "display": "Confirmed"}]},
        "category": [{"coding": [{"code": "encounter-diagnosis", "display": "Encounter Diagnosis"}]}],
        "code": {
            "coding": [{
                "system": "http://hl7.org/fhir/sid/icd-10-cm",
                "code": "I10",
                "display": "Essential (primary) hypertension",
            }],
            "text": "Essential Hypertension",
        },
        "subject": {"reference": "Patient/p-007"},
        "onsetDateTime": "2019-03-22",
    }

    # Seed Conditions for p-008 (asthma)
    conditions["cond-008-1"] = {
        "id": "cond-008-1",
        "resourceType": "Condition",
        "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
        "clinicalStatus": {"coding": [{"code": "active", "display": "Active"}]},
        "verificationStatus": {"coding": [{"code": "confirmed", "display": "Confirmed"}]},
        "category": [{"coding": [{"code": "encounter-diagnosis", "display": "Encounter Diagnosis"}]}],
        "code": {
            "coding": [{
                "system": "http://hl7.org/fhir/sid/icd-10-cm",
                "code": "J45.20",
                "display": "Mild intermittent asthma, uncomplicated",
            }],
            "text": "Mild Intermittent Asthma",
        },
        "subject": {"reference": "Patient/p-008"},
        "onsetDateTime": "2010-11-05",
    }

    # Seed Encounters for p-007 (2 encounters)
    encounters = _get_store("Encounter")
    encounters["enc-007-1"] = {
        "id": "enc-007-1",
        "resourceType": "Encounter",
        "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
        "status": "finished",
        "class": {"code": "AMB", "display": "ambulatory"},
        "type": [{"coding": [{"code": "99214", "display": "Office visit, established patient"}]}],
        "subject": {"reference": "Patient/p-007"},
        "participant": [{"individual": {"reference": "Practitioner/prov-001", "display": "Dr. Sarah Williams"}}],
        "period": {"start": "2025-01-20T09:00:00Z", "end": "2025-01-20T09:30:00Z"},
        "reasonCode": [{"text": "Diabetes follow-up, A1C review"}],
    }
    encounters["enc-007-2"] = {
        "id": "enc-007-2",
        "resourceType": "Encounter",
        "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
        "status": "finished",
        "class": {"code": "AMB", "display": "ambulatory"},
        "type": [{"coding": [{"code": "99213", "display": "Office visit, established patient"}]}],
        "subject": {"reference": "Patient/p-007"},
        "participant": [{"individual": {"reference": "Practitioner/prov-002", "display": "Dr. Michael Torres"}}],
        "period": {"start": "2025-02-15T14:00:00Z", "end": "2025-02-15T14:30:00Z"},
        "reasonCode": [{"text": "Hypertension medication adjustment"}],
    }

    # Seed Encounter for p-008 (1 encounter)
    encounters["enc-008-1"] = {
        "id": "enc-008-1",
        "resourceType": "Encounter",
        "meta": {"versionId": "1", "lastUpdated": datetime.now(UTC).isoformat()},
        "status": "finished",
        "class": {"code": "AMB", "display": "ambulatory"},
        "type": [{"coding": [{"code": "99213", "display": "Office visit, established patient"}]}],
        "subject": {"reference": "Patient/p-008"},
        "participant": [{"individual": {"reference": "Practitioner/prov-001", "display": "Dr. Sarah Williams"}}],
        "period": {"start": "2025-02-20T10:00:00Z", "end": "2025-02-20T10:30:00Z"},
        "reasonCode": [{"text": "Asthma follow-up, peak flow review"}],
    }

    # Seed ClaimResponses
    now = datetime.now(UTC).isoformat()
    claim_responses = _get_store("ClaimResponse")
    claim_responses["cr-001"] = {
        "id": "cr-001",
        "resourceType": "ClaimResponse",
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": "active",
        "type": _CLAIM_TYPE_PROFESSIONAL,
        "use": "claim",
        "patient": {"reference": "Patient/p-007"},
        "created": now,
        "insurer": {"display": "Aetna"},
        "request": {"reference": "Claim/clm-007-1"},
        "outcome": "complete",
        "disposition": "Claim processed successfully",
        "payment": {"amount": _usd(175.00)},
    }
    claim_responses["cr-002"] = {
        "id": "cr-002",
        "resourceType": "ClaimResponse",
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": "active",
        "type": _CLAIM_TYPE_PROFESSIONAL,
        "use": "claim",
        "patient": {"reference": "Patient/p-008"},
        "created": now,
        "insurer": {"display": "Blue Cross Blue Shield"},
        "request": {"reference": "Claim/clm-008-1"},
        "outcome": "partial",
        "disposition": "Partial payment - out of network provider",
        "payment": {"amount": _usd(90.00)},
    }

    # Seed ExplanationOfBenefits
    eobs = _get_store("ExplanationOfBenefit")
    eobs["eob-001"] = {
        "id": "eob-001",
        "resourceType": "ExplanationOfBenefit",
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": "active",
        "type": _CLAIM_TYPE_PROFESSIONAL,
        "use": "claim",
        "patient": {"reference": "Patient/p-007"},
        "created": now,
        "insurer": {"display": "Aetna"},
        "claim": {"reference": "Claim/clm-007-1"},
        "outcome": "complete",
        "total": [
            _total_entry("submitted", "Submitted Amount", 250.00),
            _total_entry("benefit", "Benefit Amount", 175.00),
            _total_entry("copay", "Patient Co-Payment", 75.00),
        ],
    }
    eobs["eob-002"] = {
        "id": "eob-002",
        "resourceType": "ExplanationOfBenefit",
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": "active",
        "type": _CLAIM_TYPE_PROFESSIONAL,
        "use": "claim",
        "patient": {"reference": "Patient/p-008"},
        "created": now,
        "insurer": {"display": "Blue Cross Blue Shield"},
        "claim": {"reference": "Claim/clm-008-1"},
        "outcome": "partial",
        "total": [
            _total_entry("submitted", "Submitted Amount", 150.00),
            _total_entry("benefit", "Benefit Amount", 90.00),
            _total_entry("copay", "Patient Co-Payment", 60.00),
        ],
    }
    eobs["eob-003"] = {
        "id": "eob-003",
        "resourceType": "ExplanationOfBenefit",
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": "active",
        "type": _CLAIM_TYPE_PROFESSIONAL,
        "use": "claim",
        "patient": {"reference": "Patient/p-007"},
        "created": now,
        "insurer": {"display": "Aetna"},
        "claim": {"reference": "Claim/clm-007-2"},
        "outcome": "complete",
        "total": [
            _total_entry("submitted", "Submitted Amount", 180.00),
            _total_entry("benefit", "Benefit Amount", 145.00),
            _total_entry("copay", "Patient Co-Payment", 35.00),
        ],
    }


# ---------------------------------------------------------------------------
# Tool Handlers (decorated with @hipaa_tool)
# ---------------------------------------------------------------------------


@hipaa_tool(phi_level="limited", allowed_agents=_FHIR_AGENTS, server="fhir")
async def fhir_read(resource_type: str = "Patient", resource_id: str = "") -> dict[str, Any]:
    """Read a single FHIR resource by type and ID."""
    if not resource_id:
        return {"error": "resource_id is required"}

    store = _get_store(resource_type)
    resource = store.get(resource_id)

    if not resource:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "not-found",
                    "diagnostics": f"{resource_type}/{resource_id} not found",
                }
            ],
        }

    return resource


@hipaa_tool(phi_level="limited", allowed_agents=_FHIR_AGENTS, server="fhir")
async def fhir_search(
    resource_type: str = "Patient",
    query: dict[str, Any] | None = None,
    count: int = 20,
) -> dict[str, Any]:
    """Search FHIR resources with query parameters."""
    query = query or {}
    store = _get_store(resource_type)
    results = list(store.values())

    # Apply search filters
    if "name" in query:
        name_lower = query["name"].lower()
        results = [
            r
            for r in results
            if any(
                name_lower in n.get("family", "").lower()
                or any(name_lower in g.lower() for g in n.get("given", []))
                for n in r.get("name", [])
            )
        ]

    if "birthdate" in query:
        results = [r for r in results if r.get("birthDate") == query["birthdate"]]

    if "identifier" in query:
        ident_lower = query["identifier"].lower()
        results = [
            r
            for r in results
            if any(
                ident_lower in i.get("value", "").lower()
                for i in r.get("identifier", [])
            )
        ]

    if "gender" in query:
        results = [r for r in results if r.get("gender") == query["gender"]]

    total = len(results)
    results = results[:count]

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": total,
        "entry": [
            {"resource": r, "fullUrl": f"{resource_type}/{r['id']}"}
            for r in results
        ],
    }


@hipaa_tool(
    phi_level="full", allowed_agents=_CLINICAL_AGENTS, server="fhir", requires_approval=True,
)
async def fhir_create(resource_type: str = "", resource: dict[str, Any] | None = None) -> dict[str, Any]:
    """Create a new FHIR resource."""
    resource = resource or {}
    if not resource_type:
        return {"error": "resource_type is required"}

    resource_id = str(uuid4())
    resource["id"] = resource_id
    resource["resourceType"] = resource_type
    resource["meta"] = {
        "versionId": "1",
        "lastUpdated": datetime.now(UTC).isoformat(),
    }

    store = _get_store(resource_type)
    store[resource_id] = resource

    logger.info("Created %s/%s via MCP", resource_type, resource_id)
    return resource


@hipaa_tool(
    phi_level="full", allowed_agents=_CLINICAL_AGENTS, server="fhir", requires_approval=True,
)
async def fhir_update(
    resource_type: str = "",
    resource_id: str = "",
    resource: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Update an existing FHIR resource."""
    resource = resource or {}
    store = _get_store(resource_type)
    existing = store.get(resource_id)
    if not existing:
        return {"error": f"{resource_type}/{resource_id} not found"}

    current_version = int(existing.get("meta", {}).get("versionId", "1"))
    resource["id"] = resource_id
    resource["resourceType"] = resource_type
    resource["meta"] = {
        "versionId": str(current_version + 1),
        "lastUpdated": datetime.now(UTC).isoformat(),
    }

    store[resource_id] = resource
    logger.info("Updated %s/%s to v%s via MCP", resource_type, resource_id, current_version + 1)
    return resource


@hipaa_tool(phi_level="limited", allowed_agents=_FHIR_AGENTS, server="fhir")
async def fhir_history(resource_type: str = "Patient", resource_id: str = "") -> dict[str, Any]:
    """Get version history for a resource (simplified - returns current only)."""
    store = _get_store(resource_type)
    resource = store.get(resource_id)

    if not resource:
        return {"error": f"{resource_type}/{resource_id} not found"}

    return {
        "resourceType": "Bundle",
        "type": "history",
        "total": 1,
        "entry": [
            {
                "resource": resource,
                "request": {"method": "GET", "url": f"{resource_type}/{resource_id}"},
            }
        ],
    }


@hipaa_tool(phi_level="none", allowed_agents=_FHIR_AGENTS, server="fhir")
async def fhir_validate(resource: dict[str, Any] | None = None) -> dict[str, Any]:
    """Validate a FHIR resource structure."""
    resource = resource or {}
    issues: list[dict] = []

    if "resourceType" not in resource:
        issues.append({
            "severity": "error",
            "code": "required",
            "diagnostics": "Missing required field: resourceType",
        })

    resource_type = resource.get("resourceType", "")

    if resource_type == "Patient" and not resource.get("name"):
        issues.append({
            "severity": "warning",
            "code": "business-rule",
            "diagnostics": "Patient should have at least one name",
        })

    if not issues:
        issues.append({
            "severity": "information",
            "code": "informational",
            "diagnostics": "Resource is valid",
        })

    return {
        "resourceType": "OperationOutcome",
        "issue": issues,
    }


@hipaa_tool(phi_level="limited", allowed_agents=_FHIR_AGENTS, server="fhir")
async def fhir_search_bundle(
    resource_type: str = "Patient",
    query: dict[str, Any] | None = None,
    count: int = 20,
) -> dict[str, Any]:
    """Search and return a complete FHIR Bundle (alias for fhir_search)."""
    return await fhir_search(resource_type=resource_type, query=query, count=count)


@hipaa_tool(phi_level="full", allowed_agents=_CLINICAL_AGENTS, server="fhir")
async def fhir_patient_everything(patient_id: str = "") -> dict[str, Any]:
    """$everything operation - return all resources for a patient."""
    patients = _get_store("Patient")
    patient = patients.get(patient_id)
    if not patient:
        return {"error": f"Patient/{patient_id} not found"}

    entries = [{"resource": patient, "fullUrl": f"Patient/{patient_id}"}]

    for resource_type in ["Condition", "Observation", "Encounter", "MedicationRequest"]:
        store = _get_store(resource_type)
        for r in store.values():
            subject_ref = r.get("subject", {}).get("reference", "")
            if subject_ref == f"Patient/{patient_id}":
                entries.append({
                    "resource": r,
                    "fullUrl": f"{resource_type}/{r['id']}",
                })

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }


@hipaa_tool(phi_level="full", allowed_agents=_CLINICAL_AGENTS, server="fhir")
async def fhir_encounter_summary(encounter_id: str = "") -> dict[str, Any]:
    """Summarize all resources linked to an encounter."""
    encounters = _get_store("Encounter")
    encounter = encounters.get(encounter_id)
    if not encounter:
        return {"error": f"Encounter/{encounter_id} not found"}

    linked: list[dict] = [encounter]
    for resource_type in ["Observation", "Condition", "Procedure", "DiagnosticReport"]:
        store = _get_store(resource_type)
        for r in store.values():
            enc_ref = r.get("encounter", {}).get("reference", "")
            if enc_ref == f"Encounter/{encounter_id}":
                linked.append(r)

    return {
        "encounter_id": encounter_id,
        "status": encounter.get("status", "unknown"),
        "resource_count": len(linked),
        "resources": linked,
    }


@hipaa_tool(phi_level="none", allowed_agents=_FHIR_AGENTS, server="fhir")
async def fhir_audit_log(count: int = 20) -> dict[str, Any]:
    """Query audit events (returns from in-memory store)."""
    store = _get_store("AuditEvent")

    events = list(store.values())
    events.sort(key=lambda e: e.get("recorded", ""), reverse=True)

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(events),
        "entry": [
            {"resource": e, "fullUrl": f"AuditEvent/{e['id']}"}
            for e in events[:count]
        ],
    }


@hipaa_tool(phi_level="limited", allowed_agents=_CLINICAL_AGENTS, server="fhir")
async def fhir_provenance_create(provenance: dict[str, Any] | None = None) -> dict[str, Any]:
    """Create a FHIR Provenance resource for AI-generated content."""
    provenance = provenance or {}
    provenance_id = str(uuid4())
    provenance["id"] = provenance_id
    provenance["resourceType"] = "Provenance"
    provenance["recorded"] = provenance.get("recorded", datetime.now(UTC).isoformat())

    store = _get_store("Provenance")
    store[provenance_id] = provenance

    logger.info("Created Provenance/%s via MCP", provenance_id)
    return provenance


@hipaa_tool(phi_level="full", allowed_agents=_CLINICAL_AGENTS, server="fhir")
async def fhir_batch(operations: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Execute multiple FHIR operations in a batch."""
    operations = operations or []
    results: list[dict] = []

    for op in operations:
        method = op.get("method", "GET")
        op_params = op.get("params", {})

        if method == "GET":
            result = await fhir_read(**op_params)
        elif method == "POST":
            result = await fhir_create(**op_params)
        elif method == "PUT":
            result = await fhir_update(**op_params)
        elif method == "SEARCH":
            result = await fhir_search(**op_params)
        else:
            result = {"error": f"Unsupported method: {method}"}

        results.append({"status": "200", "resource": result})

    return {
        "resourceType": "Bundle",
        "type": "batch-response",
        "entry": results,
    }


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_AGENTS, server="fhir")
async def fhir_create_claim_response(
    claim_id: str = "",
    outcome: str = "complete",
    disposition: str = "",
    payer: str = "",
    total_paid: float = 0.0,
    adjudication_details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a FHIR ClaimResponse resource tracking payer decision on a claim."""
    if not claim_id:
        return {"error": "claim_id is required"}

    resource_id = str(uuid4())
    now = datetime.now(UTC).isoformat()

    patient_ref = (
        f"Patient/{claim_id.split('-')[0]}"
        if "-" in claim_id
        else "Patient/unknown"
    )
    resource: dict[str, Any] = {
        "id": resource_id,
        "resourceType": "ClaimResponse",
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": "active",
        "type": _CLAIM_TYPE_PROFESSIONAL,
        "use": "claim",
        "patient": {"reference": patient_ref},
        "created": now,
        "insurer": {"display": payer or "Unknown Payer"},
        "request": {"reference": f"Claim/{claim_id}"},
        "outcome": outcome,
        "disposition": disposition,
        "payment": {"amount": _usd(total_paid)},
    }

    if adjudication_details:
        resource["adjudication"] = [
            {
                "category": {"coding": [{"code": k, "display": k}]},
                "amount": _usd(v) if isinstance(v, int | float) else {"value": 0},
            }
            for k, v in adjudication_details.items()
        ]

    store = _get_store("ClaimResponse")
    store[resource_id] = resource

    logger.info("Created ClaimResponse/%s for Claim/%s via MCP", resource_id, claim_id)
    return resource


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_AGENTS, server="fhir")
async def fhir_create_eob(
    claim_id: str = "",
    patient_id: str = "",
    payer: str = "",
    outcome: str = "complete",
    total_billed: float = 0.0,
    total_paid: float = 0.0,
    patient_responsibility: float = 0.0,
    service_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Create a FHIR ExplanationOfBenefit resource with payment breakdown."""
    if not claim_id:
        return {"error": "claim_id is required"}
    if not patient_id:
        return {"error": "patient_id is required"}

    resource_id = str(uuid4())
    now = datetime.now(UTC).isoformat()

    items: list[dict[str, Any]] = []
    if service_items:
        for idx, svc in enumerate(service_items, start=1):
            code = svc.get("code", "99213")
            display = svc.get("display", "Service")
            item: dict[str, Any] = {
                "sequence": idx,
                "productOrService": {
                    "coding": [{"code": code, "display": display}],
                },
                "adjudication": [
                    _total_entry("submitted", "Submitted Amount", svc.get("billed", 0.0)),
                    _total_entry("benefit", "Benefit Amount", svc.get("paid", 0.0)),
                ],
            }
            items.append(item)

    resource: dict[str, Any] = {
        "id": resource_id,
        "resourceType": "ExplanationOfBenefit",
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": "active",
        "type": _CLAIM_TYPE_PROFESSIONAL,
        "use": "claim",
        "patient": {"reference": f"Patient/{patient_id}"},
        "created": now,
        "insurer": {"display": payer or "Unknown Payer"},
        "claim": {"reference": f"Claim/{claim_id}"},
        "outcome": outcome,
        "total": [
            _total_entry("submitted", "Submitted Amount", total_billed),
            _total_entry("benefit", "Benefit Amount", total_paid),
            _total_entry("copay", "Patient Co-Payment", patient_responsibility),
        ],
    }

    if items:
        resource["item"] = items

    store = _get_store("ExplanationOfBenefit")
    store[resource_id] = resource

    logger.info("Created ExplanationOfBenefit/%s for Claim/%s via MCP", resource_id, claim_id)
    return resource


@hipaa_tool(phi_level="limited", allowed_agents=_BILLING_READ_AGENTS, server="fhir")
async def fhir_search_eob(
    patient_id: str | None = None,
    status: str | None = None,
    outcome: str | None = None,
) -> dict[str, Any]:
    """Search ExplanationOfBenefit resources by patient, status, or outcome."""
    store = _get_store("ExplanationOfBenefit")
    results = list(store.values())

    if patient_id:
        results = [
            r for r in results
            if r.get("patient", {}).get("reference") == f"Patient/{patient_id}"
        ]

    if status:
        results = [r for r in results if r.get("status") == status]

    if outcome:
        results = [r for r in results if r.get("outcome") == outcome]

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(results),
        "entry": [
            {"resource": r, "fullUrl": f"ExplanationOfBenefit/{r['id']}"}
            for r in results
        ],
    }


# ---------------------------------------------------------------------------
# Registration (called at startup)
# ---------------------------------------------------------------------------


def register_fhir_tools() -> None:
    """Seed demo data. Tool registration happens via @hipaa_tool decorators."""
    _seed_demo_patients()
    logger.info("FHIR server initialized with demo data")
