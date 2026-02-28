# MedOS Platform

> AI-Native Operating System for U.S. Healthcare

## What is MedOS?

MedOS is a healthcare operations platform built from the ground up with AI at its core. Not AI bolted onto a legacy system -- AI as the foundation.

**Target:** Give every 10-person practice the operational capability of the Mayo Clinic.

## Architecture

```
APPLICATION LAYER
  Provider Workspace | Patient Portal | Admin Console

AI ORCHESTRATION LAYER
  LangGraph Agents | Claude API (HIPAA BAA) | Confidence Scoring

SERVICE MODULES
  A. Patient Identity    E. Population Health
  B. Workflow Engine     F. Patient Engagement
  C. Revenue Cycle       G. Compliance Engine
  D. Payer Integration   H. Integration Layer

DATA LAYER
  PostgreSQL 17 + pgvector (FHIR-native JSONB) | Redis | EventBridge

INTEGRATION LAYER
  FHIR R4 Gateway | HL7v2 Adapter | X12 EDI Engine | MCP Servers
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | FastAPI (Python 3.12+) | AI/ML ecosystem, async, FHIR libraries |
| Frontend | Next.js 15 | Server Components keep PHI server-side |
| Database | PostgreSQL 17 + pgvector | Single DB: relational + FHIR JSONB + vectors |
| Cache | Redis 7 | Sessions, pub/sub, task queues |
| LLM | Claude API | Best clinical reasoning, HIPAA BAA available |
| Agents | LangGraph | State machine agents with human-in-the-loop |
| Speech | Whisper v3 | Self-hosted for data sovereignty |
| Cloud | AWS | Most mature HIPAA services |
| IaC | Terraform | Infrastructure as code, never ClickOps |

## Project Structure

```
medos-platform/
  backend/
    src/medos/
      main.py              # FastAPI application factory
      config/              # Settings via environment variables
      routers/             # API endpoints (health, FHIR resources)
      services/            # Business logic
      repositories/        # Data access layer
      middleware/          # Auth, tenant isolation, audit
      models/              # SQLAlchemy models
      schemas/             # Pydantic schemas
      fhir/                # FHIR resource handling
      agents/              # LangGraph AI agents
    tests/                 # pytest test suite
    Dockerfile             # Multi-stage, non-root user
  frontend/                # Next.js 15 (coming in Sprint 2)
  docker-compose.yml       # Local dev: API + PostgreSQL + Redis
  .env.example             # All environment variables documented
```

## Quick Start

```bash
# Clone
git clone https://github.com/0xultravioleta/medos-platform.git
cd medos-platform

# Start local environment
docker-compose up -d

# API is running at http://localhost:8000
curl http://localhost:8000/health
curl http://localhost:8000/fhir/r4/metadata

# Create a FHIR Patient
curl -X POST http://localhost:8000/fhir/r4/Patient \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Patient",
    "name": [{"family": "Garcia", "given": ["Maria"]}],
    "birthDate": "1985-03-15",
    "gender": "female"
  }'

# Run tests
cd backend
pip install -e ".[dev]"
pytest
```

## FHIR R4 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/fhir/r4/metadata` | FHIR CapabilityStatement |
| POST | `/fhir/r4/Patient` | Create Patient |
| GET | `/fhir/r4/Patient/{id}` | Read Patient |
| GET | `/fhir/r4/Patient?name=...` | Search Patients |

## Knowledge Base

The companion repo [medos](https://github.com/0xultravioleta/medos) contains the full knowledge base:
- 8 domain deep-dives (FHIR, HIPAA, RCM, X12 EDI, Prior Auth, SOC2/HITRUST, Clinical Workflows, Population Health)
- 4 Architecture Decision Records
- System Architecture Overview with Mermaid diagrams
- 90-day execution plan (117 tasks across 7 sprints)
- 6 EPICs with granular task breakdowns

## Compliance

- HIPAA-first architecture: encryption at rest (AES-256), in transit (TLS 1.3), field-level for PII
- Schema-per-tenant isolation with Row Level Security
- Per-tenant KMS encryption keys
- FHIR AuditEvent for all data access
- No PHI in logs, error messages, or client-side code
- SOC 2 Type II + HITRUST certification roadmap

## License

Proprietary. All rights reserved.
