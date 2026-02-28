# CLAUDE.md - MedOS Platform

> Instrucciones operativas para Claude al trabajar en el codebase de MedOS Platform.
> Actualizado: 2026-02-28

---

## PROYECTO

**MedOS Platform** = el codebase del Healthcare OS -- FastAPI backend + Next.js frontend.
- **Knowledge base:** Vault Obsidian en `Z:\medos\` (repo `medos`)
- **Este repo:** Codigo fuente de la plataforma (repo `medos-platform`)
- **Target:** Mid-size specialty practices (5-30 providers) en Florida
- **Equipo:** 2 personas + AI tools (Claude Code + Cursor)

**Antes de implementar algo, consultar la documentacion en el vault `medos`:**
- ADRs en `04-architecture/adr/` -- decisiones ya tomadas
- Deep-dives en `05-domain/` -- conocimiento de healthcare
- Engineering guides en `06-engineering/` -- guias de implementacion
- Execution plan en `03-projects/PHASE-1-EXECUTION-PLAN.md` -- que task sigue

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
- Per-tenant KMS keys para encryption
- Middleware extrae tenant_id del JWT y setea `SET search_path`

### ADR-003: LangGraph + Claude
- AI agents implementados con LangGraph state machines
- Claude API como LLM primario (con HIPAA BAA)
- Confidence threshold: < 0.85 = human review obligatorio
- Toda llamada a LLM auditada (FHIR Provenance)

### ADR-004: FastAPI Backend
- Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2
- Async everywhere (asyncpg, httpx)
- Estructura: routers -> services -> repositories

---

## ESTRUCTURA DEL PROYECTO

```
medos-platform/
  backend/
    src/medos/
      main.py              # FastAPI app factory
      config/              # Settings (pydantic-settings, .env)
      routers/             # Endpoints (health, fhir_patient, etc.)
        health.py          # GET /health
        fhir_patient.py    # FHIR Patient CRUD + search
      services/            # Business logic (coding, matching, etc.)
      repositories/        # Data access (PostgreSQL queries)
      middleware/          # Auth, tenant isolation, audit logging
      models/              # SQLAlchemy models
      schemas/             # Pydantic request/response schemas
      fhir/                # FHIR resource validation, profiles
      agents/              # LangGraph AI agents
      utils/               # Helpers
    tests/                 # pytest (mirror src structure)
    alembic/               # Database migrations
    Dockerfile             # Multi-stage, non-root
    pyproject.toml         # Dependencies + ruff + pytest config
  frontend/                # Next.js 15 (Sprint 2+)
  docker-compose.yml       # Local dev: API + PostgreSQL 17 + Redis
  .env.example             # All variables documented
```

---

## TECH STACK

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Backend | FastAPI | 0.115+ |
| Python | CPython | 3.12+ |
| ORM | SQLAlchemy | 2.0+ (async) |
| Validation | Pydantic | v2.10+ |
| DB | PostgreSQL + pgvector | 17 |
| Cache | Redis | 7+ |
| LLM | Claude API (Anthropic) | claude-sonnet-4 |
| Agents | LangGraph | latest |
| Frontend | Next.js | 15 (Sprint 2) |
| Container | Docker | multi-stage |
| IaC | Terraform | (repo separado) |
| CI/CD | GitHub Actions | (configurar Sprint 0) |
| Linter | ruff | 0.8+ |
| Tests | pytest + pytest-asyncio | 8.3+ |

---

## REGLAS DE CODIGO

### Python / FastAPI
- **SIEMPRE** type hints en funciones publicas
- **SIEMPRE** async para I/O (database, HTTP, Redis)
- **SIEMPRE** Pydantic models para request/response bodies
- **SIEMPRE** dependency injection de FastAPI (no globals)
- **NUNCA** `print()` -- usar `logging` o `structlog`
- **NUNCA** SQL raw sin parametrizacion (SQL injection)
- **NUNCA** secrets hardcodeados -- usar `settings` de pydantic-settings
- Linter: `ruff check` debe pasar sin errores
- Line length: 120 caracteres

### FHIR
- Recursos FHIR son dicts Python (no modelos SQLAlchemy)
- Almacenar como JSONB en `fhir_resources` table
- Endpoints bajo `/fhir/r4/` (ej: `/fhir/r4/Patient`)
- Respuestas de error usan `OperationOutcome` (FHIR standard)
- Busquedas retornan `Bundle` con `type: "searchset"`
- Versionamiento: `meta.versionId` incrementa en cada update

### Tests
- Archivos: `test_<feature>.py` en `backend/tests/`
- Naming: `test_<action>_<expected>` (ej: `test_create_patient`)
- Usar `TestClient` de FastAPI para endpoints
- Fixtures en `conftest.py`
- Coverage target: 80%+

### Git
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Branch por feature: `feat/S0-T18-fastapi-scaffold`
- PR a `main` con CI checks pasando
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

## API ENDPOINTS (actuales)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/fhir/r4/metadata` | FHIR CapabilityStatement |
| POST | `/fhir/r4/Patient` | Create Patient |
| GET | `/fhir/r4/Patient/{id}` | Read Patient |
| GET | `/fhir/r4/Patient?name=&birthdate=&identifier=` | Search Patients |

---

## COMANDOS

```bash
# Local dev
docker-compose up -d              # Start all services
docker-compose logs -f api        # Watch API logs

# Tests
cd backend
pip install -e ".[dev]"           # Install with dev deps
pytest                            # Run tests
pytest --cov=medos                # With coverage
ruff check src/                   # Lint

# Database
alembic upgrade head              # Run migrations
alembic revision --autogenerate -m "description"  # New migration
```

---

## SPRINT ACTUAL Y TASK IDS

Ver `Z:\medos\03-projects\PHASE-1-EXECUTION-PLAN.md` para el plan completo.
Task IDs: `S{sprint}-T{numero}` (ej: `S0-T18` = Sprint 0, Task 18)

### Tasks completadas en este repo:
- [x] S0-T03: GitHub repo creado con .gitignore
- [x] S0-T05: .env.example con todas las variables
- [x] S0-T18: FastAPI project scaffold (in-memory store, sin DB real aun)
- [x] S0-T19: Dockerfile + docker-compose (API + PostgreSQL 17 + Redis)

### En progreso:
- [ ] S0-T20: Alembic migrations + schema-per-tenant
- [ ] S0-T21: GitHub Actions CI pipeline

### Proximas tasks:
- [ ] S0-T24: SMART on FHIR OAuth2 flow
- [ ] S0-T25: JWT validation middleware + tenant routing
- [ ] S0-T30: User + Tenant SQLAlchemy models
