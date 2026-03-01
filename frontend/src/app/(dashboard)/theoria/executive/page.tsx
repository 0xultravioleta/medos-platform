"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Building2,
  Users,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Star,
  Heart,
  Briefcase,
  Globe,
  Layers,
  Target,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "kpis" | "facilities" | "financial";
type SortColumn =
  | "rank"
  | "name"
  | "state"
  | "revenue"
  | "ebitda"
  | "margin"
  | "readmission"
  | "satisfaction"
  | "ftes"
  | "revPerProvider";
type SortDirection = "asc" | "desc";

interface FacilityData {
  rank: number;
  name: string;
  state: string;
  revenue: number;
  ebitda: number;
  margin: number;
  readmission: number;
  satisfaction: number;
  ftes: number;
  revPerProvider: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface EbitdaBridge {
  label: string;
  value: number;
  isTotal?: boolean;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: "kpis", label: "Board KPIs", icon: BarChart3 },
  { key: "facilities", label: "Facility Comparison", icon: Building2 },
  { key: "financial", label: "Financial Roll-up", icon: DollarSign },
];

// --- Mock Data ---

const COMPANY_KPIS = {
  revenue: 48200000,
  revenueGrowth: 32,
  ebitda: 8100000,
  ebitdaMargin: 16.8,
  facilities: 87,
  states: 21,
  providers: 142,
  attributedLives: 24000,
  livesGrowth: 18,
  nps: 72,
  employeeRetention: 91,
  patientsPerProviderMonth: 168,
};

const SERVICE_LINE_REVENUE = [
  { name: "Telemedicine", pct: 40, revenue: 19280000, color: "bg-[var(--medos-primary)]" },
  { name: "On-site Rounding", pct: 35, revenue: 16870000, color: "bg-blue-400" },
  { name: "RPM / CCM", pct: 15, revenue: 7230000, color: "bg-emerald-400" },
  { name: "Consulting", pct: 10, revenue: 4820000, color: "bg-amber-400" },
];

const STATE_REVENUE = [
  { state: "Michigan", pct: 28, revenue: 13496000 },
  { state: "Florida", pct: 22, revenue: 10604000 },
  { state: "Texas", pct: 15, revenue: 7230000 },
  { state: "Ohio", pct: 12, revenue: 5784000 },
  { state: "Other (17 states)", pct: 23, revenue: 11086000 },
];

const FACILITY_DATA: FacilityData[] = [
  { rank: 1, name: "Troy Medical Center", state: "MI", revenue: 2840000, ebitda: 568000, margin: 20.0, readmission: 10.2, satisfaction: 4.6, ftes: 8, revPerProvider: 355000 },
  { rank: 2, name: "Boca Raton SNF Group", state: "FL", revenue: 2520000, ebitda: 479000, margin: 19.0, readmission: 10.8, satisfaction: 4.5, ftes: 7, revPerProvider: 360000 },
  { rank: 3, name: "Houston Post-Acute", state: "TX", revenue: 2180000, ebitda: 392000, margin: 18.0, readmission: 11.5, satisfaction: 4.4, ftes: 6, revPerProvider: 363333 },
  { rank: 4, name: "Columbus Care Network", state: "OH", revenue: 1960000, ebitda: 333000, margin: 17.0, readmission: 12.1, satisfaction: 4.3, ftes: 6, revPerProvider: 326667 },
  { rank: 5, name: "Jacksonville ALF Group", state: "FL", revenue: 1840000, ebitda: 294000, margin: 16.0, readmission: 12.8, satisfaction: 4.5, ftes: 5, revPerProvider: 368000 },
  { rank: 6, name: "Dearborn Rehab Center", state: "MI", revenue: 1720000, ebitda: 258000, margin: 15.0, readmission: 13.2, satisfaction: 4.2, ftes: 5, revPerProvider: 344000 },
  { rank: 7, name: "Tampa Bay SNF", state: "FL", revenue: 1580000, ebitda: 221000, margin: 14.0, readmission: 13.8, satisfaction: 4.3, ftes: 4, revPerProvider: 395000 },
  { rank: 8, name: "Dallas Post-Acute", state: "TX", revenue: 1440000, ebitda: 187000, margin: 13.0, readmission: 14.2, satisfaction: 4.1, ftes: 4, revPerProvider: 360000 },
  { rank: 9, name: "Cleveland Senior Care", state: "OH", revenue: 1320000, ebitda: 158000, margin: 12.0, readmission: 14.8, satisfaction: 4.0, ftes: 4, revPerProvider: 330000 },
  { rank: 10, name: "Ann Arbor Geriatrics", state: "MI", revenue: 1180000, ebitda: 130000, margin: 11.0, readmission: 15.1, satisfaction: 4.1, ftes: 3, revPerProvider: 393333 },
];

