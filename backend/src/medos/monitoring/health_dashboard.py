"""Health dashboard -- metrics collection and alert evaluation."""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass
class HealthMetrics:
    """System health metrics snapshot."""

    timestamp: str  # ISO format
    api_latency_p50_ms: float
    api_latency_p95_ms: float
    api_latency_p99_ms: float
    error_rate_percent: float
    throughput_rps: float
    active_connections: int
    db_pool_usage_percent: float
    memory_usage_mb: float
    uptime_seconds: float


@dataclass
class AlertRule:
    """Threshold-based alert rule."""

    name: str
    metric: str  # e.g., "error_rate_percent"
    operator: str  # ">" or "<"
    threshold: float
    severity: str  # "critical", "warning", "info"


@dataclass
class AlertState:
    """Tracks alert state (firing vs resolved)."""

    rule: AlertRule
    is_firing: bool = False
    fired_at: str | None = None
    resolved_at: str | None = None
    current_value: float = 0.0


class MetricsCollector:
    """Collects and aggregates request metrics in-memory."""

    def __init__(self) -> None:
        self._latencies: list[float] = []
        self._errors: int = 0
        self._requests: int = 0
        self._start_time: float = time.time()
        self._active_connections: int = 0
        self._db_pool_usage_percent: float = 0.0
        self._memory_usage_mb: float = 0.0

    def record_request(self, latency_ms: float, is_error: bool = False) -> None:
        """Record a single request's latency and error status."""
        self._latencies.append(latency_ms)
        self._requests += 1
        if is_error:
            self._errors += 1

    def set_active_connections(self, count: int) -> None:
        """Update the active connection count."""
        self._active_connections = count

    def set_db_pool_usage(self, percent: float) -> None:
        """Update the DB pool usage percentage."""
        self._db_pool_usage_percent = percent

    def set_memory_usage(self, mb: float) -> None:
        """Update memory usage in MB."""
        self._memory_usage_mb = mb

    def _percentile(self, p: float) -> float:
        """Calculate percentile from collected latencies."""
        if not self._latencies:
            return 0.0
        sorted_latencies = sorted(self._latencies)
        k = (len(sorted_latencies) - 1) * (p / 100.0)
        f = int(k)
        c = f + 1
        if c >= len(sorted_latencies):
            return sorted_latencies[f]
        d = k - f
        return sorted_latencies[f] + d * (sorted_latencies[c] - sorted_latencies[f])

    def get_metrics(self) -> HealthMetrics:
        """Build a HealthMetrics snapshot from collected data."""
        uptime = time.time() - self._start_time
        error_rate = (self._errors / self._requests * 100.0) if self._requests > 0 else 0.0
        throughput = self._requests / uptime if uptime > 0 else 0.0

        return HealthMetrics(
            timestamp=datetime.now(UTC).isoformat(),
            api_latency_p50_ms=round(self._percentile(50), 2),
            api_latency_p95_ms=round(self._percentile(95), 2),
            api_latency_p99_ms=round(self._percentile(99), 2),
            error_rate_percent=round(error_rate, 2),
            throughput_rps=round(throughput, 2),
            active_connections=self._active_connections,
            db_pool_usage_percent=round(self._db_pool_usage_percent, 2),
            memory_usage_mb=round(self._memory_usage_mb, 2),
            uptime_seconds=round(uptime, 2),
        )

    def reset(self) -> None:
        """Reset all collected metrics."""
        self._latencies.clear()
        self._errors = 0
        self._requests = 0
        self._start_time = time.time()
        self._active_connections = 0
        self._db_pool_usage_percent = 0.0
        self._memory_usage_mb = 0.0


class AlertManager:
    """Evaluates alert rules against current metrics."""

    DEFAULT_RULES = [
        AlertRule("high_error_rate", "error_rate_percent", ">", 5.0, "critical"),
        AlertRule("high_p99_latency", "api_latency_p99_ms", ">", 2000.0, "critical"),
        AlertRule("high_p95_latency", "api_latency_p95_ms", ">", 1000.0, "warning"),
        AlertRule("low_throughput", "throughput_rps", "<", 1.0, "warning"),
        AlertRule("high_db_usage", "db_pool_usage_percent", ">", 80.0, "warning"),
    ]

    def __init__(self, rules: list[AlertRule] | None = None) -> None:
        self._rules = rules if rules is not None else list(self.DEFAULT_RULES)
        self._states: dict[str, AlertState] = {
            rule.name: AlertState(rule=rule) for rule in self._rules
        }

    @property
    def rules(self) -> list[AlertRule]:
        """Return the current alert rules."""
        return list(self._rules)

    @property
    def states(self) -> dict[str, AlertState]:
        """Return the current alert states."""
        return dict(self._states)

    def evaluate(self, metrics: HealthMetrics) -> list[dict]:
        """Evaluate all rules against the given metrics and return firing alerts."""
        firing: list[dict] = []
        now = datetime.now(UTC).isoformat()

        for rule in self._rules:
            value = getattr(metrics, rule.metric, None)
            if value is None:
                continue

            state = self._states[rule.name]
            is_firing = self._check_threshold(value, rule.operator, rule.threshold)
            state.current_value = value

            if is_firing and not state.is_firing:
                # Transition to firing
                state.is_firing = True
                state.fired_at = now
                state.resolved_at = None
            elif not is_firing and state.is_firing:
                # Transition to resolved
                state.is_firing = False
                state.resolved_at = now

            if state.is_firing:
                firing.append({
                    "name": rule.name,
                    "metric": rule.metric,
                    "operator": rule.operator,
                    "threshold": rule.threshold,
                    "current_value": value,
                    "severity": rule.severity,
                    "fired_at": state.fired_at,
                })

        return firing

    @staticmethod
    def _check_threshold(value: float, operator: str, threshold: float) -> bool:
        """Check if a value breaches the threshold."""
        if operator == ">":
            return value > threshold
        if operator == "<":
            return value < threshold
        return False
