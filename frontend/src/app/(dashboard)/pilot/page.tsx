"use client";

import { useState, useEffect } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  FileCheck,
  DollarSign,
  Users,
  Brain,
  ClipboardCheck,
  Shield,
  Star,
  Zap,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PilotMetricsData {
  time_saved_per_provider_minutes: number;
  coding_accuracy_percent: number;
  clean_claim_rate_percent: number;
  denial_rate_percent: number;
  days_in_ar: number;
  user_adoption_percent: number;
  ai_notes_generated: number;
  claims_submitted: number;
  prior_auths_submitted: number;
  appeals_generated: number;
  avg_claim_turnaround_days: number;
  patient_satisfaction_score: number;
}

interface BenchmarkTarget {
  metric: string;
  industry_avg: number;
  medos_target: number;
  current: number;
  unit: string;
}

// Fallback data when backend is unavailable
const MOCK_METRICS: PilotMetricsData = {
  time_saved_per_provider_minutes: 135.2,
  coding_accuracy_percent: 93.4,
  clean_claim_rate_percent: 95.8,
  denial_rate_percent: 3.9,
  days_in_ar: 26.3,
  user_adoption_percent: 87.5,
  ai_notes_generated: 284,
  claims_submitted: 196,
  prior_auths_submitted: 42,
  appeals_generated: 14,
  avg_claim_turnaround_days: 2.1,
  patient_satisfaction_score: 4.6,
};

const MOCK_BASELINE: PilotMetricsData = {
  time_saved_per_provider_minutes: 0,
  coding_accuracy_percent: 85.0,
  clean_claim_rate_percent: 80.0,
  denial_rate_percent: 10.0,
  days_in_ar: 45.0,
  user_adoption_percent: 0,
  ai_notes_generated: 0,
  claims_submitted: 0,
  prior_auths_submitted: 0,
  appeals_generated: 0,
  avg_claim_turnaround_days: 7.5,
  patient_satisfaction_score: 3.5,
};

const MOCK_TARGETS: BenchmarkTarget[] = [
  { metric: "clean_claim_rate", industry_avg: 80.0, medos_target: 95.0, current: 95.8, unit: "%" },
  { metric: "denial_rate", industry_avg: 10.0, medos_target: 5.0, current: 3.9, unit: "%" },
  { metric: "days_in_ar", industry_avg: 45.0, medos_target: 30.0, current: 26.3, unit: "days" },
  { metric: "coding_accuracy", industry_avg: 85.0, medos_target: 92.0, current: 93.4, unit: "%" },
  { metric: "time_saved", industry_avg: 0.0, medos_target: 120.0, current: 135.2, unit: "min/day" },
];

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

type TargetStatus = "green" | "yellow" | "red";

function getTargetStatus(metric: string, current: number, target: number, industry: number): TargetStatus {
  // For denial_rate and days_in_ar, lower is better
  const lowerIsBetter = metric === "denial_rate" || metric === "days_in_ar";

  if (lowerIsBetter) {
    if (current <= target) return "green";
    if (current < industry) return "yellow";
    return "red";
  }
  // Higher is better
  if (current >= target) return "green";
  if (current > industry) return "yellow";
  return "red";
}

const STATUS_STYLES: Record<TargetStatus, { bg: string; text: string; border: string; badge: string }> = {
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  yellow: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
  },
};

const METRIC_LABELS: Record<string, string> = {
  clean_claim_rate: "Clean Claim Rate",
  denial_rate: "Denial Rate",
  days_in_ar: "Days in AR",
  coding_accuracy: "Coding Accuracy",
  time_saved: "Time Saved",
};

