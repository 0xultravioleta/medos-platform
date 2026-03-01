"""Tests for Context Rehydration Engine."""

import pytest

from medos.core.context_rehydration import (
    CachedContext,
    ChangeType,
    ContextCache,
    ContextChangeEvent,
    ContextType,
    CONTEXT_URGENCY,
    DEPENDENCY_GRAPH,
    RefreshUrgency,
    RehydrationOrchestrator,
)


# ---------------------------------------------------------------------------
# ContextChangeEvent
# ---------------------------------------------------------------------------


def test_context_change_event_creation():
    event = ContextChangeEvent(
        change_type=ChangeType.LAB_RECEIVED,
        patient_id="p-001",
        tenant_id="tenant-1",
        resource_type="Observation",
        resource_id="obs-001",
    )
    assert event.change_type == ChangeType.LAB_RECEIVED
    assert event.patient_id == "p-001"
    assert event.event_id  # auto-generated UUID
    assert event.source == "emr"


# ---------------------------------------------------------------------------
# Dependency Graph
# ---------------------------------------------------------------------------


def test_dependency_graph_lab_received():
    affected = DEPENDENCY_GRAPH[ChangeType.LAB_RECEIVED]
    assert ContextType.ENCOUNTER in affected
    assert ContextType.CLINICAL_SUMMARY in affected
    assert ContextType.ANALYTICS in affected
    assert ContextType.BILLING not in affected


def test_dependency_graph_device_reading():
    affected = DEPENDENCY_GRAPH[ChangeType.DEVICE_READING]
    assert ContextType.DEVICE_VITALS in affected
    assert ContextType.CLINICAL_SUMMARY in affected
    assert ContextType.ANALYTICS in affected
    assert ContextType.MEDICATION not in affected


def test_dependency_graph_medication_changed():
    affected = DEPENDENCY_GRAPH[ChangeType.MEDICATION_CHANGED]
    assert ContextType.ENCOUNTER in affected
    assert ContextType.CLINICAL_SUMMARY in affected
    assert ContextType.MEDICATION in affected
    assert ContextType.CARE_PLAN in affected
    assert len(affected) == 4


# ---------------------------------------------------------------------------
# ContextCache
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cache_put_and_get():
    cache = ContextCache()
    await cache.put("p-test", ContextType.ENCOUNTER, {"status": "active"}, ttl_seconds=600)
    result = await cache.get("p-test", ContextType.ENCOUNTER)
    assert result is not None
    assert result.data["status"] == "active"
    assert result.patient_id == "p-test"
    assert result.context_type == ContextType.ENCOUNTER
    assert result.ttl_seconds == 600


@pytest.mark.asyncio
async def test_cache_invalidate():
    cache = ContextCache()
    await cache.put("p-test", ContextType.BILLING, {"insurance": "Aetna"})
    await cache.invalidate("p-test", ContextType.BILLING)
    # Hot and warm should be gone, but cold remains
    result = await cache.get("p-test", ContextType.BILLING)
    # It gets promoted back from cold store
    assert result is not None
    assert result.data["insurance"] == "Aetna"


@pytest.mark.asyncio
async def test_cache_invalidate_patient():
    cache = ContextCache()
    await cache.put("p-clear", ContextType.ENCOUNTER, {"a": 1})
    await cache.put("p-clear", ContextType.BILLING, {"b": 2})
    await cache.put("p-keep", ContextType.ENCOUNTER, {"c": 3})

    await cache.invalidate_patient("p-clear")

    # p-clear contexts removed from hot (but cold remains)
    keep = await cache.get("p-keep", ContextType.ENCOUNTER)
    assert keep is not None
    assert keep.data["c"] == 3


# ---------------------------------------------------------------------------
# RehydrationOrchestrator
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rehydration_on_lab_result():
    orchestrator = RehydrationOrchestrator()
    event = ContextChangeEvent(
        change_type=ChangeType.LAB_RECEIVED,
        patient_id="p-001",
        tenant_id="tenant-1",
    )
    result = await orchestrator.on_data_change(event)
    assert result.patient_id == "p-001"
    assert result.change_type == ChangeType.LAB_RECEIVED
    expected = DEPENDENCY_GRAPH[ChangeType.LAB_RECEIVED]
    assert result.affected_contexts == expected
    assert result.total_refreshed == len(expected)
    assert result.total_failed == 0