const MONTHLY_REVENUE: MonthlyRevenue[] = [
  { month: "Apr", revenue: 3200000 },
  { month: "May", revenue: 3350000 },
  { month: "Jun", revenue: 3480000 },
  { month: "Jul", revenue: 3620000 },
  { month: "Aug", revenue: 3780000 },
  { month: "Sep", revenue: 3900000 },
  { month: "Oct", revenue: 4050000 },
  { month: "Nov", revenue: 4180000 },
  { month: "Dec", revenue: 4320000 },
  { month: "Jan", revenue: 4100000 },
  { month: "Feb", revenue: 4420000 },
  { month: "Mar", revenue: 4800000 },
];

const EBITDA_BRIDGE: EbitdaBridge[] = [
  { label: "FY2025 EBITDA", value: 5400000, isTotal: true },
  { label: "Organic Growth", value: 1200000 },
  { label: "New Facilities (+14)", value: 980000 },
  { label: "RPM/CCM Revenue", value: 720000 },
  { label: "Cost Optimization", value: 340000 },
  { label: "Platform Efficiency", value: 260000 },
  { label: "Hiring & Expansion", value: -800000 },
  { label: "FY2026 EBITDA", value: 8100000, isTotal: true },
];

const VALUATION_TABLE = [
  { label: "Physician Services Multiple", multiple: 10, valuation: 81000000, description: "Traditional staffing company" },
  { label: "Tech-Enabled Services", multiple: 18, valuation: 145800000, description: "With ChartEasy/ChatEasy/ProphEasy" },
  { label: "Platform Multiple", multiple: 22, valuation: 178200000, description: "Full MedOS Healthcare OS integration" },
];

const AMULET_METRICS = {
  irr: 35,
  holdPeriod: "3-5 years",
  entryMultiple: 12,
  exitMultipleTarget: 22,
  investmentDate: "December 2024",
  fundSize: "$2.7B AUM",
};

// --- Helpers ---

function formatCurrency(value: number, decimals = 1): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(decimals)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

// --- Tab Components ---