export default function PilotPage() {
  const [metrics, setMetrics] = useState<PilotMetricsData>(MOCK_METRICS);
  const [baseline, setBaseline] = useState<PilotMetricsData>(MOCK_BASELINE);
  const [targets, setTargets] = useState<BenchmarkTarget[]>(MOCK_TARGETS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      try {
        const opts = { signal: controller.signal };
        const [metricsRes, baselineRes, targetsRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/pilot/metrics`, opts).catch(() => null),
          fetch(`${API_BASE}/api/v1/pilot/metrics/baseline`, opts).catch(() => null),
          fetch(`${API_BASE}/api/v1/pilot/metrics/targets`, opts).catch(() => null),
        ]);
        if (metricsRes?.ok) setMetrics(await metricsRes.json());
        if (baselineRes?.ok) setBaseline(await baselineRes.json());
        if (targetsRes?.ok) setTargets(await targetsRes.json());
      } catch {
        // Use mock data
      } finally {
        clearTimeout(timeout);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--medos-gray-200)] border-t-[var(--medos-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Target className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
            Pilot Metrics Dashboard
          </h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            MedOS pilot success KPIs vs industry benchmarks
          </p>
        </div>
      </div>

      {/* Time Saved -- Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 via-white to-violet-50 rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-[var(--medos-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--medos-navy)]">Time Saved per Provider</h2>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold text-[var(--medos-navy)]">
            {formatMinutes(metrics.time_saved_per_provider_minutes)}
          </span>
          <span className="text-lg text-[var(--medos-gray-500)]">per day</span>
        </div>
        <p className="text-sm text-[var(--medos-gray-600)] mt-2">
          Target: {formatMinutes(120)} | Equivalent to{" "}
          <span className="font-semibold text-emerald-600">
            {Math.round(metrics.time_saved_per_provider_minutes / 60 * 5)} hours/week
          </span>{" "}
          returned to patient care
        </p>
      </div>

      {/* Revenue Impact */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">Revenue Impact</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label="Clean Claim Rate"
            current={metrics.clean_claim_rate_percent}
            baseline={baseline.clean_claim_rate_percent}
            unit="%"
            icon={<FileCheck className="w-5 h-5" />}
            higherIsBetter
          />
          <KPICard
            label="Denial Rate"
            current={metrics.denial_rate_percent}
            baseline={baseline.denial_rate_percent}
            unit="%"
            icon={<Shield className="w-5 h-5" />}
            higherIsBetter={false}
          />
          <KPICard
            label="Days in AR"
            current={metrics.days_in_ar}
            baseline={baseline.days_in_ar}
            unit=" days"
            icon={<Clock className="w-5 h-5" />}
            higherIsBetter={false}
          />
        </div>
      </div>

      {/* AI Performance */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-violet-600" />
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">AI Performance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Coding Accuracy"
            value={`${metrics.coding_accuracy_percent}%`}
            sub={`Industry avg: ${baseline.coding_accuracy_percent}%`}
            icon={<ClipboardCheck className="w-5 h-5 text-violet-500" />}
          />
          <StatCard
            label="AI Notes Generated"
            value={metrics.ai_notes_generated.toLocaleString()}
            sub="This pilot period"
            icon={<FileCheck className="w-5 h-5 text-blue-500" />}
          />
          <StatCard
            label="Prior Auths Submitted"
            value={metrics.prior_auths_submitted.toLocaleString()}
            sub="Automated submissions"
            icon={<Shield className="w-5 h-5 text-amber-500" />}
          />
          <StatCard
            label="Appeals Generated"
            value={metrics.appeals_generated.toLocaleString()}
            sub="AI-drafted appeals"
            icon={<Zap className="w-5 h-5 text-red-500" />}
          />
        </div>
      </div>

      {/* Adoption */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">Adoption</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-[var(--medos-gray-600)]">User Adoption</span>
            </div>
            <p className="text-3xl font-bold text-[var(--medos-navy)]">
              {metrics.user_adoption_percent}%
            </p>
            <p className="text-xs text-[var(--medos-gray-500)] mt-1">Daily active users</p>
            <div className="mt-3 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${metrics.user_adoption_percent}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-[var(--medos-gray-600)]">Patient Satisfaction</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[var(--medos-navy)]">
                {metrics.patient_satisfaction_score}
              </p>
              <span className="text-lg text-[var(--medos-gray-400)]">/ 5.0</span>
            </div>
            <p className="text-xs text-[var(--medos-gray-500)] mt-1">
              Baseline: {baseline.patient_satisfaction_score} / 5.0
            </p>
            <div className="flex gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(metrics.patient_satisfaction_score)
                      ? "text-amber-400 fill-amber-400"
                      : "text-[var(--medos-gray-200)]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark Targets Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">
            Benchmark Targets
          </h2>
          <p className="text-xs text-[var(--medos-gray-500)] mt-0.5">
            Industry average vs MedOS target vs current pilot performance
          </p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Metric
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Industry Avg
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                MedOS Target
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Current
              </th>
              <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {targets.map((t) => {
              const status = getTargetStatus(t.metric, t.current, t.medos_target, t.industry_avg);
              const styles = STATUS_STYLES[status];
              return (
                <tr key={t.metric} className="hover:bg-[var(--medos-gray-50)] transition-default">
                  <td className="px-6 py-3 text-sm font-medium text-[var(--medos-gray-900)]">
                    {METRIC_LABELS[t.metric] || t.metric}
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)] text-right tabular-nums">
                    {t.industry_avg}{t.unit}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-[var(--medos-primary)] text-right tabular-nums">
                    {t.medos_target}{t.unit}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-[var(--medos-navy)] text-right tabular-nums">
                    {t.current}{t.unit}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${styles.badge}`}>
                      {status === "green" ? "ON TARGET" : status === "yellow" ? "IMPROVING" : "BELOW"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPICard({
  label,
  current,
  baseline,
  unit,
  icon,
  higherIsBetter,
}: {
  label: string;
  current: number;
  baseline: number;
  unit: string;
  icon: React.ReactNode;
  higherIsBetter: boolean;
}) {
  const diff = current - baseline;
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const pctChange = baseline !== 0 ? Math.abs(((current - baseline) / baseline) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={improved ? "text-emerald-500" : "text-red-500"}>{icon}</span>
        <div className={`flex items-center gap-1 text-xs font-medium ${improved ? "text-emerald-600" : "text-red-600"}`}>
          {improved ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {pctChange.toFixed(1)}%
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--medos-navy)]">
        {current}{unit}
      </p>
      <p className="text-xs text-[var(--medos-gray-500)] mt-1">{label}</p>
      <p className="text-[10px] text-[var(--medos-gray-400)] mt-0.5">
        Baseline: {baseline}{unit}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm font-medium text-[var(--medos-gray-600)]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--medos-navy)]">{value}</p>
      <p className="text-xs text-[var(--medos-gray-500)] mt-1">{sub}</p>
    </div>
  );
}