@pytest.mark.asyncio
async def test_rehydration_on_device_reading():
    orchestrator = RehydrationOrchestrator()
    event = ContextChangeEvent(
        change_type=ChangeType.DEVICE_READING,
        patient_id="p-003",
        tenant_id="tenant-1",
    )
    result = await orchestrator.on_data_change(event)
    assert ContextType.DEVICE_VITALS in result.affected_contexts
    assert result.total_refreshed == len(DEPENDENCY_GRAPH[ChangeType.DEVICE_READING])


@pytest.mark.asyncio
async def test_rehydration_immediate_urgency():
    """Encounter context should have IMMEDIATE urgency."""
    assert CONTEXT_URGENCY[ContextType.ENCOUNTER] == RefreshUrgency.IMMEDIATE
    assert CONTEXT_URGENCY[ContextType.MEDICATION] == RefreshUrgency.IMMEDIATE


@pytest.mark.asyncio
async def test_rehydration_batch_urgency():
    """Analytics context should have BATCH urgency."""
    assert CONTEXT_URGENCY[ContextType.ANALYTICS] == RefreshUrgency.BATCH


@pytest.mark.asyncio
async def test_force_refresh():
    orchestrator = RehydrationOrchestrator()
    result = await orchestrator.force_refresh("p-001", ContextType.ENCOUNTER)
    assert result.patient_id == "p-001"
    assert result.context_type == ContextType.ENCOUNTER
    assert result.data["_source"] == "emr_golden"
    assert result.data["_refreshed_at"]  # timestamp present


@pytest.mark.asyncio
async def test_staleness_report():
    orchestrator = RehydrationOrchestrator()
    report = await orchestrator.get_staleness_report("p-001")
    assert report["patient_id"] == "p-001"
    assert report["total_contexts"] > 0
    assert "contexts" in report
    # p-001 has encounter, clinical_summary, billing, medication
    for ctx_name, info in report["contexts"].items():
        assert "cached_at" in info
        assert "age_seconds" in info
        assert "version" in info


def test_get_dependency_graph_all():
    orchestrator = RehydrationOrchestrator()
    graph = orchestrator.get_dependency_graph()
    assert len(graph) == len(ChangeType)
    for change_type in ChangeType:
        assert change_type.value in graph


def test_get_dependency_graph_filtered():
    orchestrator = RehydrationOrchestrator()
    graph = orchestrator.get_dependency_graph(ChangeType.INSURANCE_UPDATED)
    assert len(graph) == 1
    assert ChangeType.INSURANCE_UPDATED.value in graph
    affected = graph[ChangeType.INSURANCE_UPDATED.value]
    assert "billing" in affected
    assert "payer_rules" in affected


# ---------------------------------------------------------------------------
# System-wide change types
# ---------------------------------------------------------------------------


def test_dependency_graph_payer_rules_updated():
    affected = DEPENDENCY_GRAPH[ChangeType.PAYER_RULES_UPDATED]
    assert ContextType.BILLING in affected
    assert ContextType.PAYER_RULES in affected
    assert len(affected) == 2


def test_dependency_graph_provider_schedule_changed():
    affected = DEPENDENCY_GRAPH[ChangeType.PROVIDER_SCHEDULE_CHANGED]
    assert ContextType.SCHEDULING in affected
    assert len(affected) == 1


def test_dependency_graph_agent_config_updated():
    affected = DEPENDENCY_GRAPH[ChangeType.AGENT_CONFIG_UPDATED]
    assert ContextType.AGENT_CONFIG in affected


def test_dependency_graph_protocol_clinical_updated():
    affected = DEPENDENCY_GRAPH[ChangeType.PROTOCOL_CLINICAL_UPDATED]
    assert ContextType.CLINICAL_PROTOCOLS in affected
    assert ContextType.ENCOUNTER in affected
    assert ContextType.CARE_PLAN in affected
    assert len(affected) == 3


def test_dependency_graph_formulary_updated():
    affected = DEPENDENCY_GRAPH[ChangeType.FORMULARY_UPDATED]
    assert ContextType.FORMULARY in affected
    assert ContextType.MEDICATION in affected
    assert len(affected) == 2


def test_dependency_graph_compliance_policy_changed():
    affected = DEPENDENCY_GRAPH[ChangeType.COMPLIANCE_POLICY_CHANGED]
    assert ContextType.COMPLIANCE in affected
    assert len(affected) == 1


def test_dependency_graph_mcp_tools_changed():
    affected = DEPENDENCY_GRAPH[ChangeType.SYSTEM_MCP_TOOLS_CHANGED]
    assert ContextType.AGENT_CONFIG in affected


def test_appointment_changed_includes_scheduling():
    """Appointment changes should now also affect scheduling context."""
    affected = DEPENDENCY_GRAPH[ChangeType.APPOINTMENT_CHANGED]
    assert ContextType.SCHEDULING in affected
    assert ContextType.ENCOUNTER in affected
    assert ContextType.CARE_PLAN in affected


