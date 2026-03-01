# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## PROYECTO

**MedOS Platform** = Healthcare OS -- FastAPI backend + Next.js frontend.
- **Knowledge base:** Vault Obsidian en `Z:\medos\` (repo `medos`)
- **Este repo:** Codigo fuente de la plataforma (repo `medos-platform`)
- **Target:** Mid-size specialty practices (5-30 providers) en Florida

**Antes de implementar algo, consultar la documentacion en el vault `medos`:**
- ADRs en `04-architecture/adr/` -- decisiones ya tomadas
- Deep-dives en `05-domain/` -- conocimiento de healthcare
- Engineering guides en `06-engineering/` -- guias de implementacion
- Execution plan en `03-projects/PHASE-1-EXECUTION-PLAN.md`

---

## COMANDOS

### Backend
```bash
# Local dev (all services)
docker-compose up -d
docker-compose logs -f api

# Install deps and run tests (from repo root)
cd backend
pip install -e ".[dev]"
pytest                                  # All tests
pytest tests/test_fhir_patient.py       # Single test file
pytest tests/test_fhir_patient.py::test_create_patient  # Single test
pytest -v --cov=medos                   # With coverage
ruff check src/                         # Lint
ruff format --check src/                # Format check

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

### Frontend
```bash
cd frontend
npm install
npm run dev                             # Dev server (localhost:3000)
npm run build                           # Production build
npm run lint                            # ESLint
npx playwright test                     # E2E tests (against Vercel deployment)
npm run demo                            # Record demo video (headed browser)
npm run demo:headless                   # Record demo video (headless)
```

### CI (GitHub Actions)
CI runs on push/PR to main/master: ruff lint + format check, pytest with PostgreSQL 17 + Redis 7 service containers, Trivy + pip-audit security scan, Docker build verification.

---

## ARQUITECTURA (decisiones ya tomadas -- NO cambiar sin ADR nuevo)

### ADR-001: FHIR-native JSONB
- Todo recurso FHIR se almacena como JSONB nativo en PostgreSQL
- NUNCA crear modelos relacionales para recursos FHIR
- Tabla `fhir_resources` con columnas: id, resource_type, tenant_id, version, resource (JSONB)
- GIN indexes en JSONB, btree en campos extraidos frecuentes

### ADR-002: Schema-per-tenant
- Cada tenant (practica medica) tiene su propio PostgreSQL schema
- Row Level Security como defensa adicional
- Middleware extrae tenant_id del JWT y setea `SET search_path`

### ADR-003: LangGraph + Claude
- AI agents implementados con LangGraph state machines
- Claude API como LLM primario (con HIPAA BAA)
- Confidence threshold: < 0.85 = human review obligatorio
- Toda llamada a LLM auditada (FHIR Provenance)

### ADR-004: FastAPI Backend
- Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2
- Async everywhere (asyncpg, httpx)
- Estructura: routers -> services -> repositories

---

## BIG PICTURE ARCHITECTURE

### Request Flow
```
Next.js Frontend (Vercel)
    ↕ REST /api/v1/* (mock data) + /fhir/r4/* (FHIR resources)
FastAPI (main.py::create_app)
    → RequestLoggingMiddleware → CORS → Router
    → Routers (health, fhir_patient, mock_api, agent_*, mcp_sse, workflows, ws_events, ...)
    → Services (fhir_service)
    → Repositories (fhir_repository → PostgreSQL JSONB)
```

### MCP + HIPAA Security Pipeline
El backend expone un MCP server en `/mcp` (Streamable HTTP) para que agentes AI externos (Claude Code, etc.) accedan a tools con seguridad HIPAA:

```
External Agent → FastMCP (JSON-RPC, /mcp) → HIPAAFastMCP.call_tool() override
    1. Agent authentication (tenant_id required)
    2. PHI access policy check (per agent type: full/limited/none)
    3. Per-agent rate limiting (60/min)
    4. Execute tool
    5. HIPAA audit log (success or failure)
```

- **`@hipaa_tool` decorator** (`mcp/decorators.py`): marca funciones con phi_level, allowed_agents, server, requires_approval. Se coleccionan globalmente y se registran en `HIPAAFastMCP.register_hipaa_tools()`.
- **MCP Servers** (`mcp/servers/`): fhir_server, scribe_server, billing_server, scheduling_server, device_server, context_server -- cada uno registra tools via `@hipaa_tool`.
- **Gateway** (`mcp/gateway.py`): tool routing + registry interface.

### Agent Architecture
LangGraph agents siguen el patron en `agents/base.py`:
- `create_agent_context()` -- factory con FHIR scopes por tipo de agente
- `route_by_confidence()` -- auto-approve (>=0.95), pass (>=0.85), o create review task (<0.85)
- `emit_agent_event()` -- audit + event bus
- Safety layer (`core/safety_layer.py`) checks antes de aprobar output

Cada agente tiene su directorio: `agents/{name}/` con `state.py`, `nodes.py`, `graph.py`, `prompts.py`.
Agentes implementados: `clinical_scribe`, `prior_auth`, `denial_mgmt`.

