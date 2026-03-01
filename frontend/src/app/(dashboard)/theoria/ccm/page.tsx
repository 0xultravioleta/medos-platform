"use client";

import { useState } from "react";
import {
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Phone,
  FileText,
  Pill,
  ArrowUpDown,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Filter,
  Calendar,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =============================================
   TYPES
   ============================================= */

type TabKey = "patients" | "time" | "billing";

type CarePlanStatus = "active" | "needs-update";
type ClaimStatus = "ready" | "submitted" | "paid";
type ActivityType =
  | "phone-call"
  | "chart-review"
  | "medication-reconciliation"
  | "care-coordination"
  | "lab-follow-up";

interface CCMPatient {
  id: string;
  name: string;
  facility: string;
  primaryDx: string;
  carePlanStatus: CarePlanStatus;
  enrolledDate: string;
  minutesThisMonth: number;
  activities: ActivityEntry[];
}

interface ActivityEntry {
  date: string;
  type: ActivityType;
  duration: number;
  provider: string;
  notes: string;
}

interface BillingEntry {
  patientId: string;
  name: string;
  minutes: number;
  cpt99490: boolean;
  cpt99439: boolean;
  revenue: number;
  claimStatus: ClaimStatus;
}

/* =============================================
   MOCK DATA
   ============================================= */

const FACILITIES = [
  "Sunrise Senior Living, Troy MI",
  "Oakwood Manor, Dearborn MI",
  "Palm Gardens, Boca Raton FL",
  "Willow Creek, Jacksonville FL",
];

const PATIENTS: CCMPatient[] = [
  {
    id: "ccm-001", name: "Margaret Thompson", facility: FACILITIES[0],
    primaryDx: "CHF (I50.9)", carePlanStatus: "active", enrolledDate: "2025-09-15", minutesThisMonth: 28,
    activities: [
      { date: "2026-03-02", type: "phone-call", duration: 8, provider: "RN Sarah Chen", notes: "Discussed weight gain — advised low-sodium diet adherence" },
      { date: "2026-03-07", type: "medication-reconciliation", duration: 6, provider: "PharmD Lisa Park", notes: "Confirmed furosemide 40mg BID, no changes" },
      { date: "2026-03-14", type: "care-coordination", duration: 7, provider: "RN Sarah Chen", notes: "Coordinated cardiology follow-up with Dr. Patel" },
      { date: "2026-03-20", type: "lab-follow-up", duration: 7, provider: "RN Sarah Chen", notes: "BNP stable at 340, potassium 4.1 — within range" },
    ],
  },
  {
    id: "ccm-002", name: "Robert Williams", facility: FACILITIES[1],
    primaryDx: "COPD (J44.1)", carePlanStatus: "active", enrolledDate: "2025-10-01", minutesThisMonth: 22,
    activities: [
      { date: "2026-03-03", type: "phone-call", duration: 10, provider: "RN Maria Lopez", notes: "Breathing assessment — using inhaler correctly" },
      { date: "2026-03-12", type: "chart-review", duration: 5, provider: "RN Maria Lopez", notes: "Reviewed recent PFT results, FEV1 stable" },
      { date: "2026-03-19", type: "care-coordination", duration: 7, provider: "RN Maria Lopez", notes: "Arranged pulmonology consult for next month" },
    ],
  },
  {
    id: "ccm-003", name: "Dorothy Garcia", facility: FACILITIES[2],
    primaryDx: "Diabetes T2 (E11.9)", carePlanStatus: "needs-update", enrolledDate: "2025-08-20", minutesThisMonth: 18,
    activities: [
      { date: "2026-03-05", type: "phone-call", duration: 7, provider: "RN James Wu", notes: "Blood sugar trending high — 180-220 range" },
      { date: "2026-03-15", type: "medication-reconciliation", duration: 6, provider: "PharmD Lisa Park", notes: "Recommend metformin dose increase, pending MD approval" },
      { date: "2026-03-22", type: "lab-follow-up", duration: 5, provider: "RN James Wu", notes: "HbA1c came back at 8.2 — needs care plan update" },
    ],
  },
  {
    id: "ccm-004", name: "James Mitchell", facility: FACILITIES[0],
    primaryDx: "HTN (I10)", carePlanStatus: "active", enrolledDate: "2025-11-10", minutesThisMonth: 12,
    activities: [
      { date: "2026-03-06", type: "phone-call", duration: 6, provider: "RN Sarah Chen", notes: "BP self-reports 138/88, slightly elevated" },
      { date: "2026-03-18", type: "chart-review", duration: 6, provider: "RN Sarah Chen", notes: "Reviewed home BP log — averaging 135/85" },
    ],
  },
  {
    id: "ccm-005", name: "Helen Anderson", facility: FACILITIES[3],
    primaryDx: "CKD Stage 3 (N18.3)", carePlanStatus: "active", enrolledDate: "2025-07-01", minutesThisMonth: 42,
    activities: [
      { date: "2026-03-01", type: "phone-call", duration: 10, provider: "RN Maria Lopez", notes: "Fluid intake discussion — aiming for 1.5L/day" },
      { date: "2026-03-05", type: "medication-reconciliation", duration: 8, provider: "PharmD Lisa Park", notes: "Adjusted phosphate binder timing with meals" },
      { date: "2026-03-10", type: "care-coordination", duration: 8, provider: "RN Maria Lopez", notes: "Nephrology referral confirmed for March 25" },
      { date: "2026-03-15", type: "lab-follow-up", duration: 7, provider: "RN Maria Lopez", notes: "eGFR 38 — stable from last month" },
      { date: "2026-03-22", type: "phone-call", duration: 9, provider: "RN Maria Lopez", notes: "Diet compliance check, discussed potassium-rich foods to avoid" },
    ],
  },
  {
    id: "ccm-006", name: "William Brown", facility: FACILITIES[1],
    primaryDx: "CHF (I50.22)", carePlanStatus: "needs-update", enrolledDate: "2025-12-01", minutesThisMonth: 15,
    activities: [
      { date: "2026-03-04", type: "phone-call", duration: 8, provider: "RN James Wu", notes: "Reports increased ankle swelling past 3 days" },
      { date: "2026-03-16", type: "chart-review", duration: 7, provider: "RN James Wu", notes: "Weight up 4lbs — care plan needs adjustment" },
    ],
  },
  {
    id: "ccm-007", name: "Patricia Davis", facility: FACILITIES[2],
    primaryDx: "Diabetes T2 + HTN", carePlanStatus: "active", enrolledDate: "2025-09-01", minutesThisMonth: 35,
    activities: [
      { date: "2026-03-02", type: "phone-call", duration: 8, provider: "RN Sarah Chen", notes: "Reviewed glucose log — fasting 110-130, improved" },
      { date: "2026-03-08", type: "medication-reconciliation", duration: 7, provider: "PharmD Lisa Park", notes: "Lisinopril 20mg stable, added aspirin 81mg" },
      { date: "2026-03-14", type: "care-coordination", duration: 6, provider: "RN Sarah Chen", notes: "Scheduled diabetic eye exam for April" },
      { date: "2026-03-20", type: "lab-follow-up", duration: 7, provider: "RN Sarah Chen", notes: "HbA1c 7.1 — good control, maintain current regimen" },
      { date: "2026-03-25", type: "phone-call", duration: 7, provider: "RN Sarah Chen", notes: "BP check: 128/82 — well controlled on current meds" },
    ],
  },
  {
    id: "ccm-008", name: "Richard Wilson", facility: FACILITIES[3],
    primaryDx: "COPD + CHF", carePlanStatus: "active", enrolledDate: "2025-10-15", minutesThisMonth: 8,
    activities: [
      { date: "2026-03-10", type: "phone-call", duration: 8, provider: "RN James Wu", notes: "Stable — using O2 at night, no exacerbations" },
    ],
  },
  {
    id: "ccm-009", name: "Barbara Martinez", facility: FACILITIES[0],
    primaryDx: "CKD Stage 4 (N18.4)", carePlanStatus: "active", enrolledDate: "2025-06-15", minutesThisMonth: 25,
    activities: [
      { date: "2026-03-03", type: "phone-call", duration: 7, provider: "RN Maria Lopez", notes: "Discussed dialysis prep options — patient prefers PD" },
      { date: "2026-03-09", type: "care-coordination", duration: 8, provider: "RN Maria Lopez", notes: "Vascular surgery referral for fistula placement" },
      { date: "2026-03-17", type: "lab-follow-up", duration: 5, provider: "RN Maria Lopez", notes: "eGFR 22 — trending down, nephrology aware" },
      { date: "2026-03-24", type: "medication-reconciliation", duration: 5, provider: "PharmD Lisa Park", notes: "Epoetin alfa dose adjusted per nephrologist" },
    ],
  },
  {
    id: "ccm-010", name: "Charles Taylor", facility: FACILITIES[1],
    primaryDx: "HTN + Diabetes T2", carePlanStatus: "needs-update", enrolledDate: "2025-11-20", minutesThisMonth: 19,
    activities: [
      { date: "2026-03-01", type: "phone-call", duration: 6, provider: "RN James Wu", notes: "BP 148/92 — above target, lifestyle modifications discussed" },
      { date: "2026-03-11", type: "chart-review", duration: 5, provider: "RN James Wu", notes: "Reviewed recent A1c: 8.8 — needs medication adjustment" },
      { date: "2026-03-21", type: "care-coordination", duration: 8, provider: "RN James Wu", notes: "Endocrinology referral placed, care plan update needed" },
    ],
  },
];

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  "phone-call": "Phone Call",
  "chart-review": "Chart Review",
  "medication-reconciliation": "Med Reconciliation",
  "care-coordination": "Care Coordination",
  "lab-follow-up": "Lab Follow-up",
};

