"""Tests for monitoring module -- metrics collection, alerts, and endpoints."""

import time
from dataclasses import asdict

from fastapi.testclient import TestClient

from medos.main import app
from medos.monitoring.health_dashboard import (
    AlertManager,
    AlertRule,
    HealthMetrics,
    MetricsCollector,
)

client = TestClient(app)


# -- MetricsCollector tests --


def test_metrics_collector_record_request():
    """Recording requests increments counts and stores latencies."""
    mc = MetricsCollector()
    mc.record_request(50.0)
    mc.record_request(100.0, is_error=True)
    assert mc._requests == 2
    assert mc._errors == 1
    assert len(mc._latencies) == 2


def test_metrics_collector_latency_percentiles():
    """Percentile calculations are correct for known distributions."""
    mc = MetricsCollector()
    # Insert 100 values: 1, 2, 3, ..., 100
    for i in range(1, 101):
        mc.record_request(float(i))
    metrics = mc.get_metrics()
    # p50 should be around 50, p95 around 95, p99 around 99
    assert 49.0 <= metrics.api_latency_p50_ms <= 51.0
    assert 94.0 <= metrics.api_latency_p95_ms <= 96.0
    assert 98.0 <= metrics.api_latency_p99_ms <= 100.0


def test_metrics_collector_error_rate():
    """Error rate is calculated correctly."""
    mc = MetricsCollector()
    for _ in range(80):
        mc.record_request(10.0, is_error=False)
    for _ in range(20):
        mc.record_request(10.0, is_error=True)
    metrics = mc.get_metrics()
    assert metrics.error_rate_percent == 20.0


def test_metrics_collector_throughput():
    """Throughput (RPS) reflects requests over time."""
    mc = MetricsCollector()
    # Manually set start time to 10 seconds ago
    mc._start_time = time.time() - 10.0
    for _ in range(100):
        mc.record_request(5.0)
    metrics = mc.get_metrics()
    # ~100 requests / ~10 seconds = ~10 RPS
    assert 8.0 <= metrics.throughput_rps <= 12.0


def test_metrics_collector_empty():
    """Metrics are safe when no requests have been recorded."""
    mc = MetricsCollector()
    metrics = mc.get_metrics()
    assert metrics.api_latency_p50_ms == 0.0
    assert metrics.error_rate_percent == 0.0


def test_metrics_collector_reset():
    """Reset clears all collected data."""
    mc = MetricsCollector()
    mc.record_request(100.0, is_error=True)
    mc.reset()
    assert mc._requests == 0
    assert mc._errors == 0
    assert len(mc._latencies) == 0


# -- AlertRule / AlertManager tests --


def test_alert_rule_firing_on_high_error_rate():
    """Alert fires when error rate exceeds threshold."""
    am = AlertManager(rules=[
        AlertRule("high_errors", "error_rate_percent", ">", 5.0, "critical"),
    ])
    metrics = HealthMetrics(
        timestamp="2026-02-28T00:00:00Z",
        api_latency_p50_ms=50.0,
        api_latency_p95_ms=100.0,
        api_latency_p99_ms=200.0,
        error_rate_percent=10.0,  # Above 5.0 threshold
        throughput_rps=50.0,
        active_connections=5,
        db_pool_usage_percent=30.0,
        memory_usage_mb=256.0,
        uptime_seconds=3600.0,
    )
    alerts = am.evaluate(metrics)
    assert len(alerts) == 1
    assert alerts[0]["name"] == "high_errors"
    assert alerts[0]["severity"] == "critical"
    assert alerts[0]["current_value"] == 10.0


def test_alert_rule_not_firing_below_threshold():
    """Alert does not fire when metric is below threshold."""
    am = AlertManager(rules=[
        AlertRule("high_errors", "error_rate_percent", ">", 5.0, "critical"),
    ])
    metrics = HealthMetrics(
        timestamp="2026-02-28T00:00:00Z",
        api_latency_p50_ms=50.0,
        api_latency_p95_ms=100.0,
        api_latency_p99_ms=200.0,
        error_rate_percent=2.0,  # Below 5.0 threshold
        throughput_rps=50.0,
        active_connections=5,
        db_pool_usage_percent=30.0,
        memory_usage_mb=256.0,
        uptime_seconds=3600.0,
    )
    alerts = am.evaluate(metrics)
    assert len(alerts) == 0


