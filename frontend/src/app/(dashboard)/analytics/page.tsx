"use client";

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Activity,
} from "lucide-react";

const METRICS = [
  {
    label: "Total Revenue",
    value: "$284,500",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
    color: "text-emerald-500",
  },
  {
    label: "Patient Volume",
    value: "847",
    change: "+8.3%",
    trend: "up" as const,
    icon: Users,
    color: "text-blue-500",
  },
  {
    label: "Avg Wait Time",
    value: "12 min",
    change: "-15%",
    trend: "down" as const,
    icon: Clock,
    color: "text-violet-500",
  },
  {
    label: "Claim Denial Rate",
    value: "4.2%",
    change: "-0.8%",
    trend: "down" as const,
    icon: Activity,
    color: "text-amber-500",
  },
];

const MONTHLY_DATA = [
  { month: "Sep", revenue: 245000, patients: 712, claims: 680 },
  { month: "Oct", revenue: 258000, patients: 745, claims: 720 },
  { month: "Nov", revenue: 262000, patients: 768, claims: 740 },
  { month: "Dec", revenue: 248000, patients: 720, claims: 695 },
  { month: "Jan", revenue: 271000, patients: 802, claims: 770 },
  { month: "Feb", revenue: 284500, patients: 847, claims: 815 },
];

const TOP_PROCEDURES = [
  { cpt: "99214", description: "Office visit, established (moderate)", count: 312, revenue: 88920 },
  { cpt: "99215", description: "Office visit, established (high)", count: 145, revenue: 54375 },
  { cpt: "99213", description: "Office visit, established (low)", count: 198, revenue: 39204 },
  { cpt: "99203", description: "Office visit, new (low)", count: 87, revenue: 19575 },
  { cpt: "93000", description: "Electrocardiogram, complete", count: 64, revenue: 10240 },
];

export default function AnalyticsPage() {
  const maxRevenue = Math.max(...MONTHLY_DATA.map((d) => d.revenue));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <BarChart3 className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
            Analytics
          </h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Practice performance &amp; insights
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => (
          <div
            key={metric.label}
            className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  metric.trend === "up" && metric.label !== "Claim Denial Rate"
                    ? "text-emerald-600"
                    : metric.trend === "down" &&
                        metric.label === "Claim Denial Rate"
                      ? "text-emerald-600"
                      : metric.trend === "down"
                        ? "text-emerald-600"
                        : "text-red-600"
                }`}
              >
                {metric.trend === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {metric.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">
              {metric.value}
            </p>
            <p className="text-xs text-[var(--medos-gray-500)] mt-1">
              {metric.label}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart (simple bar) */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <h2 className="text-base font-semibold text-[var(--medos-navy)] mb-4">
            Monthly Revenue
          </h2>
          <div className="flex items-end gap-2 h-48">
            {MONTHLY_DATA.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-[var(--medos-gray-600)]">
                  ${(d.revenue / 1000).toFixed(0)}k
                </span>
                <div
                  className="w-full rounded-t-md bg-[var(--medos-primary)] transition-all"
                  style={{
                    height: `${(d.revenue / maxRevenue) * 140}px`,
                    opacity: d.month === "Feb" ? 1 : 0.6,
                  }}
                />
                <span className="text-xs text-[var(--medos-gray-500)]">
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Patient volume */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <h2 className="text-base font-semibold text-[var(--medos-navy)] mb-4">
            Patient Volume Trend
          </h2>
          <div className="flex items-end gap-2 h-48">
            {MONTHLY_DATA.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-[var(--medos-gray-600)]">
                  {d.patients}
                </span>
                <div
                  className="w-full rounded-t-md bg-violet-500 transition-all"
                  style={{
                    height: `${(d.patients / 900) * 140}px`,
                    opacity: d.month === "Feb" ? 1 : 0.6,
                  }}
                />
                <span className="text-xs text-[var(--medos-gray-500)]">
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top procedures table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">
            Top Procedures by Volume
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                CPT Code
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Description
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Count
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {TOP_PROCEDURES.map((proc) => (
              <tr key={proc.cpt} className="hover:bg-[var(--medos-gray-50)] transition-default">
                <td className="px-6 py-3 text-sm font-mono font-medium text-[var(--medos-primary)]">
                  {proc.cpt}
                </td>
                <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)]">
                  {proc.description}
                </td>
                <td className="px-6 py-3 text-sm font-medium text-[var(--medos-gray-900)] text-right tabular-nums">
                  {proc.count}
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-[var(--medos-gray-900)] text-right tabular-nums">
                  ${proc.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