const ACTIVITY_ICONS: Record<ActivityType, typeof Phone> = {
  "phone-call": Phone,
  "chart-review": FileText,
  "medication-reconciliation": Pill,
  "care-coordination": ArrowUpDown,
  "lab-follow-up": FlaskConical,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  "phone-call": "bg-blue-500",
  "chart-review": "bg-purple-500",
  "medication-reconciliation": "bg-amber-500",
  "care-coordination": "bg-teal-500",
  "lab-follow-up": "bg-rose-500",
};

/* =============================================
   HELPERS
   ============================================= */

function minuteColor(min: number) {
  if (min >= 20) return "bg-emerald-500";
  if (min >= 15) return "bg-amber-500";
  return "bg-red-500";
}

function minuteTextColor(min: number) {
  if (min >= 20) return "text-emerald-700";
  if (min >= 15) return "text-amber-700";
  return "text-red-700";
}

function buildBilling(): BillingEntry[] {
  return PATIENTS.map((p) => {
    const has99490 = p.minutesThisMonth >= 20;
    const has99439 = p.minutesThisMonth >= 40;
    let revenue = 0;
    if (has99490) revenue += 62;
    if (has99439) revenue += 47;
    const claimStatus: ClaimStatus = has99490
      ? p.minutesThisMonth >= 40 ? "paid" : "submitted"
      : "ready";
    return {
      patientId: p.id, name: p.name, minutes: p.minutesThisMonth,
      cpt99490: has99490, cpt99439: has99439, revenue,
      claimStatus: has99490 ? claimStatus : "ready",
    };
  });
}

