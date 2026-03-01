"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  ShieldAlert,
  ArrowUpRight,
  Zap,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { getClaimsAnalytics, type ClaimsAnalytics } from "@/lib/api";

// Mock analytics data (used when backend unavailable)
const MOCK_ANALYTICS: ClaimsAnalytics = {
  summary: {
    total_claims: 142,
    clean_claim_rate: 87.3,
    denial_rate: 14.1,
    collection_rate: 78.5,
  },
  financial: {
    total_billed: 284500.0,
    total_collected: 223332.5,
    total_denied: 40114.5,
    outstanding_ar: 21053.0,
  },
  status_breakdown: { paid: 96, denied: 20, pending: 18, in_review: 8 },
  denial_by_code: { "CO-4": 6, "CO-16": 5, "CO-197": 4, "CO-50": 3, "PR-1": 2 },
  ar_aging: {
    "0_30_days": 12,
    "31_60_days": 4,
    "61_90_days": 1,
    "90_plus_days": 1,
  },
  top_denial_reasons: [
    {
      code: "CO-4",
      reason: "Procedure code inconsistent with modifier",
      common_fix: "Review modifier usage (-25, -59, -LT/RT)",
      count: 6,
      appeal_success_rate: 0.72,
    },
    {
      code: "CO-16",
      reason: "Missing information or billing error",
      common_fix: "Review claim for missing auth number or NPI",
      count: 5,
      appeal_success_rate: 0.85,
    },
    {
      code: "CO-197",
      reason: "Precertification/authorization absent",
      common_fix: "Obtain retroactive authorization",
      count: 4,
      appeal_success_rate: 0.65,
    },
    {
      code: "CO-50",
      reason: "Not deemed medically necessary",
      common_fix: "Submit appeal with clinical documentation",
      count: 3,
      appeal_success_rate: 0.55,
    },
    {
      code: "PR-1",
      reason: "Deductible amount",
      common_fix: "Bill patient for deductible",
      count: 2,
      appeal_success_rate: 0.05,
    },
  ],
  kpis: {
    avg_days_to_payment: 18.5,
    first_pass_resolution_rate: 80.0,
    claims_per_provider_per_day: 12.3,
  },
};

function GaugeRing({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - pct * circumference;

  return (
    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-[var(--medos-gray-100)]" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={color} />
    </svg>
  );
}

function ARBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--medos-gray-600)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--medos-gray-800)]">{count}</span>
      </div>
      <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

