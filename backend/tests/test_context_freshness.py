"""Tests for Context Freshness Monitor."""

from datetime import UTC, datetime, timedelta

import pytest

from medos.core.context_freshness import (
    FreshnessMetrics,
    FreshnessScorer,
    StalenessDetector,
)
from medos.core.context_rehydration import (
    CachedContext,
    ContextType,
    RehydrationOrchestrator,
)


# ---------------------------------------------------------------------------
# FreshnessScorer - overall score
# ---------------------------------------------------------------------------


def test_freshness_score_fresh_context():
    """A context cached just now with source consulted and no pending changes = fresh."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={"status": "active"},
        cached_at=datetime.now(UTC),
        source_consulted_at=datetime.now(UTC),
        pending_changes=0,
    )
    score = scorer.score(ctx)
    assert score.overall_score >= 0.95
    assert not score.is_stale
    assert not score.is_critical


def test_freshness_score_stale_context():
    """A context cached 45 minutes ago with no source consult = stale."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.CLINICAL_SUMMARY,
        data={"conditions": []},
        cached_at=datetime.now(UTC) - timedelta(minutes=45),
        source_consulted_at=datetime.now(UTC) - timedelta(hours=2),
        pending_changes=2,
    )
    score = scorer.score(ctx)
    assert score.overall_score < 0.75
    assert score.is_stale


def test_freshness_score_very_stale():
    """A context cached 3 hours ago with no source consult and pending changes = critical."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.BILLING,
        data={"insurance": "old"},
        cached_at=datetime.now(UTC) - timedelta(hours=3),
        source_consulted_at=None,
        pending_changes=5,
    )
    score = scorer.score(ctx)
    assert score.overall_score < 0.50
    assert score.is_stale
    assert score.is_critical


# ---------------------------------------------------------------------------
# FreshnessScorer - time decay
# ---------------------------------------------------------------------------


def test_time_decay_fresh():
    """Context cached less than 5 minutes ago should be close to 1.0."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={},
        cached_at=datetime.now(UTC) - timedelta(minutes=2),
        source_consulted_at=datetime.now(UTC),
        pending_changes=0,
    )
    score = scorer.score(ctx)
    assert score.time_score > 0.9


def test_time_decay_medium():
    """Context cached 30 minutes ago (half-life) should be ~0.5."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={},
        cached_at=datetime.now(UTC) - timedelta(minutes=30),
        source_consulted_at=datetime.now(UTC),
        pending_changes=0,
    )
    score = scorer.score(ctx)
    assert 0.4 < score.time_score < 0.6


def test_time_decay_old():
    """Context cached 2 hours ago should be close to 0."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={},
        cached_at=datetime.now(UTC) - timedelta(hours=2),
        source_consulted_at=datetime.now(UTC),
        pending_changes=0,
    )
    score = scorer.score(ctx)
    assert score.time_score < 0.15


# ---------------------------------------------------------------------------
# FreshnessScorer - source recency
# ---------------------------------------------------------------------------


def test_source_recency_just_consulted():
    """Source consulted just now should score 1.0."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={},
        cached_at=datetime.now(UTC),
        source_consulted_at=datetime.now(UTC),
        pending_changes=0,
    )
    score = scorer.score(ctx)
    assert score.source_score >= 0.99


def test_source_recency_never_consulted():
    """Source never consulted should score 0.0."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={},
        cached_at=datetime.now(UTC),
        source_consulted_at=None,
        pending_changes=0,
    )
    score = scorer.score(ctx)
    assert score.source_score == 0.0


# ---------------------------------------------------------------------------
# FreshnessScorer - change incorporation
# ---------------------------------------------------------------------------


def test_change_incorporation_no_pending():
    """No pending changes should score 1.0."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={},
        cached_at=datetime.now(UTC),
        source_consulted_at=datetime.now(UTC),
        pending_changes=0,
    )
    score = scorer.score(ctx)
    assert score.change_score == 1.0


def test_change_incorporation_many_pending():
    """5 pending changes should score ~0.167."""
    scorer = FreshnessScorer()
    ctx = CachedContext(
        patient_id="p-001",
        context_type=ContextType.ENCOUNTER,
        data={},
        cached_at=datetime.now(UTC),
        source_consulted_at=datetime.now(UTC),
        pending_changes=5,
    )
    score = scorer.score(ctx)
    expected = 1.0 / 6.0  # 1/(1+5)
    assert abs(score.change_score - expected) < 0.01


# ---------------------------------------------------------------------------
# StalenessDetector
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_staleness_detector_check_patient():
    orchestrator = RehydrationOrchestrator()
    detector = StalenessDetector(orchestrator=orchestrator)
    report = await detector.check_patient("p-001")
    assert report.patient_id == "p-001"
    assert report.total_contexts > 0
    assert len(report.scores) == report.total_contexts
    # Fresh contexts (just cached) should all be fresh
    assert report.fresh_count + report.stale_count + report.critical_count == report.total_contexts


@pytest.mark.asyncio
async def test_freshness_metrics():
    orchestrator = RehydrationOrchestrator()
    detector = StalenessDetector(orchestrator=orchestrator)
    metrics = await detector.get_metrics()
    assert isinstance(metrics, FreshnessMetrics)
    assert metrics.total_contexts > 0
    assert metrics.fresh_count + metrics.stale_count == metrics.total_contexts
    assert 0.0 <= metrics.average_freshness <= 1.0
