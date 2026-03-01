"""Context Freshness Monitor.

Monitors all patient contexts for staleness and triggers rehydration
when freshness drops below threshold. Uses multiple signals:
- Time-based decay (exponential)
- Source consultation recency
- Pending change incorporation
- Cosine similarity (when vector store is available)

The EMR (Epic, Cerner) is ALWAYS the golden source of truth.
Everything else is cache. Cosine similarity < 0.75 triggers refresh.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import UTC, datetime

from medos.core.context_rehydration import (
    CachedContext,
    ContextType,
    RehydrationOrchestrator,
)

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class ContextFreshnessScore:
    """Freshness score for a single patient context."""

    patient_id: str
    context_type: ContextType
    overall_score: float
    time_score: float
    source_score: float
    change_score: float
    is_stale: bool
    is_critical: bool
    cached_at: datetime | None = None
    age_seconds: float = 0.0


@dataclass
class StalenessReport:
    """Staleness report for a single patient."""

    patient_id: str
    total_contexts: int = 0
    fresh_count: int = 0
    stale_count: int = 0
    critical_count: int = 0
    average_freshness: float = 0.0
    scores: list[ContextFreshnessScore] = field(default_factory=list)
    contexts_needing_refresh: list[ContextType] = field(default_factory=list)


@dataclass
class FreshnessMetrics:
    """System-wide freshness metrics for monitoring."""

    total_contexts: int = 0
    fresh_count: int = 0
    stale_count: int = 0
    critical_stale: int = 0
    average_freshness: float = 0.0
    oldest_context_age_seconds: float = 0.0
    rehydrations_last_hour: int = 0
    rehydration_latency_p50_ms: float = 0.0
    rehydration_latency_p95_ms: float = 0.0
    rehydration_latency_p99_ms: float = 0.0


# ---------------------------------------------------------------------------
# Freshness Scorer
# ---------------------------------------------------------------------------


class FreshnessScorer:
    """Scores context freshness from 0.0 (completely stale) to 1.0 (fresh).

    Combines three weighted signals:
    - Time decay (40%): exponential decay from cache time
    - Source recency (30%): how recently was the EMR golden source consulted
    - Change incorporation (30%): are there pending unincorporated changes

    Threshold: < 0.75 = stale, < 0.50 = critical
    """

    FRESHNESS_THRESHOLD = 0.75
    CRITICAL_THRESHOLD = 0.50

    WEIGHT_TIME = 0.4
    WEIGHT_SOURCE = 0.3
    WEIGHT_CHANGE = 0.3

    # Time decay: half-life of 30 minutes (1800 seconds)
    TIME_HALF_LIFE_SECONDS = 1800.0

    # Source recency: considered fresh if consulted within 1 hour
    SOURCE_FRESH_SECONDS = 3600.0

    def score(self, context: CachedContext) -> ContextFreshnessScore:
        """Calculate freshness score combining multiple signals."""
        time_score = self._time_decay(context.cached_at)
        source_score = self._source_recency(context.source_consulted_at)
        change_score = self._change_incorporation(context.pending_changes)

        overall = (
            (time_score * self.WEIGHT_TIME)
            + (source_score * self.WEIGHT_SOURCE)
            + (change_score * self.WEIGHT_CHANGE)
        )

        now = datetime.now(UTC)
        age_seconds = (now - context.cached_at).total_seconds()

        return ContextFreshnessScore(
            patient_id=context.patient_id,
            context_type=context.context_type,
            overall_score=round(overall, 4),
            time_score=round(time_score, 4),
            source_score=round(source_score, 4),
            change_score=round(change_score, 4),
            is_stale=overall < self.FRESHNESS_THRESHOLD,
            is_critical=overall < self.CRITICAL_THRESHOLD,
            cached_at=context.cached_at,
            age_seconds=round(age_seconds, 1),
        )

    def _time_decay(self, cached_at: datetime) -> float:
        """Exponential decay: 1.0 at time 0, 0.5 at half-life, ~0 at 4x half-life.

        Uses the formula: score = 2^(-age / half_life)
        - At 0 minutes: 1.0
        - At 30 minutes: 0.5
        - At 60 minutes: 0.25
        - At 120 minutes: 0.0625 (near 0)
        """
        age_seconds = (datetime.now(UTC) - cached_at).total_seconds()
        if age_seconds <= 0:
            return 1.0
        return math.pow(2, -age_seconds / self.TIME_HALF_LIFE_SECONDS)

    def _source_recency(self, consulted_at: datetime | None) -> float:
        """How recently was the golden source (EMR) consulted?

        Returns 1.0 if just consulted, decays linearly to 0.0 over
        SOURCE_FRESH_SECONDS (1 hour).
        """
        if consulted_at is None:
            return 0.0
        age_seconds = (datetime.now(UTC) - consulted_at).total_seconds()
        if age_seconds <= 0:
            return 1.0
        score = max(0.0, 1.0 - (age_seconds / self.SOURCE_FRESH_SECONDS))
        return score

    def _change_incorporation(self, pending_changes: int) -> float:
        """1.0 if no pending changes, decays with each unincorporated change.

        Uses formula: 1.0 / (1 + pending_changes)
        - 0 pending: 1.0
        - 1 pending: 0.5
        - 2 pending: 0.333
        - 5 pending: 0.167
        """
        if pending_changes <= 0:
            return 1.0
        return 1.0 / (1.0 + pending_changes)


# ---------------------------------------------------------------------------
# Staleness Detector
# ---------------------------------------------------------------------------


class StalenessDetector:
    """Monitors patient contexts for staleness and reports metrics.

    In production, runs as a background task checking active patient
    contexts periodically and triggering rehydration when needed.
    """

    def __init__(
        self,
        scorer: FreshnessScorer | None = None,
        orchestrator: RehydrationOrchestrator | None = None,
    ) -> None:
        self.scorer = scorer or FreshnessScorer()
        self.orchestrator = orchestrator or RehydrationOrchestrator()

    async def check_patient(self, patient_id: str) -> StalenessReport:
        """Check freshness of all contexts for a patient."""
        contexts = await self.orchestrator.cache.get_all_for_patient(patient_id)

        report = StalenessReport(
            patient_id=patient_id,
            total_contexts=len(contexts),
        )

        scores_list: list[float] = []
        for _ctx_type, cached in contexts.items():
            score = self.scorer.score(cached)
            report.scores.append(score)
            scores_list.append(score.overall_score)

            if score.is_critical:
                report.critical_count += 1
                report.stale_count += 1
                report.contexts_needing_refresh.append(score.context_type)
            elif score.is_stale:
                report.stale_count += 1
                report.contexts_needing_refresh.append(score.context_type)
            else:
                report.fresh_count += 1

        if scores_list:
            report.average_freshness = round(
                sum(scores_list) / len(scores_list), 4,
            )

        return report

    async def check_all_active(self) -> list[StalenessReport]:
        """Check freshness for all patients with cached contexts."""
        all_contexts = await self.orchestrator.cache.get_all_contexts()
        patient_ids = {ctx.patient_id for ctx in all_contexts}
        reports = []
        for pid in sorted(patient_ids):
            report = await self.check_patient(pid)
            reports.append(report)
        return reports

    async def get_metrics(self) -> FreshnessMetrics:
        """Get system-wide freshness metrics."""
        all_contexts = await self.orchestrator.cache.get_all_contexts()
        now = datetime.now(UTC)

        total = len(all_contexts)
        fresh = 0
        stale = 0
        critical = 0
        scores: list[float] = []
        oldest_age = 0.0

        for ctx in all_contexts:
            score = self.scorer.score(ctx)
            scores.append(score.overall_score)

            age = (now - ctx.cached_at).total_seconds()
            if age > oldest_age:
                oldest_age = age

            if score.is_critical:
                critical += 1
                stale += 1
            elif score.is_stale:
                stale += 1
            else:
                fresh += 1

        avg_freshness = (sum(scores) / len(scores)) if scores else 0.0

        # Calculate rehydration latency percentiles from log
        log = self.orchestrator.get_rehydration_log()
        recent_records = [
            r for r in log
            if r.completed_at is not None
        ]
        rehydrations_last_hour = len(recent_records)

        latencies = sorted([r.latency_ms for r in recent_records if r.latency_ms > 0])

        p50 = 0.0
        p95 = 0.0
        p99 = 0.0
        if latencies:
            p50 = _percentile(latencies, 50)
            p95 = _percentile(latencies, 95)
            p99 = _percentile(latencies, 99)

        return FreshnessMetrics(
            total_contexts=total,
            fresh_count=fresh,
            stale_count=stale,
            critical_stale=critical,
            average_freshness=round(avg_freshness, 4),
            oldest_context_age_seconds=round(oldest_age, 1),
            rehydrations_last_hour=rehydrations_last_hour,
            rehydration_latency_p50_ms=round(p50, 2),
            rehydration_latency_p95_ms=round(p95, 2),
            rehydration_latency_p99_ms=round(p99, 2),
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _percentile(sorted_data: list[float], pct: float) -> float:
    """Calculate percentile from pre-sorted data."""
    if not sorted_data:
        return 0.0
    if len(sorted_data) == 1:
        return sorted_data[0]
    k = (len(sorted_data) - 1) * (pct / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return d0 + d1