export default function ClaimsAnalyticsPage() {
  const [data, setData] = useState<ClaimsAnalytics>(MOCK_ANALYTICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClaimsAnalytics().then((apiData) => {
      if (apiData) setData(apiData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--medos-gray-200)] border-t-[var(--medos-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  const arTotal = Object.values(data.ar_aging).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <BarChart3 className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Claims Analytics</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">Revenue cycle performance and insights</p>
          </div>
        </div>
        <Link
          href="/claims"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--medos-gray-300)] text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default"
        >
          <DollarSign className="w-4 h-4" />
          Back to Claims
        </Link>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Clean Claim Rate */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--medos-gray-500)] font-medium">Clean Claim Rate</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{data.summary.clean_claim_rate}%</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">+2.1% vs last month</span>
              </div>
            </div>
            <div className="relative">
              <GaugeRing value={data.summary.clean_claim_rate} max={100} color="text-emerald-500" />
              <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Denial Rate */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--medos-gray-500)] font-medium">Denial Rate</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{data.summary.denial_rate}%</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">-1.8% vs last month</span>
              </div>
            </div>
            <div className="relative">
              <GaugeRing value={data.summary.denial_rate} max={30} color="text-red-500" />
              <ShieldAlert className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--medos-gray-500)] font-medium">Collection Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{data.summary.collection_rate}%</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-blue-600 font-medium">+3.4% vs last month</span>
              </div>
            </div>
            <div className="relative">
              <GaugeRing value={data.summary.collection_rate} max={100} color="text-blue-500" />
              <DollarSign className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Avg Days to Payment */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--medos-gray-500)] font-medium">Avg Days to Payment</p>
              <p className="text-3xl font-bold text-violet-600 mt-1">{data.kpis.avg_days_to_payment}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">-2.3 days vs last month</span>
              </div>
            </div>
            <div className="relative">
              <GaugeRing value={30 - data.kpis.avg_days_to_payment} max={30} color="text-violet-500" />
              <Clock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary + Claims Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial Summary */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <h2 className="text-sm font-semibold text-[var(--medos-navy)] flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Financial Summary
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--medos-gray-600)]">Total Billed</span>
              <span className="text-sm font-bold text-[var(--medos-navy)]">${data.financial.total_billed.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--medos-gray-600)]">Total Collected</span>
              <span className="text-sm font-bold text-emerald-600">${data.financial.total_collected.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--medos-gray-600)]">Total Denied</span>
              <span className="text-sm font-bold text-red-600">${data.financial.total_denied.toLocaleString()}</span>
            </div>
            <div className="h-px bg-[var(--medos-gray-100)]" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--medos-gray-700)]">Outstanding AR</span>
              <span className="text-sm font-bold text-amber-600">${data.financial.outstanding_ar.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Claims Pipeline Status */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <h2 className="text-sm font-semibold text-[var(--medos-navy)] flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-blue-600" />
            Claims Pipeline
          </h2>
          <div className="space-y-3">
            {[
              { label: "Paid", count: data.status_breakdown.paid || 0, color: "bg-emerald-500", icon: CheckCircle2, textColor: "text-emerald-700" },
              { label: "Denied", count: data.status_breakdown.denied || 0, color: "bg-red-500", icon: AlertTriangle, textColor: "text-red-700" },
              { label: "Pending", count: data.status_breakdown.pending || 0, color: "bg-amber-500", icon: Clock, textColor: "text-amber-700" },
              { label: "In Review", count: data.status_breakdown.in_review || 0, color: "bg-blue-500", icon: Zap, textColor: "text-blue-700" },
            ].map((item) => {
              const pct = data.summary.total_claims > 0 ? (item.count / data.summary.total_claims) * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${item.textColor} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--medos-gray-600)]">{item.label}</span>
                      <span className="text-xs font-bold text-[var(--medos-gray-800)]">{item.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AR Aging + Top Denial Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AR Aging */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <h2 className="text-sm font-semibold text-[var(--medos-navy)] flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-600" />
            AR Aging Buckets
          </h2>
          <div className="space-y-3">
            <ARBar label="0-30 Days" count={data.ar_aging["0_30_days"] || 0} total={arTotal} color="bg-emerald-500" />
            <ARBar label="31-60 Days" count={data.ar_aging["31_60_days"] || 0} total={arTotal} color="bg-amber-500" />
            <ARBar label="61-90 Days" count={data.ar_aging["61_90_days"] || 0} total={arTotal} color="bg-orange-500" />
            <ARBar label="90+ Days" count={data.ar_aging["90_plus_days"] || 0} total={arTotal} color="bg-red-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--medos-gray-100)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-500)]">Total Outstanding</span>
              <span className="text-sm font-bold text-[var(--medos-navy)]">{arTotal} claims</span>
            </div>
          </div>
        </div>

        {/* Top Denial Reasons */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <h2 className="text-sm font-semibold text-[var(--medos-navy)] flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            Top Denial Reasons
          </h2>
          <div className="space-y-3">
            {data.top_denial_reasons.map((denial) => (
              <div key={denial.code} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--medos-gray-50)] border border-[var(--medos-gray-100)]">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-[10px] font-bold text-red-700">
                    {denial.count}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      {denial.code}
                    </span>
                    <span className="text-[10px] text-[var(--medos-gray-500)]">
                      {Math.round(denial.appeal_success_rate * 100)}% appeal success
                    </span>
                  </div>
                  <p className="text-xs text-[var(--medos-gray-700)]">{denial.reason}</p>
                  <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    {denial.common_fix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Footer */}
      <div className="bg-gradient-to-r from-blue-50 via-white to-violet-50 rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[var(--medos-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--medos-navy)]">Performance KPIs</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{data.kpis.first_pass_resolution_rate}%</p>
            <p className="text-xs text-[var(--medos-gray-500)]">First Pass Resolution Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{data.kpis.claims_per_provider_per_day}</p>
            <p className="text-xs text-[var(--medos-gray-500)]">Claims/Provider/Day</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">$1,572</p>
            <p className="text-xs text-[var(--medos-gray-500)]">Avg Collected/Provider/Day</p>
          </div>
        </div>
      </div>
    </div>
  );
}
