"""Context MCP Server - 4 tools for context freshness and rehydration.

Exposes the Context Rehydration Engine and Freshness Monitor as MCP
tools for AI agents to query context health and force refreshes.

Tools:
    context_get_freshness      - Get freshness scores for a patient
    context_force_refresh      - Force rehydration of a specific context
    context_get_dependency_graph - View the data dependency graph
    context_get_staleness_report - System-wide staleness report
"""

from __future__ import annotations

import logging
from typing import Any

from medos.core.context_freshness import FreshnessScorer, StalenessDetector
from medos.core.context_rehydration import (
    ChangeType,
    ContextType,
    RehydrationOrchestrator,
)
from medos.mcp.decorators import hipaa_tool
from medos.schemas.agent import AgentType

logger = logging.getLogger(__name__)

# Agent types that can access context tools
_CONTEXT_AGENTS = [
    AgentType.CLINICAL_SCRIBE,
    AgentType.SYSTEM,
    AgentType.PRIOR_AUTH,
    AgentType.DENIAL_MANAGEMENT,
    AgentType.BILLING,
]

# Shared instances (initialized at registration)
_orchestrator: RehydrationOrchestrator | None = None
_detector: StalenessDetector | None = None


def _get_orchestrator() -> RehydrationOrchestrator:
    global _orchestrator  # noqa: PLW0603
    if _orchestrator is None:
        _orchestrator = RehydrationOrchestrator()
    return _orchestrator


def _get_detector() -> StalenessDetector:
    global _detector  # noqa: PLW0603
    if _detector is None:
        _detector = StalenessDetector(
            scorer=FreshnessScorer(),
            orchestrator=_get_orchestrator(),
        )
    return _detector


# ---------------------------------------------------------------------------
# Tool Handlers
# ---------------------------------------------------------------------------


@hipaa_tool(phi_level="limited", allowed_agents=_CONTEXT_AGENTS, server="context")
async def context_get_freshness(patient_id: str = "") -> dict[str, Any]:
    """Get freshness scores for all contexts of a patient.

    Returns per-context freshness scores (0.0-1.0) with breakdown
    of time decay, source recency, and change incorporation signals.
    Scores below 0.75 indicate stale context needing refresh.
    """
    if not patient_id:
        return {"error": "patient_id is required"}

    detector = _get_detector()
    report = await detector.check_patient(patient_id)

    return {
        "patient_id": report.patient_id,
        "total_contexts": report.total_contexts,
        "fresh_count": report.fresh_count,
        "stale_count": report.stale_count,
        "critical_count": report.critical_count,
        "average_freshness": report.average_freshness,
        "contexts_needing_refresh": [
            ct.value for ct in report.contexts_needing_refresh
        ],
        "scores": [
            {
                "context_type": s.context_type.value,
                "overall_score": s.overall_score,
                "time_score": s.time_score,
                "source_score": s.source_score,
                "change_score": s.change_score,
                "is_stale": s.is_stale,
                "is_critical": s.is_critical,
                "age_seconds": s.age_seconds,
            }
            for s in report.scores
        ],
    }


@hipaa_tool(phi_level="limited", allowed_agents=_CONTEXT_AGENTS, server="context")
async def context_force_refresh(
    patient_id: str = "", context_type: str = "",
) -> dict[str, Any]:
    """Force rehydration of a specific patient context.

    Invalidates the cached version and fetches fresh data from
    the EMR golden source. Returns the refreshed context metadata.
    """
    if not patient_id:
        return {"error": "patient_id is required"}
    if not context_type:
        return {"error": "context_type is required"}

    try:
        ctx_type = ContextType(context_type)
    except ValueError:
        valid = [ct.value for ct in ContextType]
        return {"error": f"Invalid context_type. Valid: {valid}"}

    orchestrator = _get_orchestrator()
    cached = await orchestrator.force_refresh(patient_id, ctx_type)

    return {
        "patient_id": cached.patient_id,
        "context_type": cached.context_type.value,
        "version": cached.version,
        "cached_at": cached.cached_at.isoformat(),
        "tier": cached.tier,
        "ttl_seconds": cached.ttl_seconds,
        "status": "refreshed",
    }


@hipaa_tool(phi_level="none", allowed_agents=_CONTEXT_AGENTS, server="context")
async def context_get_dependency_graph(
    change_type: str | None = None,
) -> dict[str, Any]:
    """Get the context dependency graph showing what data feeds what context.

    Optionally filter by a specific change type to see only its
    downstream context dependencies.
    """
    orchestrator = _get_orchestrator()

    ct: ChangeType | None = None
    if change_type:
        try:
            ct = ChangeType(change_type)
        except ValueError:
            valid = [c.value for c in ChangeType]
            return {"error": f"Invalid change_type. Valid: {valid}"}

    graph = orchestrator.get_dependency_graph(ct)
    return {
        "filter": change_type,
        "graph": graph,
        "total_change_types": len(graph),
    }


@hipaa_tool(phi_level="none", allowed_agents=_CONTEXT_AGENTS, server="context")
async def context_get_staleness_report() -> dict[str, Any]:
    """Get report of all stale contexts across the system.

    Returns per-patient freshness summaries and system-wide metrics
    including rehydration latency percentiles.
    """
    detector = _get_detector()
    metrics = await detector.get_metrics()
    reports = await detector.check_all_active()

    return {
        "metrics": {
            "total_contexts": metrics.total_contexts,
            "fresh_count": metrics.fresh_count,
            "stale_count": metrics.stale_count,
            "critical_stale": metrics.critical_stale,
            "average_freshness": metrics.average_freshness,
            "oldest_context_age_seconds": metrics.oldest_context_age_seconds,
            "rehydrations_last_hour": metrics.rehydrations_last_hour,
            "rehydration_latency_p50_ms": metrics.rehydration_latency_p50_ms,
            "rehydration_latency_p95_ms": metrics.rehydration_latency_p95_ms,
            "rehydration_latency_p99_ms": metrics.rehydration_latency_p99_ms,
        },
        "patients": [
            {
                "patient_id": r.patient_id,
                "total_contexts": r.total_contexts,
                "fresh": r.fresh_count,
                "stale": r.stale_count,
                "critical": r.critical_count,
                "average_freshness": r.average_freshness,
                "needs_refresh": [ct.value for ct in r.contexts_needing_refresh],
            }
            for r in reports
        ],
    }


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def register_context_tools() -> None:
    """Initialize context tools. Registration happens via @hipaa_tool decorators."""
    # Force initialization of shared instances
    _get_orchestrator()
    _get_detector()
    logger.info("Context server initialized with 4 tools")
