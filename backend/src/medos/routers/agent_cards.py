"""A2A Agent Card endpoint.

Serves the platform-level Agent Card at /.well-known/agent.json
for agent discovery per the A2A protocol.

This enables external AI agents to discover MedOS capabilities,
authentication requirements, and HIPAA compliance status.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from medos.config import settings

router = APIRouter(tags=["A2A"])


@router.get("/.well-known/agent.json")
async def agent_card() -> JSONResponse:
    """Serve the A2A Agent Card for MedOS platform discovery."""
    card = {
        "name": "MedOS Healthcare OS",
        "description": (
            "AI-native operating system for U.S. healthcare. "
            "Provides FHIR R4 resource access, ambient clinical documentation, "
            "revenue cycle management, and practice analytics via MCP tools."
        ),
        "version": settings.app_version,
        "url": settings.fhir_base_url.replace("/fhir/r4", ""),
        "provider": {
            "organization": "MedOS Health",
            "url": "https://medos.health",
        },
        "capabilities": {
            "streaming": True,
            "pushNotifications": False,
            "stateTransitionHistory": True,
        },
        "authentication": {
            "schemes": ["Bearer"],
            "credentials": (
                "OAuth 2.1 / SMART on FHIR. "
                "Contact admin@medos.health for client credentials."
            ),
        },
        "defaultInputModes": ["application/json"],
        "defaultOutputModes": ["application/json"],
        "skills": [
            {
                "id": "fhir-resources",
                "name": "FHIR R4 Resource Access",
                "description": (
                    "Read, search, create, and update FHIR R4 resources "
                    "(Patient, Encounter, Observation, Condition, etc.)"
                ),
                "tags": ["fhir", "ehr", "clinical"],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
            {
                "id": "clinical-scribe",
                "name": "AI Clinical Documentation",
                "description": (
                    "Ambient AI scribe: transcribe encounters, generate "
                    "SOAP notes with ICD-10/CPT coding suggestions"
                ),
                "tags": ["ai", "clinical", "documentation", "coding"],
                "inputModes": ["application/json", "audio/wav"],
                "outputModes": ["application/json"],
            },
            {
                "id": "billing-claims",
                "name": "Revenue Cycle Management",
                "description": (
                    "Eligibility verification, claim submission, "
                    "denial management, and prior authorization"
                ),
                "tags": ["billing", "claims", "revenue-cycle"],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
            {
                "id": "scheduling",
                "name": "Appointment Scheduling",
                "description": (
                    "Slot availability, booking, rescheduling, cancellation, "
                    "waitlist management, and no-show prediction"
                ),
                "tags": ["scheduling", "appointments", "waitlist"],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
            {
                "id": "prior-auth",
                "name": "Prior Authorization",
                "description": (
                    "Automated PA requirement checking, clinical evidence gathering, "
                    "medical necessity justification, and PA form generation"
                ),
                "tags": ["prior-auth", "authorization", "ai-agent"],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
            {
                "id": "denial-management",
                "name": "Denial Management",
                "description": (
                    "Denial analysis, CARC/RARC code lookup, appeal viability "
                    "assessment, and automated appeal letter drafting"
                ),
                "tags": ["denials", "appeals", "ai-agent"],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
            {
                "id": "practice-analytics",
                "name": "Practice Analytics",
                "description": (
                    "Dashboard metrics, quality measures, care gaps, "
                    "denial patterns, and revenue forecasting"
                ),
                "tags": ["analytics", "quality", "reporting"],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
        ],
        "compliance": {
            "hipaa": True,
            "hipaaBaa": True,
            "soc2": "in-progress",
            "hitrust": "planned",
            "dataResidency": "us-east-1",
            "phiHandling": "encrypted-at-rest-and-in-transit",
            "auditTrail": "fhir-audit-event",
        },
        "mcpEndpoint": "/mcp",
        "mcpTransport": "streamable-http",
    }

    return JSONResponse(
        content=card,
        headers={"Content-Type": "application/json"},
    )
