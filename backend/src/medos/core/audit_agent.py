"""Agent-specific FHIR AuditEvent and Provenance writer.

Extends the base audit module with agent-aware audit events. Every
MCP tool invocation and agent action produces:
  - FHIR AuditEvent (who did what, when, outcome)
  - FHIR Provenance (for AI outputs: model version, prompt hash, confidence)

Events are logged to structured logging AND stored as FHIR resources
in the tenant's schema for compliance querying.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog

from medos.schemas.agent import AgentEvent, ConfidenceScore

logger = structlog.get_logger(__name__)


def build_agent_audit_event(event: AgentEvent) -> dict[str, Any]:
    """Build a FHIR R4 AuditEvent from an AgentEvent.

    Includes agent-specific extensions for agent_type, agent_version,
    session_id, and tool_name.
    """
    audit_event: dict[str, Any] = {
        "resourceType": "AuditEvent",
        "type": {
            "system": "https://medos.health/fhir/CodeSystem/agent-events",
            "code": event.event_type,
            "display": event.event_type.replace(".", " ").title(),
        },
        "action": _event_type_to_action(event.event_type),
        "recorded": event.timestamp.isoformat(),
        "outcome": "0" if "error" not in event.event_type else "8",
        "agent": [
            {
                "who": {
                    "identifier": {
                        "system": "https://medos.health/agents",
                        "value": f"{event.agent_type.value}:{event.agent_version}",
                    }
                },
                "requestor": True,
                "role": [
                    {
                        "coding": [
                            {
                                "system": "https://medos.health/fhir/CodeSystem/agent-types",
                                "code": event.agent_type.value,
                            }
                        ]
                    }
                ],
            }
        ],
        "source": {
            "observer": {"display": "MedOS Agent Platform"},
            "type": [{"code": "4", "display": "Application Server"}],
        },
        "extension": [
            {
                "url": "https://medos.health/fhir/StructureDefinition/tenant-id",
                "valueString": event.tenant_id,
            },
            {
                "url": "https://medos.health/fhir/StructureDefinition/session-id",
                "valueString": event.session_id,
            },
        ],
    }

    # Add entity (resource accessed)
    if event.resource_type:
        reference = (
            f"{event.resource_type}/{event.resource_id}"
            if event.resource_id
            else event.resource_type
        )
        audit_event["entity"] = [
            {
                "what": {"reference": reference},
                "type": {
                    "code": "1" if event.resource_type == "Patient" else "2",
                    "display": "Person" if event.resource_type == "Patient" else "System Object",
                },
            }
        ]

    # Add tool invocation detail
    if event.tool_name:
        audit_event["extension"].append(
            {
                "url": "https://medos.health/fhir/StructureDefinition/tool-name",
                "valueString": event.tool_name,
            }
        )

    return audit_event


def build_agent_provenance(
    *,
    target_resource_type: str,
    target_resource_id: str,
    agent_type: str,
    agent_version: str,
    tenant_id: str,
    confidence: ConfidenceScore | None = None,
    activity: str = "ai-generated",
) -> dict[str, Any]:
    """Build a FHIR R4 Provenance resource for AI-generated content.

    Tracks model version, prompt hash, and confidence score so
    every AI output can be traced back to its source.
    """
    provenance: dict[str, Any] = {
        "resourceType": "Provenance",
        "target": [
            {"reference": f"{target_resource_type}/{target_resource_id}"}
        ],
        "recorded": datetime.now(UTC).isoformat(),
        "activity": {
            "coding": [
                {
                    "system": "https://medos.health/fhir/CodeSystem/provenance-activity",
                    "code": activity,
                    "display": activity.replace("-", " ").title(),
                }
            ]
        },
        "agent": [
            {
                "who": {
                    "identifier": {
                        "system": "https://medos.health/agents",
                        "value": f"{agent_type}:{agent_version}",
                    }
                },
                "type": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                            "code": "author",
                        }
                    ]
                },
            }
        ],
        "extension": [
            {
                "url": "https://medos.health/fhir/StructureDefinition/tenant-id",
                "valueString": tenant_id,
            },
        ],
    }

    if confidence:
        provenance["extension"].extend([
            {
                "url": "https://medos.health/fhir/StructureDefinition/confidence-score",
                "valueDecimal": confidence.score,
            },
            {
                "url": "https://medos.health/fhir/StructureDefinition/model-id",
                "valueString": confidence.model_id,
            },
            {
                "url": "https://medos.health/fhir/StructureDefinition/prompt-hash",
                "valueString": confidence.prompt_hash,
            },
        ])

    return provenance


def log_agent_audit_event(event: AgentEvent) -> dict[str, Any]:
    """Build and log an agent audit event to structured logging.

    Returns the FHIR AuditEvent dict (also usable for DB persistence).
    """
    audit = build_agent_audit_event(event)

    logger.info(
        "agent_audit_event",
        event_type=event.event_type,
        agent_type=event.agent_type.value,
        agent_version=event.agent_version,
        tenant_id=event.tenant_id,
        session_id=event.session_id,
        tool_name=event.tool_name or "",
        resource_type=event.resource_type or "",
        resource_id=event.resource_id or "",
    )

    return audit


def _event_type_to_action(event_type: str) -> str:
    """Map event type to FHIR AuditEvent action code."""
    mapping = {
        "tool.invoked": "E",  # Execute
        "tool.error": "E",
        "resource.created": "C",
        "resource.read": "R",
        "resource.updated": "U",
        "resource.deleted": "D",
        "output.generated": "C",
        "review.requested": "E",
        "review.completed": "U",
    }
    return mapping.get(event_type, "E")
