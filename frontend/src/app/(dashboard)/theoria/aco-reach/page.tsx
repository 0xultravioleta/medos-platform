"use client";

import { useState } from "react";
import {
  TrendingUp,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  Users,
  Award,
  Activity,
  Heart,
  Brain,
  Pill,
  Shield,
  ClipboardCheck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "measures" | "benchmarks" | "trends";
type MeasureCategory = "Clinical" | "Patient Experience" | "Utilization";
type TrendDirection = "improving" | "stable" | "declining";

interface QualityMeasure {
  id: string;
  name: string;
  category: MeasureCategory;
  currentScore: number;
  target: number;
  benchmark90th: number;
  nationalAvg: number;
  trend: TrendDirection;
  financialImpactPerPoint: number;
  patientsMeasured: number;
  patientsMeeting: number;
  unit: string;
  higherIsBetter: boolean;
  monthlyValues: number[];
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof TrendingUp }[] = [
  { key: "measures", label: "Quality Measures", icon: Target },
  { key: "benchmarks", label: "Benchmarks", icon: BarChart3 },
  { key: "trends", label: "Trends", icon: TrendingUp },
];

const CATEGORY_BADGE: Record<MeasureCategory, { bg: string; text: string }> = {
  Clinical: { bg: "bg-blue-50", text: "text-blue-700" },
  "Patient Experience": { bg: "bg-purple-50", text: "text-purple-700" },
  Utilization: { bg: "bg-amber-50", text: "text-amber-700" },
};

const TREND_ICON: Record<TrendDirection, { icon: typeof ArrowUp; color: string }> = {
  improving: { icon: ArrowUp, color: "text-emerald-600" },
  stable: { icon: Minus, color: "text-[var(--medos-gray-400)]" },
  declining: { icon: ArrowDown, color: "text-red-600" },
};

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  "ACM-01": Activity,
  "DAH-01": Calendar,
  "CAHPS-01": Award,
  "TFU-01": ClipboardCheck,
  "DM-01": Heart,
  "HTN-01": Activity,
  "DEP-01": Brain,
  "MED-01": Pill,
  "FRM-01": Shield,
  "ACP-01": ClipboardCheck,
  "CCM-01": Users,
  "AWV-01": Calendar,
};

// --- Mock Data ---

