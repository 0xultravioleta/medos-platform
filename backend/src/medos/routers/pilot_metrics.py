"""Pilot metrics endpoints -- KPIs for investor demo."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter

from medos.monitoring.pilot_metrics import PilotMetricsCollector

router = APIRouter(prefix="/api/v1/pilot", tags=["Pilot Metrics"])

collector = PilotMetricsCollector()


@router.get("/metrics")
async def get_pilot_metrics():
    """Current pilot success metrics."""
    metrics = collector.compute_metrics()
    return asdict(metrics)


@router.get("/metrics/baseline")
async def get_pilot_baseline():
    """Pre-MedOS baseline (industry averages)."""
    baseline = collector.compute_baseline()
    return asdict(baseline)


@router.get("/metrics/improvement")
async def get_pilot_improvement():
    """Percentage improvement: current vs baseline."""
    return collector.compute_improvement()


@router.get("/metrics/targets")
async def get_pilot_targets():
    """Benchmark targets with current values."""
    targets = collector.get_targets()
    return [asdict(t) for t in targets]
