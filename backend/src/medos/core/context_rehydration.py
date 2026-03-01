"""Context Rehydration Engine.

Event-driven system that detects data changes across the entire MedOS
platform -- patient data, payer rules, provider schedules, agent configs,
clinical protocols, formularies, and compliance policies -- and triggers
selective refresh of all dependent contexts. Ensures AI agents always
operate on fresh, accurate data.

Architecture:
    Data Change -> Event Bus -> ContextChangeDetector
        -> ContextDependencyGraph.get_affected_contexts()
        -> RehydrationOrchestrator.refresh(contexts)
        -> ContextCache.invalidate() + ContextCache.warm()
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ChangeType(str, Enum):
    """Types of data changes that can trigger rehydration.

    Covers patient-level clinical/billing events AND system-wide
    configuration changes (payer rules, agent config, protocols, etc.).
    """

    # Patient-level changes
    DEMOGRAPHIC_UPDATED = "patient.demographic.updated"
    LAB_RECEIVED = "patient.lab.received"
    VITALS_RECORDED = "patient.vitals.recorded"
    DEVICE_READING = "patient.device.reading"
    MEDICATION_CHANGED = "patient.medication.changed"
    ENCOUNTER_CREATED = "patient.encounter.created"
    CLAIM_STATUS_CHANGED = "patient.claim.status_changed"
    APPOINTMENT_CHANGED = "patient.appointment.changed"
    ALLERGY_UPDATED = "patient.allergy.updated"
    INSURANCE_UPDATED = "patient.insurance.updated"

    # System-wide changes
    PAYER_RULES_UPDATED = "payer.rules_updated"
    PROVIDER_SCHEDULE_CHANGED = "provider.schedule_changed"
    AGENT_CONFIG_UPDATED = "agent.config_updated"
    PROTOCOL_CLINICAL_UPDATED = "protocol.clinical_updated"
    FORMULARY_UPDATED = "formulary.updated"
    COMPLIANCE_POLICY_CHANGED = "compliance.policy_changed"
    SYSTEM_MCP_TOOLS_CHANGED = "system.mcp_tools_changed"


class ContextType(str, Enum):
    """Types of contexts maintained by the system.

    Includes patient-level clinical contexts AND system-wide
    operational contexts (scheduling, payer rules, agent config, etc.).
    """

    # Patient-level contexts
    ENCOUNTER = "encounter"
    CLINICAL_SUMMARY = "clinical_summary"
    BILLING = "billing"
    MEDICATION = "medication"
    ANALYTICS = "analytics"
    CARE_PLAN = "care_plan"
    DEVICE_VITALS = "device_vitals"

    # System-wide contexts
    SCHEDULING = "scheduling"
    PAYER_RULES = "payer_rules"
    AGENT_CONFIG = "agent_config"
    CLINICAL_PROTOCOLS = "clinical_protocols"
    FORMULARY = "formulary"
    COMPLIANCE = "compliance"


class RefreshUrgency(str, Enum):
    """How urgently a context needs to be refreshed."""

    IMMEDIATE = "immediate"  # Active encounter - refresh NOW
    SOON = "soon"            # Background - within 1 minute
    BATCH = "batch"          # Analytics - next batch cycle (15 min)
    LAZY = "lazy"            # Dormant - refresh on next access


# ---------------------------------------------------------------------------
# Dependency Graph
# ---------------------------------------------------------------------------

DEPENDENCY_GRAPH: dict[ChangeType, list[ContextType]] = {
    # --- Patient-level changes ---
    ChangeType.LAB_RECEIVED: [
        ContextType.ENCOUNTER,
        ContextType.CLINICAL_SUMMARY,
        ContextType.ANALYTICS,
    ],
    ChangeType.VITALS_RECORDED: [
        ContextType.ENCOUNTER,
        ContextType.CLINICAL_SUMMARY,
        ContextType.DEVICE_VITALS,
    ],
    ChangeType.DEVICE_READING: [
        ContextType.DEVICE_VITALS,
        ContextType.CLINICAL_SUMMARY,
        ContextType.ANALYTICS,
    ],
    ChangeType.MEDICATION_CHANGED: [
        ContextType.ENCOUNTER,
        ContextType.CLINICAL_SUMMARY,
        ContextType.MEDICATION,
        ContextType.CARE_PLAN,
    ],
    ChangeType.DEMOGRAPHIC_UPDATED: [
        ContextType.ENCOUNTER,
        ContextType.CLINICAL_SUMMARY,
        ContextType.BILLING,
    ],
    ChangeType.CLAIM_STATUS_CHANGED: [
        ContextType.BILLING,
    ],
    ChangeType.ENCOUNTER_CREATED: [
        ContextType.ENCOUNTER,
        ContextType.CLINICAL_SUMMARY,
        ContextType.ANALYTICS,
    ],
    ChangeType.APPOINTMENT_CHANGED: [
        ContextType.ENCOUNTER,
        ContextType.CARE_PLAN,
        ContextType.SCHEDULING,
    ],
    ChangeType.ALLERGY_UPDATED: [
        ContextType.ENCOUNTER,
        ContextType.CLINICAL_SUMMARY,
        ContextType.MEDICATION,
    ],
    ChangeType.INSURANCE_UPDATED: [
        ContextType.BILLING,
        ContextType.PAYER_RULES,
    ],
    # --- System-wide changes ---
    ChangeType.PAYER_RULES_UPDATED: [
        ContextType.BILLING,
        ContextType.PAYER_RULES,
    ],
    ChangeType.PROVIDER_SCHEDULE_CHANGED: [
        ContextType.SCHEDULING,
    ],
    ChangeType.AGENT_CONFIG_UPDATED: [
        ContextType.AGENT_CONFIG,
    ],
    ChangeType.PROTOCOL_CLINICAL_UPDATED: [
        ContextType.CLINICAL_PROTOCOLS,
        ContextType.ENCOUNTER,
        ContextType.CARE_PLAN,
    ],
    ChangeType.FORMULARY_UPDATED: [
        ContextType.FORMULARY,
        ContextType.MEDICATION,
    ],
    ChangeType.COMPLIANCE_POLICY_CHANGED: [
        ContextType.COMPLIANCE,
    ],
    ChangeType.SYSTEM_MCP_TOOLS_CHANGED: [
        ContextType.AGENT_CONFIG,
    ],
}

CONTEXT_URGENCY: dict[ContextType, RefreshUrgency] = {
    # Patient-level contexts
    ContextType.ENCOUNTER: RefreshUrgency.IMMEDIATE,
    ContextType.CLINICAL_SUMMARY: RefreshUrgency.SOON,
    ContextType.MEDICATION: RefreshUrgency.IMMEDIATE,
    ContextType.BILLING: RefreshUrgency.SOON,
    ContextType.ANALYTICS: RefreshUrgency.BATCH,
    ContextType.CARE_PLAN: RefreshUrgency.SOON,
    ContextType.DEVICE_VITALS: RefreshUrgency.SOON,
    # System-wide contexts
    ContextType.SCHEDULING: RefreshUrgency.SOON,
    ContextType.PAYER_RULES: RefreshUrgency.BATCH,
    ContextType.AGENT_CONFIG: RefreshUrgency.IMMEDIATE,
    ContextType.CLINICAL_PROTOCOLS: RefreshUrgency.SOON,
    ContextType.FORMULARY: RefreshUrgency.SOON,
    ContextType.COMPLIANCE: RefreshUrgency.IMMEDIATE,
}


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class ContextChangeEvent:
    """Represents a data change that may trigger rehydration.

    For patient-level changes, ``patient_id`` identifies the patient.
    For system-wide changes (payer rules, agent config, etc.),
    ``patient_id`` is the entity identifier (e.g. payer ID, agent name)
    and ``scope`` is set to ``"system"``.
    """

    event_id: str = field(default_factory=lambda: str(uuid4()))
    change_type: ChangeType = ChangeType.DEMOGRAPHIC_UPDATED
    patient_id: str = ""
    tenant_id: str = ""
    resource_type: str = ""
    resource_id: str = ""
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    source: str = "emr"
    scope: str = "patient"  # "patient" or "system"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CachedContext:
    """A cached context with freshness metadata.

    For patient contexts ``patient_id`` is the patient.
    For system contexts it is the entity key (e.g. ``"system"``).
    """

    patient_id: str
    context_type: ContextType
    data: dict[str, Any]
    cached_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    source_consulted_at: datetime | None = None
    ttl_seconds: int = 900  # 15 minutes default
    version: int = 1
    pending_changes: int = 0
    tier: str = "hot"  # hot, warm, cold


@dataclass
class RehydrationRecord:
    """Record of a single rehydration operation for metrics."""

    record_id: str = field(default_factory=lambda: str(uuid4()))
    patient_id: str = ""
    context_type: ContextType = ContextType.ENCOUNTER
    urgency: RefreshUrgency = RefreshUrgency.IMMEDIATE
    trigger_event_id: str = ""
    started_at: float = field(default_factory=time.monotonic)
    completed_at: float | None = None
    success: bool = True

    @property
    def latency_ms(self) -> float:
        if self.completed_at is None:
            return 0.0
        return (self.completed_at - self.started_at) * 1000


@dataclass
class RehydrationResult:
    """Result of processing a context change event."""

    event_id: str
    patient_id: str
    change_type: ChangeType
    affected_contexts: list[ContextType]
    records: list[RehydrationRecord]
    total_refreshed: int = 0
    total_failed: int = 0


# ---------------------------------------------------------------------------
# Mock context data (patient-level + system-wide)
# ---------------------------------------------------------------------------

_MOCK_CONTEXTS: dict[str, dict[str, dict[str, Any]]] = {
    "p-001": {
        ContextType.ENCOUNTER: {
            "encounter_id": "enc-001",
            "status": "in-progress",
            "provider": "Dr. Sarah Williams",
            "reason": "Knee pain follow-up",
            "vitals": {"bp": "120/80", "hr": 72, "temp": 98.6},
        },
        ContextType.CLINICAL_SUMMARY: {
            "conditions": ["Osteoarthritis right knee", "Hypertension"],
            "medications": ["Lisinopril 10mg", "Ibuprofen 400mg PRN"],
            "allergies": ["Penicillin"],
            "last_visit": "2026-02-15",
        },
        ContextType.BILLING: {
            "insurance": "Aetna PPO",
            "copay": 25.00,
            "deductible_met": True,
            "active_claims": 1,
        },
        ContextType.MEDICATION: {
            "active": ["Lisinopril 10mg daily", "Ibuprofen 400mg PRN"],
            "interactions": [],
            "last_reconciliation": "2026-02-15",
        },
    },
    "p-002": {
        ContextType.ENCOUNTER: {
            "encounter_id": "enc-002",
            "status": "planned",
            "provider": "Dr. Michael Torres",
            "reason": "Annual dermatology screening",
        },
        ContextType.CLINICAL_SUMMARY: {
            "conditions": ["Eczema", "Vitamin D deficiency"],
            "medications": ["Vitamin D3 2000IU"],
            "allergies": [],
            "last_visit": "2026-01-20",
        },
        ContextType.BILLING: {
            "insurance": "Blue Cross Blue Shield",
            "copay": 40.00,
            "deductible_met": False,
            "active_claims": 0,
        },
    },
    "p-003": {
        ContextType.ENCOUNTER: {
            "encounter_id": "enc-003",
            "status": "finished",
            "provider": "Dr. Sarah Williams",
            "reason": "Post-op knee replacement follow-up",
        },
        ContextType.CLINICAL_SUMMARY: {
            "conditions": ["S/P total knee replacement", "Type 2 DM"],
            "medications": ["Metformin 500mg", "Oxycodone 5mg PRN"],
            "allergies": ["Sulfa drugs"],
            "last_visit": "2026-02-25",
        },
        ContextType.BILLING: {
            "insurance": "Medicare Part B",
            "copay": 0.00,
            "deductible_met": True,
            "active_claims": 2,
        },
        ContextType.DEVICE_VITALS: {
            "device": "Fitbit Sense 2",
            "last_sync": "2026-02-28T08:00:00Z",
            "daily_steps": 3200,
            "resting_hr": 68,
            "sleep_hours": 7.2,
        },
    },
    # --- System-wide contexts (keyed by entity ID, not patient ID) ---
    "system": {
        ContextType.SCHEDULING: {
            "providers": ["prov-001", "prov-002", "prov-003"],
            "total_slots_today": 48,
            "booked_slots_today": 31,
            "waitlist_count": 5,
            "next_available": "2026-03-01T10:30:00Z",
        },
        ContextType.AGENT_CONFIG: {
            "clinical_scribe": {
                "confidence_threshold": 0.85,
                "auto_approve_threshold": 0.95,
                "max_retries": 3,
            },
            "billing": {
                "confidence_threshold": 0.90,
                "auto_approve_threshold": 0.98,
            },
            "prior_auth": {
                "confidence_threshold": 0.85,
                "auto_approve_threshold": 0.95,
            },
            "tool_registry_version": "2.1.0",
        },
        ContextType.COMPLIANCE: {
            "hipaa_audit_enabled": True,
            "phi_encryption_required": True,
            "consent_management_active": True,
            "last_audit": "2026-02-15",
            "next_audit_due": "2026-05-15",
            "policy_version": "1.3",
        },
        ContextType.CLINICAL_PROTOCOLS: {
            "active_protocols": 12,
            "last_updated": "2026-02-20",
            "specialties": ["orthopedics", "dermatology"],
            "order_sets": {
                "knee_replacement_postop": "v2.1",
                "diabetes_management": "v3.0",
                "dermatology_screening": "v1.5",
            },
        },
    },
    "payer-aetna": {
        ContextType.PAYER_RULES: {
            "payer_id": "aetna",
            "payer_name": "Aetna PPO",
            "contracted_rates": {"99213": 125.00, "99214": 175.00},
            "prior_auth_required": ["27447", "29881"],
            "timely_filing_days": 90,
            "last_rules_update": "2026-02-01",
        },
    },
    "payer-bcbs": {
        ContextType.PAYER_RULES: {
            "payer_id": "bcbs",
            "payer_name": "Blue Cross Blue Shield",
            "contracted_rates": {"99213": 115.00, "99214": 160.00},
            "prior_auth_required": ["27447"],
            "timely_filing_days": 120,
            "last_rules_update": "2026-01-15",
        },
    },
    "formulary-default": {
        ContextType.FORMULARY: {
            "formulary_id": "default-2026",
            "version": "2026.Q1",
            "preferred_medications": [
                {"name": "Lisinopril", "tier": 1, "generic": True},
                {"name": "Metformin", "tier": 1, "generic": True},
                {"name": "Ibuprofen", "tier": 1, "generic": True},
            ],
            "non_formulary_requires_pa": True,
            "last_updated": "2026-01-01",
        },
    },
}


# ---------------------------------------------------------------------------
# Context Cache (tiered: hot -> warm -> cold)
# ---------------------------------------------------------------------------


class ContextCache:
    """Tiered context cache: hot (Redis) -> warm (vector) -> cold (PostgreSQL JSONB).

    In production, hot = Redis with TTL, warm = pgvector similarity store,
    cold = PostgreSQL JSONB (golden source). This mock uses in-memory dicts.
    """

    def __init__(self) -> None:
        self._hot_cache: dict[str, CachedContext] = {}   # Mock Redis
        self._warm_cache: dict[str, CachedContext] = {}   # Mock vector store
        self._cold_store: dict[str, CachedContext] = {}   # Mock PostgreSQL
        self._seed_mock_data()

    def _cache_key(self, patient_id: str, context_type: ContextType) -> str:
        return f"{patient_id}:{context_type.value}"

    def _seed_mock_data(self) -> None:
        """Pre-populate cache with mock contexts (patient + system)."""
        for patient_id, contexts in _MOCK_CONTEXTS.items():
            for ctx_type_str, data in contexts.items():
                ctx_type = ContextType(ctx_type_str) if isinstance(ctx_type_str, str) else ctx_type_str
                cached = CachedContext(
                    patient_id=patient_id,
                    context_type=ctx_type,
                    data=data,
                    cached_at=datetime.now(UTC),
                    source_consulted_at=datetime.now(UTC),
                    tier="hot",
                )
                key = self._cache_key(patient_id, ctx_type)
                self._hot_cache[key] = cached

    async def get(
        self, patient_id: str, context_type: ContextType,
    ) -> CachedContext | None:
        """Get context from the fastest available tier."""
        key = self._cache_key(patient_id, context_type)

        # Try hot (Redis) first
        if key in self._hot_cache:
            return self._hot_cache[key]

        # Try warm (vector)
        if key in self._warm_cache:
            ctx = self._warm_cache[key]
            # Promote to hot
            self._hot_cache[key] = ctx
            ctx.tier = "hot"
            return ctx

        # Try cold (PostgreSQL)
        if key in self._cold_store:
            ctx = self._cold_store[key]
            # Promote to hot
            self._hot_cache[key] = ctx
            ctx.tier = "hot"
            return ctx

        return None

    async def put(
        self,
        patient_id: str,
        context_type: ContextType,
        data: dict[str, Any],
        ttl_seconds: int = 900,
    ) -> None:
        """Store context in hot cache (with TTL in production)."""
        key = self._cache_key(patient_id, context_type)
        existing = self._hot_cache.get(key)
        version = (existing.version + 1) if existing else 1

        cached = CachedContext(
            patient_id=patient_id,
            context_type=context_type,
            data=data,
            cached_at=datetime.now(UTC),
            source_consulted_at=datetime.now(UTC),
            ttl_seconds=ttl_seconds,
            version=version,
            pending_changes=0,
            tier="hot",
        )
        self._hot_cache[key] = cached
        # Also persist to cold store (golden source backup)
        self._cold_store[key] = cached

        logger.info(
            "Cached %s context for patient %s (v%d, ttl=%ds)",
            context_type.value, patient_id, version, ttl_seconds,
        )

    async def invalidate(
        self, patient_id: str, context_type: ContextType,
    ) -> None:
        """Remove context from hot and warm caches (cold stays)."""
        key = self._cache_key(patient_id, context_type)
        self._hot_cache.pop(key, None)
        self._warm_cache.pop(key, None)
        logger.info(
            "Invalidated %s cache for patient %s",
            context_type.value, patient_id,
        )

    async def invalidate_patient(self, patient_id: str) -> None:
        """Remove ALL contexts for a patient from hot and warm caches."""
        prefix = f"{patient_id}:"
        hot_keys = [k for k in self._hot_cache if k.startswith(prefix)]
        warm_keys = [k for k in self._warm_cache if k.startswith(prefix)]
        for k in hot_keys:
            del self._hot_cache[k]
        for k in warm_keys:
            del self._warm_cache[k]
        logger.info(
            "Invalidated all caches for patient %s (%d hot, %d warm)",
            patient_id, len(hot_keys), len(warm_keys),
        )

    async def get_all_for_patient(
        self, patient_id: str,
    ) -> dict[ContextType, CachedContext]:
        """Get all cached contexts for a patient."""
        result: dict[ContextType, CachedContext] = {}
        prefix = f"{patient_id}:"
        for key, ctx in self._hot_cache.items():
            if key.startswith(prefix):
                result[ctx.context_type] = ctx
        # Fill from warm if missing
        for key, ctx in self._warm_cache.items():
            if key.startswith(prefix) and ctx.context_type not in result:
                result[ctx.context_type] = ctx
        # Fill from cold if missing
        for key, ctx in self._cold_store.items():
            if key.startswith(prefix) and ctx.context_type not in result:
                result[ctx.context_type] = ctx
        return result

    async def get_all_contexts(self) -> list[CachedContext]:
        """Get all cached contexts across all patients and tiers."""
        seen: dict[str, CachedContext] = {}
        for key, ctx in self._hot_cache.items():
            seen[key] = ctx
        for key, ctx in self._warm_cache.items():
            if key not in seen:
                seen[key] = ctx
        for key, ctx in self._cold_store.items():
            if key not in seen:
                seen[key] = ctx
        return list(seen.values())


# ---------------------------------------------------------------------------
# Rehydration Orchestrator
# ---------------------------------------------------------------------------


class RehydrationOrchestrator:
    """Orchestrates context rehydration when data changes.

    Handles both patient-level events (labs, vitals, medications) and
    system-wide events (payer rules, agent config, protocols, etc.).
    Determines which contexts are affected via the dependency graph
    and refreshes them according to urgency policy.
    """

    def __init__(self, cache: ContextCache | None = None) -> None:
        self.cache = cache or ContextCache()
        self._rehydration_log: list[RehydrationRecord] = []

    async def on_data_change(
        self, event: ContextChangeEvent,
    ) -> RehydrationResult:
        """Process a data change event and rehydrate affected contexts."""
        affected = DEPENDENCY_GRAPH.get(event.change_type, [])

        records: list[RehydrationRecord] = []
        refreshed = 0
        failed = 0

        for ctx_type in affected:
            urgency = CONTEXT_URGENCY.get(ctx_type, RefreshUrgency.LAZY)
            record = RehydrationRecord(
                patient_id=event.patient_id,
                context_type=ctx_type,
                urgency=urgency,
                trigger_event_id=event.event_id,
            )

            try:
                # Invalidate stale cache
                await self.cache.invalidate(event.patient_id, ctx_type)

                # Fetch fresh data from golden source (mock: use mock data)
                fresh_data = self._fetch_from_golden_source(
                    event.patient_id, ctx_type, event,
                )

                # Warm the cache with fresh data
                ttl = self._ttl_for_urgency(urgency)
                await self.cache.put(
                    event.patient_id, ctx_type, fresh_data, ttl_seconds=ttl,
                )

                record.completed_at = time.monotonic()
                record.success = True
                refreshed += 1

            except Exception:
                logger.exception(
                    "Failed to rehydrate %s for patient %s",
                    ctx_type.value, event.patient_id,
                )
                record.completed_at = time.monotonic()
                record.success = False
                failed += 1

            records.append(record)
            self._rehydration_log.append(record)

        logger.info(
            "Rehydration complete for %s: %d refreshed, %d failed (trigger: %s)",
            event.patient_id, refreshed, failed, event.change_type.value,
        )

        return RehydrationResult(
            event_id=event.event_id,
            patient_id=event.patient_id,
            change_type=event.change_type,
            affected_contexts=affected,
            records=records,
            total_refreshed=refreshed,
            total_failed=failed,
        )

    async def force_refresh(
        self, patient_id: str, context_type: ContextType,
    ) -> CachedContext:
        """Force refresh a specific context regardless of freshness."""
        record = RehydrationRecord(
            patient_id=patient_id,
            context_type=context_type,
            urgency=RefreshUrgency.IMMEDIATE,
        )

        await self.cache.invalidate(patient_id, context_type)

        fresh_data = self._fetch_from_golden_source(patient_id, context_type)
        await self.cache.put(patient_id, context_type, fresh_data)

        record.completed_at = time.monotonic()
        record.success = True
        self._rehydration_log.append(record)

        ctx = await self.cache.get(patient_id, context_type)
        assert ctx is not None  # We just put it
        return ctx

    async def get_staleness_report(self, patient_id: str) -> dict[str, Any]:
        """Get a staleness report for all contexts of an entity (patient or system key)."""
        contexts = await self.cache.get_all_for_patient(patient_id)
        now = datetime.now(UTC)
        report: dict[str, Any] = {
            "patient_id": patient_id,
            "contexts": {},
            "total_contexts": len(contexts),
        }

        for ctx_type, cached in contexts.items():
            age_seconds = (now - cached.cached_at).total_seconds()
            report["contexts"][ctx_type.value] = {
                "cached_at": cached.cached_at.isoformat(),
                "age_seconds": round(age_seconds, 1),
                "version": cached.version,
                "tier": cached.tier,
                "pending_changes": cached.pending_changes,
                "ttl_seconds": cached.ttl_seconds,
                "expired": age_seconds > cached.ttl_seconds,
            }

        return report

    def get_dependency_graph(
        self, change_type: ChangeType | None = None,
    ) -> dict[str, list[str]]:
        """Get the dependency graph, optionally filtered by change type."""
        if change_type is not None:
            affected = DEPENDENCY_GRAPH.get(change_type, [])
            return {change_type.value: [ct.value for ct in affected]}

        return {
            ct.value: [ctx.value for ctx in contexts]
            for ct, contexts in DEPENDENCY_GRAPH.items()
        }

    def get_rehydration_log(self) -> list[RehydrationRecord]:
        """Get all rehydration records for metrics."""
        return list(self._rehydration_log)

    def _fetch_from_golden_source(
        self,
        patient_id: str,
        context_type: ContextType,
        event: ContextChangeEvent | None = None,
    ) -> dict[str, Any]:
        """Fetch fresh context data from the golden source.

        For patient contexts, the golden source is the EMR (FHIR API).
        For system contexts, the golden source is the config store.
        For now, returns mock data augmented with event info.
        """
        base_data = (
            _MOCK_CONTEXTS
            .get(patient_id, {})
            .get(context_type, {"status": "no_data"})
        )

        # Return a copy so mutations don't affect mock data
        fresh = dict(base_data)
        fresh["_refreshed_at"] = datetime.now(UTC).isoformat()
        fresh["_source"] = "emr_golden"

        if event:
            fresh["_trigger"] = event.change_type.value

        return fresh

    @staticmethod
    def _ttl_for_urgency(urgency: RefreshUrgency) -> int:
        """Return TTL in seconds based on refresh urgency."""
        return {
            RefreshUrgency.IMMEDIATE: 300,    # 5 min (active, refresh often)
            RefreshUrgency.SOON: 900,          # 15 min
            RefreshUrgency.BATCH: 3600,        # 1 hour
            RefreshUrgency.LAZY: 7200,         # 2 hours
        }.get(urgency, 900)