### Frontend Architecture
Next.js 16 con App Router, Tailwind CSS 4, TypeScript:
- **Route group `(dashboard)/`**: layout con Sidebar + TopBar, protegido por `useAuth()`
- **`lib/api.ts`**: fetch wrapper que retorna `null` si el backend no responde -- cada pagina hace fallback a `lib/mock-data.ts`
- **`lib/auth-context.tsx`**: AuthProvider (mock auth, cualquier credencial funciona en dev)
- Admin pages en `(dashboard)/admin/*` con layout propio

### Billing Module
`billing/` contiene logica de RCM (Revenue Cycle Management):
- `x12_837p.py` -- generacion de claims X12 837P
- `x12_835_parser.py` -- parsing de remittance advice
- `claims_scrubber.py` -- validacion pre-submission
- `payment_posting.py` -- ERA auto-posting
- `underpayment_detector.py` -- deteccion de underpayments

### Core Security
`core/` contiene modulos criticos de seguridad:
- `field_encryption.py` -- encryption a nivel de campo para PII
- `credential_injection.py` -- inyeccion segura de credenciales
- `audit_agent.py` -- audit events FHIR-compliant
- `context_freshness.py` / `context_rehydration.py` -- manejo de contexto de agentes

---

## REGLAS DE CODIGO

### Python / FastAPI
- **SIEMPRE** type hints en funciones publicas
- **SIEMPRE** async para I/O (database, HTTP, Redis)
- **SIEMPRE** Pydantic models para request/response bodies
- **SIEMPRE** dependency injection de FastAPI (no globals)
- **NUNCA** `print()` -- usar `logging` o `structlog`
- **NUNCA** SQL raw sin parametrizacion
- **NUNCA** secrets hardcodeados -- usar `settings` de pydantic-settings
- Linter: `ruff check` con reglas E, F, W, I, N, UP, S, B, A, SIM (S101 ignorada para tests)
- Line length: 120 caracteres
- ruff version pinned a 0.8.6

### FHIR
- Recursos FHIR son dicts Python (no modelos SQLAlchemy)
- Almacenar como JSONB en `fhir_resources` table
- Endpoints bajo `/fhir/r4/` (ej: `/fhir/r4/Patient`)
- Respuestas de error usan `OperationOutcome` (FHIR standard)
- Busquedas retornan `Bundle` con `type: "searchset"`
- Versionamiento: `meta.versionId` incrementa en cada update

### MCP Tools
- Nuevos tools se crean con el decorator `@hipaa_tool` en un server dentro de `mcp/servers/`
- Siempre especificar `phi_level` ("none", "limited", "full") y `allowed_agents`
- Tools se registran automaticamente al importar el server module en `main.py::_register_mcp_tools()`

### Tests
- Archivos: `test_<feature>.py` en `backend/tests/`
- Naming: `test_<action>_<expected>` (ej: `test_create_patient`)
- Usar `TestClient` de FastAPI para endpoints
- `asyncio_mode = "auto"` en pytest config
- Coverage target: 80%+

### Git
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Branch por feature: `feat/S0-T18-fastapi-scaffold`
- NUNCA force push a main

### Healthcare Compliance
- **NUNCA** PHI en logs (los 18 HIPAA identifiers: nombre, DOB, SSN, MRN, etc.)
- **NUNCA** PHI en error responses (usar OperationOutcome generico)
- **NUNCA** PHI en frontend Client Components (solo Server Components)
- **SIEMPRE** audit trail via FHIR AuditEvent para acceso a datos
- **SIEMPRE** tenant isolation verificada en cada request
- **SIEMPRE** confidence scoring en outputs de AI (< 0.85 = human review)
- Datos de prueba: usar Synthea (generador de datos sinteticos), NUNCA datos reales

---

## KEY FILES

| File | Purpose |
|------|---------|
| `backend/src/medos/main.py` | FastAPI app factory, router registration, MCP mount |
| `backend/src/medos/config/settings.py` | All env vars via pydantic-settings (`Settings` class) |
| `backend/src/medos/mcp/hipaa_fastmcp.py` | HIPAAFastMCP -- FastMCP subclass with security pipeline |
| `backend/src/medos/mcp/decorators.py` | `@hipaa_tool` decorator for MCP tool registration |
| `backend/src/medos/agents/base.py` | Agent infrastructure: context, confidence routing, events |
| `backend/src/medos/middleware/auth.py` | JWT auth (HS256 dev / RS256 prod via JWKS) |
| `backend/src/medos/middleware/security.py` | Security headers, request validation |
| `frontend/src/lib/api.ts` | API client with null-return fallback to mock data |
| `frontend/src/lib/mock-data.ts` | Mock patients, appointments, stats for demo |
| `frontend/src/app/(dashboard)/layout.tsx` | Dashboard shell (Sidebar + TopBar + auth guard) |
| `docker-compose.yml` | Local dev: API (:8000) + PostgreSQL 17/pgvector (:5432) + Redis 7 (:6379) |
| `.github/workflows/ci.yml` | CI pipeline (lint, test, security, docker build) |

---

## PROGRESS REPORT

**REGLA: Despues de cada commit significativo, actualizar `PROGRESS.md` en la raiz del repo.**

PROGRESS.md cuenta la historia del proyecto de forma narrativa y no-tecnica. Incluye:
- Que se hizo y POR QUE (no solo el "what")
- Metricas concretas (tests, coverage, lineas, docs)
- Tabla "Mock vs Production-Ready" siempre actualizada
- "What's Next" con los siguientes pasos claros