/* =============================================
   TABS
   ============================================= */

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: "patients", label: "Patient List", icon: Users },
  { key: "time", label: "Time Aggregation", icon: Clock },
  { key: "billing", label: "Billing Threshold", icon: DollarSign },
];

/* =============================================
   PATIENT LIST TAB
   ============================================= */

function PatientListTab() {
  const billable = PATIENTS.filter((p) => p.minutesThisMonth >= 20);
  const atRisk = PATIENTS.filter((p) => p.minutesThisMonth >= 15 && p.minutesThisMonth < 20);
  const totalRevenue = billable.reduce((s, p) => {
    let r = 62;
    if (p.minutesThisMonth >= 40) r += 47;
    return s + r;
  }, 0);
  const atRiskRevenue = atRisk.length * 62;

  const kpis = [
    { label: "Total Enrolled", value: PATIENTS.length, icon: Users, color: "text-[var(--medos-primary)]" },
    { label: "Billable This Month", value: billable.length, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Revenue Captured", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
    { label: "Revenue At Risk", value: `$${atRiskRevenue.toLocaleString()}`, icon: AlertTriangle, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={cn("w-4 h-4", k.color)} />
              <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Users className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">CCM Enrolled Patients</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Patient", "Facility", "Primary Dx", "Care Plan", "Enrolled", "Minutes", "Billable"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {PATIENTS.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                  <td className="px-4 py-3 text-xs font-medium text-[var(--medos-navy)]">{p.name}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{p.facility}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{p.primaryDx}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                      p.carePlanStatus === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    )}>
                      {p.carePlanStatus === "active" ? "Active" : "Needs Update"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{p.enrolledDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", minuteColor(p.minutesThisMonth))}
                          style={{ width: `${Math.min((p.minutesThisMonth / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-semibold", minuteTextColor(p.minutesThisMonth))}>
                        {p.minutesThisMonth}m
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                      p.minutesThisMonth >= 20
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[var(--medos-gray-100)] text-[var(--medos-gray-500)]"
                    )}>
                      {p.minutesThisMonth >= 20 ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =============================================
   TIME AGGREGATION TAB
   ============================================= */

function TimeAggregationTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");

  const totalHours = PATIENTS.reduce((s, p) => s + p.minutesThisMonth, 0) / 60;
  const avgPerPatient = PATIENTS.reduce((s, p) => s + p.minutesThisMonth, 0) / PATIENTS.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[var(--medos-primary)]" />
            <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[var(--medos-primary)]" />
            <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Avg / Patient</span>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{avgPerPatient.toFixed(1)}m</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-[var(--medos-primary)]" />
            <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Filter by Type</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ActivityType | "all")}
            className="mt-1 w-full text-xs border border-[var(--medos-gray-200)] rounded-md px-2 py-1.5 text-[var(--medos-gray-700)]"
          >
            <option value="all">All Activities</option>
            {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Cards */}
      <div className="space-y-3">
        {PATIENTS.map((p) => {
          const isExpanded = expanded === p.id;
          const filtered = filterType === "all" ? p.activities : p.activities.filter((a) => a.type === filterType);
          const typeTotals = p.activities.reduce((acc, a) => {
            acc[a.type] = (acc[a.type] || 0) + a.duration;
            return acc;
          }, {} as Record<ActivityType, number>);

          return (
            <div key={p.id} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : p.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--medos-gray-50)] transition-default"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] text-left">{p.name}</p>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">{p.facility}</p>
                  </div>
                  <span className={cn("text-sm font-bold", minuteTextColor(p.minutesThisMonth))}>
                    {p.minutesThisMonth}m
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {/* Stacked bar */}
                  <div className="w-40 h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden flex">
                    {Object.entries(typeTotals).map(([type, mins]) => (
                      <div
                        key={type}
                        className={cn("h-full", ACTIVITY_COLORS[type as ActivityType])}
                        style={{ width: `${(mins / p.minutesThisMonth) * 100}%` }}
                        title={`${ACTIVITY_LABELS[type as ActivityType]}: ${mins}m`}
                      />
                    ))}
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" /> : <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--medos-gray-100)] px-6 py-4 space-y-2">
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-3">
                    {Object.entries(typeTotals).map(([type, mins]) => {
                      const Icon = ACTIVITY_ICONS[type as ActivityType];
                      return (
                        <div key={type} className="flex items-center gap-1.5">
                          <div className={cn("w-2.5 h-2.5 rounded-full", ACTIVITY_COLORS[type as ActivityType])} />
                          <Icon className="w-3 h-3 text-[var(--medos-gray-500)]" />
                          <span className="text-[10px] text-[var(--medos-gray-600)]">{ACTIVITY_LABELS[type as ActivityType]}: {mins}m</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Activity entries */}
                  {filtered.map((a, i) => {
                    const Icon = ACTIVITY_ICONS[a.type];
                    return (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--medos-gray-50)] last:border-0">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", ACTIVITY_COLORS[a.type].replace("bg-", "bg-opacity-20 bg-"))}>
                          <Icon className="w-3 h-3 text-[var(--medos-gray-600)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[var(--medos-navy)]">{ACTIVITY_LABELS[a.type]}</span>
                            <span className="text-[10px] text-[var(--medos-gray-400)]">{a.duration}m</span>
                          </div>
                          <p className="text-[10px] text-[var(--medos-gray-500)] mt-0.5">{a.notes}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-[var(--medos-gray-400)]" />
                            <span className="text-[10px] text-[var(--medos-gray-400)]">{a.date}</span>
                            <span className="text-[10px] text-[var(--medos-gray-400)]">by {a.provider}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="text-xs text-[var(--medos-gray-400)] text-center py-4">No activities match the selected filter.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================================
   BILLING THRESHOLD TAB
   ============================================= */

function BillingThresholdTab() {
  const billing = buildBilling();
  const claimsReady = billing.filter((b) => b.cpt99490 || b.cpt99439);
  const totalRevenue = billing.reduce((s, b) => s + b.revenue, 0);
  const lastMonthRevenue = 485; // simulated
  const delta = totalRevenue - lastMonthRevenue;

  const statusColors: Record<ClaimStatus, string> = {
    ready: "bg-blue-50 text-blue-700",
    submitted: "bg-amber-50 text-amber-700",
    paid: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Claims Ready", value: claimsReady.length, icon: CheckCircle2, color: "text-[var(--medos-primary)]" },
          { label: "Total Revenue", value: `$${totalRevenue}`, icon: DollarSign, color: "text-emerald-600" },
          { label: "Projected Monthly", value: `$${totalRevenue}`, icon: TrendingUp, color: "text-blue-600" },
          { label: "vs Last Month", value: `${delta >= 0 ? "+" : ""}$${delta}`, icon: BarChart3, color: delta >= 0 ? "text-emerald-600" : "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={cn("w-4 h-4", k.color)} />
              <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Patient threshold cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {billing.map((b) => (
          <div key={b.patientId} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--medos-navy)]">{b.name}</p>
              {b.revenue > 0 && (
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusColors[b.claimStatus])}>
                  {b.claimStatus.charAt(0).toUpperCase() + b.claimStatus.slice(1)}
                </span>
              )}
            </div>
            {/* Minutes bar */}
            <div className="relative mb-3">
              <div className="w-full h-4 bg-[var(--medos-gray-100)] rounded-full overflow-hidden relative">
                <div
                  className={cn("h-full rounded-full transition-all", minuteColor(b.minutes))}
                  style={{ width: `${Math.min((b.minutes / 60) * 100, 100)}%` }}
                />
                {/* 20-min marker */}
                <div className="absolute top-0 left-[33.3%] w-px h-full bg-[var(--medos-gray-400)]" />
                {/* 40-min marker */}
                <div className="absolute top-0 left-[66.6%] w-px h-full bg-[var(--medos-gray-400)]" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-[var(--medos-gray-400)]">0m</span>
                <span className="text-[9px] text-[var(--medos-gray-400)]" style={{ position: "absolute", left: "33.3%" }}>20m</span>
                <span className="text-[9px] text-[var(--medos-gray-400)]" style={{ position: "absolute", left: "66.6%" }}>40m</span>
                <span className="text-[9px] text-[var(--medos-gray-400)]">60m</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold", minuteTextColor(b.minutes))}>{b.minutes}m logged</span>
              </div>
              <div className="flex items-center gap-2">
                {b.cpt99490 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                    99490 ($62)
                  </span>
                )}
                {b.cpt99439 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                    99439 ($47)
                  </span>
                )}
                {!b.cpt99490 && (
                  <span className="text-[10px] text-[var(--medos-gray-400)]">
                    {20 - b.minutes}m to 99490
                  </span>
                )}
              </div>
            </div>
            {b.revenue > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--medos-gray-100)]">
                <span className="text-xs font-semibold text-emerald-700">${b.revenue} revenue</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================
   MAIN PAGE
   ============================================= */

export default function CCMTimeTrackerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("patients");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Clock className="w-6 h-6 text-[var(--medos-primary)]" />
          <h1 className="text-xl font-bold text-[var(--medos-navy)]">CCM Time Tracker</h1>
        </div>
        <p className="text-sm text-[var(--medos-gray-500)] ml-9">
          Chronic Care Management billing automation — CPT 99490/99439
        </p>
      </div>

      {/* Tab bar */}
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

      {/* Tab content */}
      {activeTab === "patients" && <PatientListTab />}
      {activeTab === "time" && <TimeAggregationTab />}
      {activeTab === "billing" && <BillingThresholdTab />}
    </div>
  );
}