const MEASURES: QualityMeasure[] = [
  {
    id: "ACM-01",
    name: "All-Cause Readmission",
    category: "Utilization",
    currentScore: 12.3,
    target: 15.0,
    benchmark90th: 10.5,
    nationalAvg: 17.2,
    trend: "improving",
    financialImpactPerPoint: 85000,
    patientsMeasured: 2400,
    patientsMeeting: 2105,
    unit: "%",
    higherIsBetter: false,
    monthlyValues: [14.8, 14.1, 13.6, 13.2, 12.8, 12.3],
  },
  {
    id: "DAH-01",
    name: "Days at Home",
    category: "Utilization",
    currentScore: 348,
    target: 340,
    benchmark90th: 355,
    nationalAvg: 328,
    trend: "improving",
    financialImpactPerPoint: 12000,
    patientsMeasured: 2400,
    patientsMeeting: 1920,
    unit: "days/yr",
    higherIsBetter: true,
    monthlyValues: [336, 338, 341, 344, 346, 348],
  },
  {
    id: "CAHPS-01",
    name: "Patient Experience (CAHPS)",
    category: "Patient Experience",
    currentScore: 82,
    target: 75,
    benchmark90th: 90,
    nationalAvg: 68,
    trend: "improving",
    financialImpactPerPoint: 45000,
    patientsMeasured: 1800,
    patientsMeeting: 1476,
    unit: "%ile",
    higherIsBetter: true,
    monthlyValues: [74, 76, 78, 79, 81, 82],
  },
  {
    id: "TFU-01",
    name: "Timely Follow-Up",
    category: "Clinical",
    currentScore: 89,
    target: 85,
    benchmark90th: 94,
    nationalAvg: 78,
    trend: "stable",
    financialImpactPerPoint: 32000,
    patientsMeasured: 2100,
    patientsMeeting: 1869,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [87, 88, 88, 89, 89, 89],
  },
  {
    id: "DM-01",
    name: "Diabetes HbA1c Control",
    category: "Clinical",
    currentScore: 72,
    target: 70,
    benchmark90th: 82,
    nationalAvg: 62,
    trend: "stable",
    financialImpactPerPoint: 28000,
    patientsMeasured: 680,
    patientsMeeting: 490,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [70, 70, 71, 71, 72, 72],
  },
  {
    id: "HTN-01",
    name: "Blood Pressure Control",
    category: "Clinical",
    currentScore: 68,
    target: 65,
    benchmark90th: 78,
    nationalAvg: 58,
    trend: "improving",
    financialImpactPerPoint: 24000,
    patientsMeasured: 920,
    patientsMeeting: 626,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [62, 63, 65, 66, 67, 68],
  },
  {
    id: "DEP-01",
    name: "Depression Screening",
    category: "Clinical",
    currentScore: 76,
    target: 80,
    benchmark90th: 88,
    nationalAvg: 65,
    trend: "improving",
    financialImpactPerPoint: 18000,
    patientsMeasured: 2400,
    patientsMeeting: 1824,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [68, 70, 72, 73, 75, 76],
  },
  {
    id: "MED-01",
    name: "Medication Reconciliation",
    category: "Clinical",
    currentScore: 87,
    target: 90,
    benchmark90th: 95,
    nationalAvg: 76,
    trend: "stable",
    financialImpactPerPoint: 22000,
    patientsMeasured: 2400,
    patientsMeeting: 2088,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [85, 86, 86, 87, 87, 87],
  },
  {
    id: "FRM-01",
    name: "Fall Risk Management",
    category: "Clinical",
    currentScore: 71,
    target: 75,
    benchmark90th: 85,
    nationalAvg: 60,
    trend: "declining",
    financialImpactPerPoint: 35000,
    patientsMeasured: 2400,
    patientsMeeting: 1704,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [74, 73, 73, 72, 72, 71],
  },
  {
    id: "ACP-01",
    name: "Advance Care Planning",
    category: "Clinical",
    currentScore: 54,
    target: 60,
    benchmark90th: 72,
    nationalAvg: 42,
    trend: "improving",
    financialImpactPerPoint: 15000,
    patientsMeasured: 2400,
    patientsMeeting: 1296,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [46, 48, 50, 51, 53, 54],
  },
  {
    id: "CCM-01",
    name: "Chronic Care Management",
    category: "Clinical",
    currentScore: 62,
    target: 50,
    benchmark90th: 70,
    nationalAvg: 38,
    trend: "improving",
    financialImpactPerPoint: 52000,
    patientsMeasured: 2400,
    patientsMeeting: 1488,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [48, 52, 55, 58, 60, 62],
  },
  {
    id: "AWV-01",
    name: "Annual Wellness Visit",
    category: "Clinical",
    currentScore: 65,
    target: 70,
    benchmark90th: 80,
    nationalAvg: 52,
    trend: "stable",
    financialImpactPerPoint: 38000,
    patientsMeasured: 2400,
    patientsMeeting: 1560,
    unit: "%",
    higherIsBetter: true,
    monthlyValues: [63, 63, 64, 64, 65, 65],
  },
];

const MONTH_LABELS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const ATTRIBUTED_LIVES = 2400;
const PROJECTED_SAVINGS_BASE = 3200000;

// --- Helpers ---

function isMeetingTarget(m: QualityMeasure): boolean {
  if (m.higherIsBetter) return m.currentScore >= m.target;
  return m.currentScore <= m.target;
}

function isWithin5Pct(m: QualityMeasure): boolean {
  if (m.higherIsBetter) {
    const gap = m.target - m.currentScore;
    return gap > 0 && gap <= m.target * 0.05;
  }
  const gap = m.currentScore - m.target;
  return gap > 0 && gap <= m.target * 0.05;
}