# ---------------------------------------------------------------------------
# System-wide urgency
# ---------------------------------------------------------------------------


def test_system_context_urgency():
    """System-wide contexts should have appropriate urgency levels."""
    assert CONTEXT_URGENCY[ContextType.SCHEDULING] == RefreshUrgency.SOON
    assert CONTEXT_URGENCY[ContextType.PAYER_RULES] == RefreshUrgency.BATCH
    assert CONTEXT_URGENCY[ContextType.AGENT_CONFIG] == RefreshUrgency.IMMEDIATE
    assert CONTEXT_URGENCY[ContextType.CLINICAL_PROTOCOLS] == RefreshUrgency.SOON
    assert CONTEXT_URGENCY[ContextType.FORMULARY] == RefreshUrgency.SOON
    assert CONTEXT_URGENCY[ContextType.COMPLIANCE] == RefreshUrgency.IMMEDIATE


# ---------------------------------------------------------------------------
# System-wide rehydration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rehydration_on_payer_rules_update():
    orchestrator = RehydrationOrchestrator()
    event = ContextChangeEvent(
        change_type=ChangeType.PAYER_RULES_UPDATED,
        patient_id="payer-aetna",
        tenant_id="tenant-1",
        scope="system",
    )
    result = await orchestrator.on_data_change(event)
    assert result.patient_id == "payer-aetna"
    assert ContextType.BILLING in result.affected_contexts
    assert ContextType.PAYER_RULES in result.affected_contexts
    assert result.total_refreshed == 2
    assert result.total_failed == 0


@pytest.mark.asyncio
async def test_rehydration_on_agent_config_update():
    orchestrator = RehydrationOrchestrator()
    event = ContextChangeEvent(
        change_type=ChangeType.AGENT_CONFIG_UPDATED,
        patient_id="system",
        tenant_id="tenant-1",
        scope="system",
    )
    result = await orchestrator.on_data_change(event)
    assert ContextType.AGENT_CONFIG in result.affected_contexts
    assert result.total_refreshed == 1


@pytest.mark.asyncio
async def test_rehydration_on_protocol_update():
    orchestrator = RehydrationOrchestrator()
    event = ContextChangeEvent(
        change_type=ChangeType.PROTOCOL_CLINICAL_UPDATED,
        patient_id="system",
        tenant_id="tenant-1",
        scope="system",
    )
    result = await orchestrator.on_data_change(event)
    assert ContextType.CLINICAL_PROTOCOLS in result.affected_contexts
    assert ContextType.ENCOUNTER in result.affected_contexts
    assert ContextType.CARE_PLAN in result.affected_contexts
    assert result.total_refreshed == 3


@pytest.mark.asyncio
async def test_force_refresh_system_context():
    orchestrator = RehydrationOrchestrator()
    result = await orchestrator.force_refresh("system", ContextType.AGENT_CONFIG)
    assert result.patient_id == "system"
    assert result.context_type == ContextType.AGENT_CONFIG
    assert result.data["_source"] == "emr_golden"


@pytest.mark.asyncio
async def test_staleness_report_system():
    orchestrator = RehydrationOrchestrator()
    report = await orchestrator.get_staleness_report("system")
    assert report["patient_id"] == "system"
    assert report["total_contexts"] > 0
    # system has scheduling, agent_config, compliance, clinical_protocols
    assert len(report["contexts"]) >= 4


@pytest.mark.asyncio
async def test_cache_system_contexts_seeded():
    cache = ContextCache()
    ctx = await cache.get("system", ContextType.AGENT_CONFIG)
    assert ctx is not None
    assert "clinical_scribe" in ctx.data

    ctx2 = await cache.get("payer-aetna", ContextType.PAYER_RULES)
    assert ctx2 is not None
    assert ctx2.data["payer_name"] == "Aetna PPO"

    ctx3 = await cache.get("formulary-default", ContextType.FORMULARY)
    assert ctx3 is not None
    assert ctx3.data["version"] == "2026.Q1"


def test_context_change_event_scope():
    """System-wide events should have scope='system'."""
    event = ContextChangeEvent(
        change_type=ChangeType.PAYER_RULES_UPDATED,
        patient_id="payer-aetna",
        scope="system",
    )
    assert event.scope == "system"

    patient_event = ContextChangeEvent(
        change_type=ChangeType.LAB_RECEIVED,
        patient_id="p-001",
    )
    assert patient_event.scope == "patient"
