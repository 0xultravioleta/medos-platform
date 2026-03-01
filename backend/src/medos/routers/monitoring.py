"""Monitoring endpoints -- metrics, alerts, and detailed health."""

from __future__ import annotations

from dataclasses import asdict
from datetime import UTC, datetime

from fastapi import APIRouter

from medos.config import settings
from medos.monitoring.health_dashboard import AlertManager, MetricsCollector

router = APIRouter(prefix="/api/v1/monitoring", tags=["Monitoring"])

# Singleton instances for the application
metrics_collector = MetricsCollector()
alert_manager = AlertManager()


@router.get("/metrics")
async def get_metrics():
    """Current metrics snapshot."""
    metrics = metrics_collector.get_metrics()
    return asdict(metrics)


@router.get("/alerts")
async def get_alerts():
    """Currently firing alerts."""
    metrics = metrics_collector.get_metrics()
    firing = alert_manager.evaluate(metrics)
    return {
        "firing_count": len(firing),
        "alerts": firing,
    }


@router.get("/health/detailed")
async def get_detailed_health():
    """Expanded health check with component status and metrics."""
    metrics = metrics_collector.get_metrics()
    firing = alert_manager.evaluate(metrics)

    components = {
        "api": {
            "status": "healthy" if metrics.error_rate_percent < 5.0 else "degraded",
            "latency_p50_ms": metrics.api_latency_p50_ms,
            "latency_p99_ms": metrics.api_latency_p99_ms,
            "error_rate_percent": metrics.error_rate_percent,
        },
        "database": {
            "status": "healthy" if metrics.db_pool_usage_percent < 80.0 else "degraded",
            "pool_usage_percent": metrics.db_pool_usage_percent,
        },
    }

    overall = "healthy"
    if any(a["severity"] == "critical" for a in firing):
        overall = "critical"
    elif any(a["severity"] == "warning" for a in firing):
        overall = "degraded"

    return {
        "status": overall,
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "timestamp": datetime.now(UTC).isoformat(),
        "uptime_seconds": metrics.uptime_seconds,
        "throughput_rps": metrics.throughput_rps,
        "components": components,
        "firing_alerts": len(firing),
    }
