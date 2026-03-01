"""Tests for pilot metrics module -- KPIs, baselines, and endpoints."""

from dataclasses import asdict

from fastapi.testclient import TestClient

from medos.main import app
from medos.monitoring.pilot_metrics import PilotMetricsCollector

client = TestClient(app)


# -- PilotMetricsCollector unit tests --


def test_compute_metrics_all_fields():
    """compute_metrics returns a PilotMetrics with all 12 fields populated."""
    collector = PilotMetricsCollector()
    metrics = collector.compute_metrics()
    data = asdict(metrics)
    assert len(data) == 12
    for key, value in data.items():
        assert value is not None, f"{key} should not be None"


def test_baseline_realistic_values():
    """Baseline reflects industry averages (pre-MedOS state)."""
    collector = PilotMetricsCollector()
    baseline = collector.compute_baseline()
    assert baseline.clean_claim_rate_percent == 80.0
    assert baseline.denial_rate_percent == 10.0
    assert baseline.days_in_ar == 45.0
    assert baseline.coding_accuracy_percent == 85.0
    assert baseline.time_saved_per_provider_minutes == 0.0
    assert baseline.ai_notes_generated == 0


def test_improvement_positive():
    """All improvements are positive (MedOS beats baseline)."""
    collector = PilotMetricsCollector()
    improvements = collector.compute_improvement()
    assert len(improvements) > 0
    for key, value in improvements.items():
        assert value > 0, f"{key} improvement should be positive, got {value}"


def test_targets_include_all_metrics():
    """get_targets returns one BenchmarkTarget per BENCHMARK_TARGETS entry."""
    collector = PilotMetricsCollector()
    targets = collector.get_targets()
    assert len(targets) == len(collector.BENCHMARK_TARGETS)
    metric_names = {t.metric for t in targets}
    for key in collector.BENCHMARK_TARGETS:
        assert key in metric_names


def test_clean_claim_rate_above_industry():
    """Current clean claim rate exceeds industry average of 80%."""
    collector = PilotMetricsCollector()
    metrics = collector.compute_metrics()
    assert metrics.clean_claim_rate_percent > 80.0


def test_denial_rate_below_industry():
    """Current denial rate is below industry average of 10%."""
    collector = PilotMetricsCollector()
    metrics = collector.compute_metrics()
    assert metrics.denial_rate_percent < 10.0


def test_time_saved_positive():
    """Time saved per provider is a positive number."""
    collector = PilotMetricsCollector()
    metrics = collector.compute_metrics()
    assert metrics.time_saved_per_provider_minutes > 0


# -- Endpoint tests --


def test_pilot_metrics_endpoints():
    """All four pilot metric endpoints return 200."""
    for path in [
        "/api/v1/pilot/metrics",
        "/api/v1/pilot/metrics/baseline",
        "/api/v1/pilot/metrics/improvement",
        "/api/v1/pilot/metrics/targets",
    ]:
        response = client.get(path)
        assert response.status_code == 200, f"{path} returned {response.status_code}"
        data = response.json()
        assert data is not None