function BoardKPIsTab() {
  return (
    <div className="space-y-6">
      {/* Premium Hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-[var(--medos-navy)] to-[var(--medos-primary)] rounded-xl shadow-medos-md p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-white/70" />
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Revenue TTM</p>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(COMPANY_KPIS.revenue)}</p>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUp className="w-3 h-3 text-emerald-300" />
              <span className="text-xs text-emerald-300 font-medium">
                +{COMPANY_KPIS.revenueGrowth}% YoY
              </span>
            </div>
          </div>
        </div>

        {/* EBITDA */}
        <div className="bg-gradient-to-br from-[var(--medos-navy)] to-[var(--medos-primary)] rounded-xl shadow-medos-md p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-white/70" />
              <p className="text-[10px] text-white/70 uppercase tracking-wider">EBITDA</p>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(COMPANY_KPIS.ebitda)}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-emerald-300 font-medium">
                {COMPANY_KPIS.ebitdaMargin}% margin
              </span>
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div className="bg-gradient-to-br from-[var(--medos-navy)] to-[var(--medos-primary)] rounded-xl shadow-medos-md p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-white/70" />
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Facilities</p>
            </div>
            <p className="text-3xl font-bold">{COMPANY_KPIS.facilities}</p>
            <div className="flex items-center gap-1 mt-2">
              <Globe className="w-3 h-3 text-blue-300" />
              <span className="text-xs text-blue-300 font-medium">
                {COMPANY_KPIS.states} states
              </span>
            </div>
          </div>
        </div>

        {/* Attributed Lives */}
        <div className="bg-gradient-to-br from-[var(--medos-navy)] to-[var(--medos-primary)] rounded-xl shadow-medos-md p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-white/70" />
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Attributed Lives</p>
            </div>
            <p className="text-3xl font-bold">
              {formatNumber(COMPANY_KPIS.attributedLives)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUp className="w-3 h-3 text-emerald-300" />
              <span className="text-xs text-emerald-300 font-medium">
                +{COMPANY_KPIS.livesGrowth}% YoY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Service Line */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
              Revenue by Service Line
            </h3>
          </div>
          {/* Stacked bar */}
          <div className="h-8 rounded-full overflow-hidden flex mb-4">
            {SERVICE_LINE_REVENUE.map((sl) => (
              <div
                key={sl.name}
                className={cn("h-full", sl.color)}
                style={{ width: `${sl.pct}%` }}
                title={`${sl.name}: ${sl.pct}%`}
              />
            ))}
          </div>
          <div className="space-y-3">
            {SERVICE_LINE_REVENUE.map((sl) => (
              <div key={sl.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded", sl.color)} />
                  <span className="text-xs text-[var(--medos-navy)]">{sl.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-[var(--medos-navy)]">
                    {formatCurrency(sl.revenue)}
                  </span>
                  <span className="text-[10px] text-[var(--medos-gray-400)] ml-2">
                    {sl.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Geography */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
              Revenue by Geography
            </h3>
          </div>
          <div className="space-y-4">
            {STATE_REVENUE.map((sr) => (
              <div key={sr.state}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--medos-navy)]">{sr.state}</span>
                  <div>
                    <span className="text-xs font-semibold text-[var(--medos-navy)]">
                      {formatCurrency(sr.revenue)}
                    </span>
                    <span className="text-[10px] text-[var(--medos-gray-400)] ml-2">
                      {sr.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--medos-primary)] rounded-full"
                    style={{ width: `${(sr.pct / 28) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* NPS */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Net Promoter Score</h3>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-[var(--medos-primary)]">{COMPANY_KPIS.nps}</p>
            <div className="pb-1">
              <p className="text-[10px] text-[var(--medos-gray-500)]">Industry avg: 38</p>
              <p className="text-[10px] text-emerald-600 font-medium">Excellent</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--medos-primary)] rounded-full"
              style={{ width: `${(COMPANY_KPIS.nps / 100) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-[var(--medos-gray-400)]">-100</span>
            <span className="text-[9px] text-[var(--medos-gray-400)]">0</span>
            <span className="text-[9px] text-[var(--medos-gray-400)]">+100</span>
          </div>
        </div>

        {/* Employee Retention */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Employee Retention</h3>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-emerald-600">{COMPANY_KPIS.employeeRetention}%</p>
            <div className="pb-1">
              <p className="text-[10px] text-[var(--medos-gray-500)]">Industry avg: 78%</p>
              <p className="text-[10px] text-emerald-600 font-medium">+13pts above avg</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${COMPANY_KPIS.employeeRetention}%` }}
            />
          </div>
        </div>

        {/* Provider Productivity */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Provider Productivity</h3>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-[var(--medos-navy)]">
              {COMPANY_KPIS.patientsPerProviderMonth}
            </p>
            <div className="pb-1">
              <p className="text-[10px] text-[var(--medos-gray-500)]">patients/provider/month</p>
              <p className="text-[10px] text-emerald-600 font-medium">Top quartile</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="text-center rounded-md bg-[var(--medos-gray-50)] p-2">
              <p className="text-xs font-bold text-[var(--medos-navy)]">
                {COMPANY_KPIS.providers}
              </p>
              <p className="text-[9px] text-[var(--medos-gray-500)]">Providers</p>
            </div>
            <div className="text-center rounded-md bg-[var(--medos-gray-50)] p-2">
              <p className="text-xs font-bold text-[var(--medos-navy)]">
                {COMPANY_KPIS.facilities}
              </p>
              <p className="text-[9px] text-[var(--medos-gray-500)]">Facilities</p>
            </div>
            <div className="text-center rounded-md bg-[var(--medos-gray-50)] p-2">
              <p className="text-xs font-bold text-[var(--medos-navy)]">1.6</p>
              <p className="text-[9px] text-[var(--medos-gray-500)]">Fac/Provider</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacilityComparisonTab() {
  const [sortColumn, setSortColumn] = useState<SortColumn>("rank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDir(col === "name" || col === "state" ? "asc" : "desc");
    }
  }

  const sorted = [...FACILITY_DATA].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const avgMargin =
    FACILITY_DATA.reduce((s, f) => s + f.margin, 0) / FACILITY_DATA.length;
  const avgReadmission =
    FACILITY_DATA.reduce((s, f) => s + f.readmission, 0) / FACILITY_DATA.length;
  const avgSatisfaction =
    FACILITY_DATA.reduce((s, f) => s + f.satisfaction, 0) / FACILITY_DATA.length;
  const totalRevenue = FACILITY_DATA.reduce((s, f) => s + f.revenue, 0);

  const columns: { key: SortColumn; label: string }[] = [
    { key: "rank", label: "#" },
    { key: "name", label: "Facility" },
    { key: "state", label: "State" },
    { key: "revenue", label: "Revenue" },
    { key: "ebitda", label: "EBITDA" },
    { key: "margin", label: "Margin %" },
    { key: "readmission", label: "Readmit %" },
    { key: "satisfaction", label: "Satisfaction" },
    { key: "ftes", label: "FTEs" },
    { key: "revPerProvider", label: "Rev/Provider" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            Top 10 Revenue
          </p>
          <p className="text-xl font-bold text-[var(--medos-navy)]">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            Avg Margin
          </p>
          <p className="text-xl font-bold text-[var(--medos-navy)]">
            {avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            Avg Readmission
          </p>
          <p className="text-xl font-bold text-[var(--medos-navy)]">
            {avgReadmission.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            Avg Satisfaction
          </p>
          <p className="text-xl font-bold text-[var(--medos-navy)]">
            {avgSatisfaction.toFixed(1)}/5.0
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Building2 className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Top 10 Facilities by Revenue
          </h3>
          <span className="text-[10px] text-[var(--medos-gray-400)] ml-auto">
            Click column headers to sort
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5 cursor-pointer hover:text-[var(--medos-navy)] select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown
                        className={cn(
                          "w-3 h-3",
                          sortColumn === col.key
                            ? "text-[var(--medos-primary)]"
                            : "text-[var(--medos-gray-300)]"
                        )}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {sorted.map((fac, idx) => {
                const isTop = idx < 3;
                const isBottom = idx >= sorted.length - 2;
                return (
                  <tr
                    key={fac.name}
                    className={cn(
                      "hover:bg-[var(--medos-gray-50)] transition-default",
                      isTop && "bg-emerald-50/30",
                      isBottom && "bg-red-50/20"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-[var(--medos-gray-400)]">
                        {fac.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">
                        {fac.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]">
                        {fac.state}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">
                        {formatCurrency(fac.revenue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">
                        {formatCurrency(fac.ebitda)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              fac.margin >= 18
                                ? "bg-emerald-400"
                                : fac.margin >= 14
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            )}
                            style={{ width: `${(fac.margin / 25) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--medos-gray-600)]">
                          {fac.margin}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          fac.readmission <= 11
                            ? "text-emerald-600"
                            : fac.readmission <= 13
                              ? "text-amber-600"
                              : "text-red-600"
                        )}
                      >
                        {fac.readmission}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < Math.floor(fac.satisfaction)
                                ? "text-amber-400 fill-amber-400"
                                : i < fac.satisfaction
                                  ? "text-amber-400 fill-amber-400/50"
                                  : "text-[var(--medos-gray-200)]"
                            )}
                          />
                        ))}
                        <span className="text-[10px] text-[var(--medos-gray-500)] ml-1">
                          {fac.satisfaction}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{fac.ftes}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">
                        {formatCurrency(fac.revPerProvider)}
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

function FinancialRollupTab() {
  const maxRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));
  const bridgeMax = Math.max(...EBITDA_BRIDGE.map((b) => Math.abs(b.value)));

  return (
    <div className="space-y-6">
      {/* Monthly Revenue Trend */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Monthly Revenue Trend (TTM)
          </h3>
        </div>
        <div className="flex items-end gap-2 h-48">
          {MONTHLY_REVENUE.map((m, i) => {
            const heightPct = (m.revenue / maxRevenue) * 100;
            const isLatest = i === MONTHLY_REVENUE.length - 1;
            return (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center justify-end gap-1"
              >
                <span className="text-[9px] font-medium text-[var(--medos-navy)]">
                  {formatCurrency(m.revenue, 1)}
                </span>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    isLatest
                      ? "bg-[var(--medos-primary)]"
                      : "bg-[var(--medos-primary)]/30 hover:bg-[var(--medos-primary)]/50"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[9px] text-[var(--medos-gray-500)]">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* EBITDA Bridge */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            EBITDA Bridge: FY2025 to FY2026
          </h3>
        </div>
        <div className="flex items-end gap-3 h-52">
          {EBITDA_BRIDGE.map((item) => {
            const heightPct = (Math.abs(item.value) / bridgeMax) * 85;
            const isNegative = item.value < 0;
            return (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-medium text-[var(--medos-navy)] text-center">
                  {isNegative ? "-" : ""}
                  {formatCurrency(Math.abs(item.value))}
                </span>
                <div className="w-full flex flex-col justify-end" style={{ height: "180px" }}>
                  <div
                    className={cn(
                      "w-full rounded-t-md",
                      item.isTotal
                        ? "bg-[var(--medos-navy)]"
                        : isNegative
                          ? "bg-red-400"
                          : "bg-emerald-400"
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[8px] text-[var(--medos-gray-500)] text-center leading-tight max-w-[80px]">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Value */}
      <div className="bg-gradient-to-br from-[var(--medos-navy)] to-[var(--medos-primary)] rounded-xl shadow-medos-md p-6 text-white">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-4 h-4 text-white/70" />
          <h3 className="text-sm font-semibold">Platform Value Creation</h3>
          <span className="text-[10px] text-white/50 ml-auto">Based on EBITDA of $8.1M</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {["Valuation Scenario", "Multiple", "Valuation", "Description"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[10px] font-medium text-white/50 uppercase tracking-wider px-4 py-2.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {VALUATION_TABLE.map((row, i) => {
                const isPlatform = i === VALUATION_TABLE.length - 1;
                return (
                  <tr
                    key={row.label}
                    className={isPlatform ? "bg-white/10" : ""}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isPlatform ? "text-white" : "text-white/80"
                        )}
                      >
                        {row.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-white">{row.multiple}x</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          isPlatform ? "text-emerald-300" : "text-white"
                        )}
                      >
                        {formatCurrency(row.valuation)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/60">{row.description}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Value Delta */}
        <div className="mt-4 p-4 rounded-lg bg-white/10 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Value created by MedOS platform</p>
              <p className="text-xs text-white/50 mt-0.5">
                Platform multiple (22x) vs physician services (10x)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-300">
                +{formatCurrency(VALUATION_TABLE[2].valuation - VALUATION_TABLE[0].valuation)}
              </p>
              <p className="text-[10px] text-emerald-300/70">+120% valuation uplift</p>
            </div>
          </div>
        </div>
      </div>

      {/* Amulet Capital Summary */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Target className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Amulet Capital Partners — Investment Summary
          </h3>
          <span className="text-[10px] text-[var(--medos-gray-400)] ml-auto">
            {AMULET_METRICS.fundSize}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-[var(--medos-gray-50)]">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
              Target IRR
            </p>
            <p className="text-xl font-bold text-[var(--medos-navy)]">{AMULET_METRICS.irr}%+</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--medos-gray-50)]">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
              Hold Period
            </p>
            <p className="text-xl font-bold text-[var(--medos-navy)]">
              {AMULET_METRICS.holdPeriod}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--medos-gray-50)]">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
              Entry Multiple
            </p>
            <p className="text-xl font-bold text-[var(--medos-navy)]">
              {AMULET_METRICS.entryMultiple}x
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-50">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1">
              Exit Target
            </p>
            <p className="text-xl font-bold text-emerald-700">
              {AMULET_METRICS.exitMultipleTarget}x
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--medos-gray-50)]">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
              Investment Date
            </p>
            <p className="text-sm font-bold text-[var(--medos-navy)]">
              {AMULET_METRICS.investmentDate}
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-800">
            <strong>Thesis:</strong> Amulet Capital&apos;s investment thesis centers on transforming
            Theoria from a physician staffing company (10x EBITDA) into a tech-enabled healthcare
            platform (22x EBITDA). MedOS is the infrastructure layer that enables this multiple
            expansion by providing AI-native operational intelligence across 87 facilities in 21
            states.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main Export ---

export default function ExecutiveDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("kpis");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">PE Executive Dashboard</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Board-level performance reporting — Amulet Capital Partners
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
      {activeTab === "kpis" && <BoardKPIsTab />}
      {activeTab === "facilities" && <FacilityComparisonTab />}
      {activeTab === "financial" && <FinancialRollupTab />}
    </div>
  );
}