function getScoreColor(m: QualityMeasure): string {
  if (isMeetingTarget(m)) return "text-emerald-600";
  if (isWithin5Pct(m)) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(m: QualityMeasure): string {
  if (isMeetingTarget(m)) return "bg-emerald-50";
  if (isWithin5Pct(m)) return "bg-amber-50";
  return "bg-red-50";
}

function computeQualityScore(): number {
  const meetingCount = MEASURES.filter((m) => isMeetingTarget(m)).length;
  return Math.round((meetingCount / MEASURES.length) * 100);
}

function computeMultiplier(): number {
  const score = computeQualityScore();
  return 1.0 + (score / 100) * 1.0;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getGap(m: QualityMeasure): number {
  if (m.higherIsBetter) return m.target - m.currentScore;
  return m.currentScore - m.target;
}

// --- Tab Components ---

function MeasuresTab() {
  const qualityScore = computeQualityScore();
  const multiplier = computeMultiplier();
  const projectedSavings = PROJECTED_SAVINGS_BASE * multiplier;
  const meetingTarget = MEASURES.filter((m) => isMeetingTarget(m)).length;

  return (
    <div className="space-y-6">
      {/* Hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
            Overall Quality Score
          </p>
          <p className="text-4xl font-bold text-[var(--medos-primary)]">{qualityScore}%</p>
          <p className="text-xs text-[var(--medos-gray-500)] mt-1">
            {meetingTarget} of {MEASURES.length} measures meeting target
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
            Shared Savings Multiplier
          </p>
          <p className="text-4xl font-bold text-[var(--medos-navy)]">{multiplier.toFixed(2)}x</p>
          <p className="text-xs text-[var(--medos-gray-500)] mt-1">Range: 1.00x - 2.00x</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
            Projected Savings
          </p>
          <p className="text-4xl font-bold text-emerald-600">{formatCurrency(projectedSavings)}</p>
          <p className="text-xs text-[var(--medos-gray-500)] mt-1">
            Base ${(PROJECTED_SAVINGS_BASE / 1000000).toFixed(1)}M x {multiplier.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
            Attributed Lives
          </p>
          <p className="text-4xl font-bold text-[var(--medos-navy)]">
            {ATTRIBUTED_LIVES.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)] mt-1">Empassion Health ACO REACH</p>
        </div>
      </div>

      {/* Measures Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Target className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Quality Measures ({MEASURES.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {[
                  "Measure",
                  "Category",
                  "Current",
                  "Target",
                  "Gap",
                  "Trend",
                  "$/Point",
                  "Patients",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {MEASURES.map((m) => {
                const gap = getGap(m);
                const TrendIcon = TREND_ICON[m.trend].icon;
                const MeasureIcon = CATEGORY_ICONS[m.id] || Activity;
                return (
                  <tr key={m.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MeasureIcon className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                        <div>
                          <span className="text-xs font-medium text-[var(--medos-navy)]">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-[var(--medos-gray-400)] ml-2">
                            {m.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          CATEGORY_BADGE[m.category].bg,
                          CATEGORY_BADGE[m.category].text
                        )}
                      >
                        {m.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded",
                          getScoreBg(m),
                          getScoreColor(m)
                        )}
                      >
                        {m.currentScore}
                        {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">
                        {m.higherIsBetter ? ">" : "<"}
                        {m.target}
                        {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          gap <= 0 ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {gap <= 0 ? "Met" : `-${Math.abs(gap).toFixed(1)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendIcon
                          className={cn("w-3.5 h-3.5", TREND_ICON[m.trend].color)}
                        />
                        <span
                          className={cn(
                            "text-[10px] font-medium capitalize",
                            TREND_ICON[m.trend].color
                          )}
                        >
                          {m.trend}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">
                        {formatCurrency(m.financialImpactPerPoint)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">
                        {m.patientsMeeting.toLocaleString()}/{m.patientsMeasured.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BenchmarksTab() {
  const categories: MeasureCategory[] = ["Clinical", "Patient Experience", "Utilization"];
  const aboveTarget = MEASURES.filter((m) => isMeetingTarget(m));
  const belowTarget = MEASURES.filter((m) => !isMeetingTarget(m));
  const improvementPriorities = [...belowTarget].sort(
    (a, b) => b.financialImpactPerPoint - a.financialImpactPerPoint
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Above Target</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mb-2">{aboveTarget.length}</p>
          <div className="space-y-1">
            {aboveTarget.map((m) => (
              <p key={m.id} className="text-[10px] text-[var(--medos-gray-600)]">
                {m.id}: {m.name}
              </p>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Below Target</h3>
          </div>
          <p className="text-3xl font-bold text-red-600 mb-2">{belowTarget.length}</p>
          <div className="space-y-1">
            {belowTarget.map((m) => (
              <p key={m.id} className="text-[10px] text-[var(--medos-gray-600)]">
                {m.id}: {m.name} ({Math.abs(getGap(m)).toFixed(1)} gap)
              </p>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
              Top Improvement Priorities
            </h3>
          </div>
          <div className="space-y-3">
            {improvementPriorities.slice(0, 3).map((m, i) => (
              <div key={m.id} className="flex items-start gap-2">
                <span className="text-xs font-bold text-[var(--medos-primary)] mt-0.5">
                  #{i + 1}
                </span>
                <div>
                  <p className="text-xs font-medium text-[var(--medos-navy)]">{m.name}</p>
                  <p className="text-[10px] text-[var(--medos-gray-500)]">
                    {formatCurrency(m.financialImpactPerPoint)}/point | Gap:{" "}
                    {Math.abs(getGap(m)).toFixed(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmark Bars by Category */}
      {categories.map((cat) => {
        const catMeasures = MEASURES.filter((m) => m.category === cat);
        return (
          <div
            key={cat}
            className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <span
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  CATEGORY_BADGE[cat].bg,
                  CATEGORY_BADGE[cat].text
                )}
              >
                {cat}
              </span>
              <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
                {cat} Measures ({catMeasures.length})
              </h3>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[var(--medos-gray-300)]" />
                <span className="text-[var(--medos-gray-500)]">National Avg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[var(--medos-primary)]" />
                <span className="text-[var(--medos-gray-500)]">Theoria Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2 border-amber-500" />
                <span className="text-[var(--medos-gray-500)]">Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2 border-emerald-500" />
                <span className="text-[var(--medos-gray-500)]">90th Percentile</span>
              </div>
            </div>

            <div className="space-y-5">
              {catMeasures.map((m) => {
                const max = Math.max(m.benchmark90th, m.currentScore, m.target, m.nationalAvg) * 1.1;
                const natPct = (m.nationalAvg / max) * 100;
                const curPct = (m.currentScore / max) * 100;
                const tgtPct = (m.target / max) * 100;
                const b90Pct = (m.benchmark90th / max) * 100;

                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--medos-navy)]">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-[var(--medos-gray-400)]">{m.id}</span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          getScoreColor(m)
                        )}
                      >
                        {m.currentScore}{m.unit}
                      </span>
                    </div>
                    <div className="relative h-6 bg-[var(--medos-gray-100)] rounded-full overflow-visible">
                      {/* National average bar */}
                      <div
                        className="absolute top-0 left-0 h-full bg-[var(--medos-gray-200)] rounded-l-full"
                        style={{ width: `${natPct}%` }}
                      />
                      {/* Theoria bar */}
                      <div
                        className={cn(
                          "absolute top-0 left-0 h-full rounded-l-full",
                          isMeetingTarget(m) ? "bg-emerald-400/60" : "bg-[var(--medos-primary)]/40"
                        )}
                        style={{ width: `${curPct}%` }}
                      />
                      {/* Target marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-amber-500"
                        style={{ left: `${tgtPct}%` }}
                      >
                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-white" />
                      </div>
                      {/* 90th percentile marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-emerald-500"
                        style={{ left: `${b90Pct}%` }}
                      >
                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-[var(--medos-gray-400)]">
                        Natl Avg: {m.nationalAvg}{m.unit}
                      </span>
                      <span className="text-[9px] text-[var(--medos-gray-400)]">
                        90th: {m.benchmark90th}{m.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendsTab() {
  const improving = MEASURES.filter((m) => m.trend === "improving");
  const stable = MEASURES.filter((m) => m.trend === "stable");
  const declining = MEASURES.filter((m) => m.trend === "declining");

  const qualityScore = computeQualityScore();
  const projectedQ4Score = Math.min(100, qualityScore + 8);
  const projectedMultiplier = 1.0 + (projectedQ4Score / 100) * 1.0;
  const projectedSavings = PROJECTED_SAVINGS_BASE * projectedMultiplier;

  const groups: {
    label: string;
    measures: QualityMeasure[];
    color: string;
    borderColor: string;
    dotColor: string;
  }[] = [
    {
      label: "Improving",
      measures: improving,
      color: "bg-emerald-50",
      borderColor: "border-emerald-200",
      dotColor: "bg-emerald-400",
    },
    {
      label: "Stable",
      measures: stable,
      color: "bg-[var(--medos-gray-50)]",
      borderColor: "border-[var(--medos-gray-200)]",
      dotColor: "bg-[var(--medos-gray-400)]",
    },
    {
      label: "Declining",
      measures: declining,
      color: "bg-red-50",
      borderColor: "border-red-200",
      dotColor: "bg-red-400",
    },
  ];

  function getDotColor(m: QualityMeasure, val: number, idx: number): string {
    if (m.higherIsBetter) {
      if (val >= m.target) return "bg-emerald-400";
      if (val >= m.target * 0.95) return "bg-amber-400";
      return "bg-red-400";
    }
    if (val <= m.target) return "bg-emerald-400";
    if (val <= m.target * 1.05) return "bg-amber-400";
    return "bg-red-400";
  }

  function getDelta(m: QualityMeasure): number {
    const vals = m.monthlyValues;
    return vals[vals.length - 1] - vals[0];
  }

  return (
    <div className="space-y-6">
      {/* Trajectory Groups */}
      {groups.map(
        (group) =>
          group.measures.length > 0 && (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-2.5 h-2.5 rounded-full", group.dotColor)} />
                <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
                  {group.label} ({group.measures.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.measures.map((m) => {
                  const delta = getDelta(m);
                  const vals = m.monthlyValues;
                  const minVal = Math.min(...vals);
                  const maxVal = Math.max(...vals);
                  const range = maxVal - minVal || 1;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-xl border shadow-medos-sm p-5",
                        group.color,
                        group.borderColor
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs font-medium text-[var(--medos-navy)]">{m.name}</p>
                          <p className="text-[10px] text-[var(--medos-gray-400)]">{m.id}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-lg font-bold", getScoreColor(m))}>
                            {m.currentScore}
                            <span className="text-[10px] font-normal">{m.unit}</span>
                          </p>
                        </div>
                      </div>

                      {/* Sparkline dots */}
                      <div className="flex items-end gap-2 mb-3 h-10">
                        {vals.map((val, idx) => {
                          const height = ((val - minVal) / range) * 28 + 6;
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center justify-end gap-1"
                            >
                              <div
                                className={cn(
                                  "w-full max-w-[14px] rounded-sm transition-all",
                                  getDotColor(m, val, idx)
                                )}
                                style={{ height: `${height}px` }}
                                title={`${MONTH_LABELS[idx]}: ${val}${m.unit}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {MONTH_LABELS.map((lbl) => (
                            <span
                              key={lbl}
                              className="flex-1 text-center text-[8px] text-[var(--medos-gray-400)]"
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Delta */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--medos-gray-200)]/50">
                        <span className="text-[10px] text-[var(--medos-gray-500)]">
                          6-month delta
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            delta > 0 && m.higherIsBetter
                              ? "text-emerald-600"
                              : delta < 0 && !m.higherIsBetter
                                ? "text-emerald-600"
                                : delta === 0
                                  ? "text-[var(--medos-gray-500)]"
                                  : "text-red-600"
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)}
                          {m.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
      )}

      {/* Quality Score Projection */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Quality Score Projection
          </h3>
        </div>
        <p className="text-xs text-[var(--medos-gray-600)] mb-4">
          If current trends continue through Q4 2026, projected performance and financial impact:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-[var(--medos-gray-50)] p-4 text-center">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
              Current Quality Score
            </p>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{qualityScore}%</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1">
              Projected Q4 Score
            </p>
            <p className="text-2xl font-bold text-emerald-700">{projectedQ4Score}%</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">
              +{projectedQ4Score - qualityScore} points
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1">
              Projected Savings Impact
            </p>
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(projectedSavings)}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5">
              Multiplier: {projectedMultiplier.toFixed(2)}x
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-800">
            <strong>Key drivers:</strong> CCM enrollment (+14pts in 6mo), Depression Screening
            (+8pts), and Advance Care Planning (+8pts) are the fastest-improving measures. Fall
            Risk Management is the only declining measure and should be prioritized.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main Export ---

export default function AcoReachPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("measures");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">ACO REACH Performance</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Value-based care quality tracking — Empassion Health ACO REACH
            </p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-[var(--medos-gray-100)] rounded-lg p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-white text-[var(--medos-primary)] shadow-medos-sm"
                  : "text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)]"
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "measures" && <MeasuresTab />}
      {activeTab === "benchmarks" && <BenchmarksTab />}
      {activeTab === "trends" && <TrendsTab />}
    </div>
  );
}