def test_alert_manager_multiple_rules():
    """Multiple rules can fire simultaneously."""
    am = AlertManager(rules=[
        AlertRule("high_errors", "error_rate_percent", ">", 5.0, "critical"),
        AlertRule("high_latency", "api_latency_p99_ms", ">", 2000.0, "critical"),
        AlertRule("low_throughput", "throughput_rps", "<", 1.0, "warning"),
    ])
    metrics = HealthMetrics(
        timestamp="2026-02-28T00:00:00Z",
        api_latency_p50_ms=50.0,
        api_latency_p95_ms=100.0,
        api_latency_p99_ms=3000.0,  # Fires
        error_rate_percent=10.0,  # Fires
        throughput_rps=50.0,  # Does NOT fire (above 1.0)
        active_connections=5,
        db_pool_usage_percent=30.0,
        memory_usage_mb=256.0,
        uptime_seconds=3600.0,
    )
    alerts = am.evaluate(metrics)
    assert len(alerts) == 2
    names = {a["name"] for a in alerts}
    assert "high_errors" in names
    assert "high_latency" in names


def test_alert_manager_resolved_state():
    """Alerts transition from firing to resolved when metric recovers."""
    am = AlertManager(rules=[
        AlertRule("high_errors", "error_rate_percent", ">", 5.0, "critical"),
    ])

    # First evaluation: firing
    bad_metrics = HealthMetrics(
        timestamp="2026-02-28T00:00:00Z",
        api_latency_p50_ms=50.0,
        api_latency_p95_ms=100.0,
        api_latency_p99_ms=200.0,
        error_rate_percent=10.0,
        throughput_rps=50.0,
        active_connections=5,
        db_pool_usage_percent=30.0,
        memory_usage_mb=256.0,
        uptime_seconds=3600.0,
    )
    alerts = am.evaluate(bad_metrics)
    assert len(alerts) == 1
    assert am.states["high_errors"].is_firing is True

    # Second evaluation: resolved
    good_metrics = HealthMetrics(
        timestamp="2026-02-28T00:01:00Z",
        api_latency_p50_ms=50.0,
        api_latency_p95_ms=100.0,
        api_latency_p99_ms=200.0,
        error_rate_percent=1.0,  # Below threshold
        throughput_rps=50.0,
        active_connections=5,
        db_pool_usage_percent=30.0,
        memory_usage_mb=256.0,
        uptime_seconds=3660.0,
    )
    alerts = am.evaluate(good_metrics)
    assert len(alerts) == 0
    assert am.states["high_errors"].is_firing is False
    assert am.states["high_errors"].resolved_at is not None


def test_health_metrics_snapshot():
    """HealthMetrics can be created and serialized."""
    metrics = HealthMetrics(
        timestamp="2026-02-28T00:00:00Z",
        api_latency_p50_ms=25.0,
        api_latency_p95_ms=80.0,
        api_latency_p99_ms=150.0,
        error_rate_percent=0.5,
        throughput_rps=100.0,
        active_connections=10,
        db_pool_usage_percent=45.0,
        memory_usage_mb=512.0,
        uptime_seconds=7200.0,
    )
    data = asdict(metrics)
    assert data["timestamp"] == "2026-02-28T00:00:00Z"
    assert data["api_latency_p50_ms"] == 25.0
    assert data["error_rate_percent"] == 0.5
    assert len(data) == 10  # All 10 fields present


# -- Endpoint tests --


def test_monitoring_metrics_endpoint():
    """GET /api/v1/monitoring/metrics returns a metrics snapshot."""
    response = client.get("/api/v1/monitoring/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "timestamp" in data
    assert "api_latency_p50_ms" in data
    assert "error_rate_percent" in data
    assert "throughput_rps" in data


def test_monitoring_alerts_endpoint():
    """GET /api/v1/monitoring/alerts returns alert state."""
    response = client.get("/api/v1/monitoring/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "firing_count" in data
    assert "alerts" in data
    assert isinstance(data["alerts"], list)


def test_monitoring_detailed_health_endpoint():
    """GET /api/v1/monitoring/health/detailed returns component status."""
    response = client.get("/api/v1/monitoring/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded", "critical")
    assert "components" in data
    assert "api" in data["components"]
    assert "database" in data["components"]
    assert "uptime_seconds" in data
    assert "firing_alerts" in data
