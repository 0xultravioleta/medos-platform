"""FHIR R4 AuditEvent builder for MedOS Platform.

Every access to patient data MUST be recorded as a FHIR AuditEvent
per HIPAA Security Rule (45 CFR 164.312(b)).

Reference: https://www.hl7.org/fhir/R4/auditevent.html
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

# FHIR AuditEvent action codes
ACTION_CREATE = "C"
ACTION_READ = "R"
ACTION_UPDATE = "U"
ACTION_DELETE = "D"
ACTION_EXECUTE = "E"

# FHIR AuditEvent outcome codes
OUTCOME_SUCCESS = "0"
OUTCOME_MINOR_FAILURE = "4"
OUTCOME_SERIOUS_FAILURE = "8"
OUTCOME_MAJOR_FAILURE = "12"

# DICOM audit event type mappings
_ACTION_TO_TYPE: dict[str, dict[str, str]] = {
    ACTION_CREATE: {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "110111",
        "display": "Procedure Record",
    },
    ACTION_READ: {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "110110",
        "display": "Patient Record",
    },
    ACTION_UPDATE: {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "110111",
        "display": "Procedure Record",
    },
    ACTION_DELETE: {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "110111",
        "display": "Procedure Record",
    },
    ACTION_EXECUTE: {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "110112",
        "display": "Query",
    },
}


def build_audit_event(
    *,
    action: str,
    outcome: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    user_id: str | None = None,
    tenant_id: str | None = None,
    source_ip: str | None = None,
    description: str = "",
) -> dict[str, Any]:
    """Build a FHIR R4 AuditEvent resource.

    Args:
        action: FHIR action code -- C (create), R (read), U (update),
                D (delete), E (execute).
        outcome: FHIR outcome code -- 0 (success), 4 (minor failure),
                 8 (serious failure), 12 (major failure).
        resource_type: FHIR resource type that was accessed (e.g. "Patient").
        resource_id: Logical id of the accessed resource.
        user_id: Identifier of the acting user/system.
        tenant_id: Tenant/organization identifier for multi-tenancy.
        source_ip: IP address of the requesting client.
        description: Human-readable description of the event.

    Returns:
        A dict representing a valid FHIR R4 AuditEvent resource.
    """
    event_type = _ACTION_TO_TYPE.get(action, _ACTION_TO_TYPE[ACTION_EXECUTE])

    audit_event: dict[str, Any] = {
        "resourceType": "AuditEvent",
        "type": {
            "system": event_type["system"],
            "code": event_type["code"],
            "display": event_type["display"],
        },
        "action": action,
        "recorded": datetime.now(UTC).isoformat(),
        "outcome": outcome,
        "agent": [
            {
                "who": {"identifier": {"value": user_id or "anonymous"}},
                "requestor": True,
                "network": {
                    "address": source_ip or "unknown",
                    "type": "2",  # IP Address
                },
            }
        ],
        "source": {
            "observer": {"display": "MedOS Platform"},
            "type": [
                {
                    "code": "4",
                    "display": "Application Server",
                }
            ],
        },
    }

    # Add tenant extension if provided
    if tenant_id:
        audit_event["extension"] = [
            {
                "url": "https://medos.health/fhir/StructureDefinition/tenant-id",
                "valueString": tenant_id,
            }
        ]

    # Add entity reference if a resource was accessed
    if resource_type:
        reference = f"{resource_type}/{resource_id}" if resource_id else resource_type
        entity_type_code = "1" if resource_type == "Patient" else "2"
        entity_type_display = "Person" if resource_type == "Patient" else "Other"

        audit_event["entity"] = [
            {
                "what": {"reference": reference},
                "type": {
                    "code": entity_type_code,
                    "display": entity_type_display,
                },
                "description": description,
            }
        ]
    else:
        audit_event["entity"] = []

    return audit_event


def log_audit_event(
    *,
    action: str,
    outcome: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    user_id: str | None = None,
    tenant_id: str | None = None,
    source_ip: str | None = None,
    description: str = "",
) -> dict[str, Any]:
    """Build and log a FHIR AuditEvent.

    Convenience wrapper that builds the event and emits a structured log.

    Returns:
        The constructed FHIR AuditEvent dict.
    """
    event = build_audit_event(
        action=action,
        outcome=outcome,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=user_id,
        tenant_id=tenant_id,
        source_ip=source_ip,
        description=description,
    )

    logger.info(
        "audit_event",
        fhir_resource_type="AuditEvent",
        action=action,
        outcome=outcome,
        resource_type=resource_type or "System",
        resource_id=resource_id or "",
        user_id=user_id or "anonymous",
        tenant_id=tenant_id or "",
        source_ip=source_ip or "unknown",
    )

    return event
