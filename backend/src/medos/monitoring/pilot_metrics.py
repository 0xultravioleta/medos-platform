"""Pilot success metrics -- KPIs for Dr. Di Reze demo."""

from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass
class PilotMetrics:
    """Pilot success KPIs for demo to Dr. Di Reze."""

    time_saved_per_provider_minutes: float  # Target: 120+ min/day
    coding_accuracy_percent: float  # Target: >90%
    clean_claim_rate_percent: float  # Target: >95%
    denial_rate_percent: float  # Target: <5%
    days_in_ar: float  # Target: <30
    user_adoption_percent: float  # Daily active users %
    ai_notes_generated: int
    claims_submitted: int
    prior_auths_submitted: int
    appeals_generated: int
    avg_claim_turnaround_days: float
    patient_satisfaction_score: float  # 1-5 scale


@dataclass
class BenchmarkTarget:
    """Industry benchmarks vs MedOS targets."""

    metric: str
    industry_avg: float
    medos_target: float
    current: float
    unit: str


class PilotMetricsCollector:
    """Collects and computes pilot success metrics."""

    BENCHMARK_TARGETS: dict[str, dict[str, float | str]] = {
        "clean_claim_rate": {"industry": 80.0, "target": 95.0, "unit": "%"},
        "denial_rate": {"industry": 10.0, "target": 5.0, "unit": "%"},
        "days_in_ar": {"industry": 45.0, "target": 30.0, "unit": "days"},
        "coding_accuracy": {"industry": 85.0, "target": 92.0, "unit": "%"},
        "time_saved": {"industry": 0.0, "target": 120.0, "unit": "min/day"},
    }

    def compute_metrics(self, tenant_id: str = "demo-tenant") -> PilotMetrics:
        """Return pilot metrics. Demo mode returns realistic mock data."""
        # Seed for reproducibility in demo mode
        rng = random.Random(hash(tenant_id) % 2**32)

        return PilotMetrics(
            time_saved_per_provider_minutes=round(rng.uniform(110.0, 145.0), 1),
            coding_accuracy_percent=round(rng.uniform(90.5, 96.0), 1),
            clean_claim_rate_percent=round(rng.uniform(93.0, 97.5), 1),
            denial_rate_percent=round(rng.uniform(2.5, 5.5), 1),
            days_in_ar=round(rng.uniform(22.0, 32.0), 1),
            user_adoption_percent=round(rng.uniform(78.0, 95.0), 1),
            ai_notes_generated=rng.randint(180, 350),
            claims_submitted=rng.randint(120, 280),
            prior_auths_submitted=rng.randint(25, 65),
            appeals_generated=rng.randint(8, 22),
            avg_claim_turnaround_days=round(rng.uniform(1.2, 3.5), 1),
            patient_satisfaction_score=round(rng.uniform(4.2, 4.9), 1),
        )

    def compute_baseline(self) -> PilotMetrics:
        """Pre-MedOS baseline (industry average performance)."""
        return PilotMetrics(
            time_saved_per_provider_minutes=0.0,
            coding_accuracy_percent=85.0,
            clean_claim_rate_percent=80.0,
            denial_rate_percent=10.0,
            days_in_ar=45.0,
            user_adoption_percent=0.0,
            ai_notes_generated=0,
            claims_submitted=0,
            prior_auths_submitted=0,
            appeals_generated=0,
            avg_claim_turnaround_days=7.5,
            patient_satisfaction_score=3.5,
        )

    def compute_improvement(self) -> dict[str, float]:
        """Percentage improvement: current vs baseline."""
        current = self.compute_metrics()
        baseline = self.compute_baseline()

        improvements: dict[str, float] = {}

        # Higher is better
        for field in [
            "time_saved_per_provider_minutes",
            "coding_accuracy_percent",
            "clean_claim_rate_percent",
            "user_adoption_percent",
            "patient_satisfaction_score",
        ]:
            cur = getattr(current, field)
            base = getattr(baseline, field)
            if base > 0:
                improvements[field] = round((cur - base) / base * 100.0, 1)
            else:
                # Infinite improvement from zero -- report absolute value
                improvements[field] = round(cur, 1)

        # Lower is better (inverted: positive = improvement)
        for field in ["denial_rate_percent", "days_in_ar", "avg_claim_turnaround_days"]:
            cur = getattr(current, field)
            base = getattr(baseline, field)
            if base > 0:
                improvements[field] = round((base - cur) / base * 100.0, 1)
            else:
                improvements[field] = 0.0

        return improvements

    def get_targets(self) -> list[BenchmarkTarget]:
        """Return benchmark targets with current values."""
        current = self.compute_metrics()

        metric_map = {
            "clean_claim_rate": current.clean_claim_rate_percent,
            "denial_rate": current.denial_rate_percent,
            "days_in_ar": current.days_in_ar,
            "coding_accuracy": current.coding_accuracy_percent,
            "time_saved": current.time_saved_per_provider_minutes,
        }

        targets: list[BenchmarkTarget] = []
        for name, config in self.BENCHMARK_TARGETS.items():
            targets.append(
                BenchmarkTarget(
                    metric=name,
                    industry_avg=float(config["industry"]),
                    medos_target=float(config["target"]),
                    current=metric_map[name],
                    unit=str(config["unit"]),
                )
            )

        return targets
