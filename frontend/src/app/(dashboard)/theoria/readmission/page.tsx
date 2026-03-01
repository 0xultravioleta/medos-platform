"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Layers,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  Clock,
  User,
  Shield,
  Calendar,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "scores" | "factors" | "interventions";
type RiskCategory = "high" | "medium" | "low";
type InterventionPriority = "urgent" | "routine";
type InterventionStatus = "pending" | "scheduled" | "completed";
type SortField = "riskScore" | "name" | "probability";
type SortDir = "asc" | "desc";

interface RiskFactor {
  name: string;
  weight: number;
}

interface PatientRisk {
  id: string;
  name: string;
  facility: string;
  age: number;
  primaryDx: string;
  admissionDate: string;
  riskScore: number;
  probability30Day: number;
  riskFactors: RiskFactor[];
  lastAssessment: string;
}

interface PopulationFactor {
  name: string;
  prevalence: number;
}

interface Intervention {
  id: string;
  patientId: string;
  patient: string;
  riskLevel: RiskCategory;
  type: string;
  description: string;
  priority: InterventionPriority;
  status: InterventionStatus;
  scheduledDate: string;
  assignedTo: string;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof AlertTriangle }[] = [
  { key: "scores", label: "Risk Scores", icon: BarChart3 },
  { key: "factors", label: "Risk Factors", icon: Layers },
  { key: "interventions", label: "Interventions", icon: ListChecks },
];

const RISK_CATEGORY_STYLES: Record<RiskCategory, { bg: string; text: string; bar: string; dot: string }> = {
  high: { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-400", dot: "bg-red-400" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-400", dot: "bg-amber-400" },
  low: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-400", dot: "bg-emerald-400" },
};

const PRIORITY_STYLES: Record<InterventionPriority, { bg: string; text: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700" },
  routine: { bg: "bg-blue-50", text: "text-blue-700" },
};

const STATUS_STYLES: Record<InterventionStatus, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

function getRiskCategory(score: number): RiskCategory {
  if (score > 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

// --- Mock Data ---

const PATIENTS: PatientRisk[] = [
  {
    id: "pr-001",
    name: "Susan Lee",
    facility: "Oakwood Manor",
    age: 82,
    primaryDx: "CHF with Acute Kidney Injury",
    admissionDate: "2026-02-25",
    riskScore: 88,
    probability30Day: 42,
    lastAssessment: "2026-03-01",
    riskFactors: [
      { name: "CHF history", weight: 0.28 },
      { name: "Multiple comorbidities (CHF + AKI)", weight: 0.25 },
      { name: "Prior readmission within 90 days", weight: 0.22 },
      { name: "Polypharmacy (8 medications)", weight: 0.15 },
      { name: "Cognitive impairment", weight: 0.10 },
    ],
  },
  {
    id: "pr-002",
    name: "Margaret Wilson",
    facility: "Sunrise Senior Living",
    age: 79,
    primaryDx: "CHF (Congestive Heart Failure)",
    admissionDate: "2026-02-18",
    riskScore: 76,
    probability30Day: 35,
    lastAssessment: "2026-03-01",
    riskFactors: [
      { name: "CHF history", weight: 0.30 },
      { name: "Poor medication adherence", weight: 0.25 },
      { name: "Polypharmacy (6 medications)", weight: 0.20 },
      { name: "Social isolation", weight: 0.15 },
      { name: "Inadequate follow-up scheduled", weight: 0.10 },
    ],
  },
  {
    id: "pr-003",
    name: "Dorothy Martinez",
    facility: "Willow Creek",
    age: 71,
    primaryDx: "CHF (Decompensated)",
    admissionDate: "2026-02-27",
    riskScore: 72,
    probability30Day: 33,
    lastAssessment: "2026-03-01",
    riskFactors: [
      { name: "CHF history", weight: 0.30 },
      { name: "Multiple comorbidities (CHF + DM2)", weight: 0.25 },
      { name: "Poor medication adherence", weight: 0.20 },
      { name: "Polypharmacy (7 medications)", weight: 0.15 },
      { name: "Inadequate follow-up scheduled", weight: 0.10 },
    ],
  },
  {
    id: "pr-004",
    name: "Eleanor Thompson",
    facility: "Palm Gardens",
    age: 76,
    primaryDx: "Pneumonia (Community-Acquired)",
    admissionDate: "2026-02-26",
    riskScore: 64,
    probability30Day: 28,
    lastAssessment: "2026-03-01",
    riskFactors: [
      { name: "Multiple comorbidities", weight: 0.30 },
      { name: "Prior readmission within 90 days", weight: 0.25 },
      { name: "Polypharmacy (5 medications)", weight: 0.20 },
      { name: "Inadequate follow-up scheduled", weight: 0.15 },
      { name: "Social isolation", weight: 0.10 },
    ],
  },
  {
    id: "pr-005",
    name: "David Kim",
    facility: "Palm Gardens",
    age: 68,
    primaryDx: "Diabetes Type 2 (Uncontrolled)",
    admissionDate: "2026-02-15",
    riskScore: 48,
    probability30Day: 19,
    lastAssessment: "2026-02-28",
    riskFactors: [
      { name: "Poor medication adherence", weight: 0.35 },
      { name: "Polypharmacy (5 medications)", weight: 0.25 },
      { name: "Inadequate follow-up scheduled", weight: 0.20 },
      { name: "Social isolation", weight: 0.20 },
    ],
  },
  {
    id: "pr-006",
    name: "Patricia Moore",
    facility: "Willow Creek",
    age: 74,
    primaryDx: "COPD with Oxygen Dependence",
    admissionDate: "2026-02-19",
    riskScore: 41,
    probability30Day: 16,
    lastAssessment: "2026-02-28",
    riskFactors: [
      { name: "Multiple comorbidities", weight: 0.30 },
      { name: "Polypharmacy (6 medications)", weight: 0.25 },
      { name: "Poor medication adherence", weight: 0.25 },
      { name: "Social isolation", weight: 0.20 },
    ],
  },
  {
    id: "pr-007",
    name: "Robert Davis",
    facility: "Oakwood Manor",
    age: 65,
    primaryDx: "Hip Fracture (Post-ORIF)",
    admissionDate: "2026-02-20",
    riskScore: 22,
    probability30Day: 8,
    lastAssessment: "2026-02-28",
    riskFactors: [
      { name: "Inadequate follow-up scheduled", weight: 0.40 },
      { name: "Social isolation", weight: 0.35 },
      { name: "Polypharmacy (5 medications)", weight: 0.25 },
    ],
  },
  {
    id: "pr-008",
    name: "Charles Anderson",
    facility: "Willow Creek",
    age: 70,
    primaryDx: "Hip Fracture (Rehab Phase)",
    admissionDate: "2026-02-10",
    riskScore: 15,
    probability30Day: 5,
    lastAssessment: "2026-02-28",
    riskFactors: [
      { name: "Social isolation", weight: 0.50 },
      { name: "Inadequate follow-up scheduled", weight: 0.30 },
      { name: "Cognitive impairment", weight: 0.20 },
    ],
  },
];

const POPULATION_FACTORS: PopulationFactor[] = [
  { name: "Polypharmacy (>5 meds)", prevalence: 75 },
  { name: "Multiple comorbidities", prevalence: 62 },
  { name: "CHF history", prevalence: 50 },
  { name: "Poor medication adherence", prevalence: 50 },
  { name: "Social isolation", prevalence: 50 },
  { name: "Inadequate follow-up scheduled", prevalence: 50 },
  { name: "Prior readmission within 90 days", prevalence: 25 },
  { name: "Cognitive impairment", prevalence: 25 },
];

const INTERVENTIONS: Intervention[] = [
  {
    id: "iv-001",
    patientId: "pr-001",
    patient: "Susan Lee",
    riskLevel: "high",
    type: "Medication Reconciliation",
    description: "Complete medication reconciliation for 8 active medications — assess interactions with new AKI-related adjustments",
    priority: "urgent",
    status: "pending",
    scheduledDate: "2026-03-01",
    assignedTo: "Dr. Maria Santos",
  },
  {
    id: "iv-002",
    patientId: "pr-001",
    patient: "Susan Lee",
    riskLevel: "high",
    type: "RPM Enrollment",
    description: "Enroll in continuous remote patient monitoring — Oura Ring + Apple Watch for HRV, SpO2, and sleep tracking post-discharge",
    priority: "urgent",
    status: "scheduled",
    scheduledDate: "2026-03-02",
    assignedTo: "Device Integration Team",
  },
  {
    id: "iv-003",
    patientId: "pr-002",
    patient: "Margaret Wilson",
    riskLevel: "high",
    type: "Home Health Referral",
    description: "Refer to home health nursing for daily weight monitoring, medication management, and CHF education",
    priority: "urgent",
    status: "pending",
    scheduledDate: "2026-03-01",
    assignedTo: "Care Coordinator",
  },
  {
    id: "iv-004",
    patientId: "pr-002",
    patient: "Margaret Wilson",
    riskLevel: "high",
    type: "Family Education Session",
    description: "Schedule family education on CHF self-management: daily weights, sodium restriction, medication adherence, symptom recognition",
    priority: "routine",
    status: "scheduled",
    scheduledDate: "2026-03-03",
    assignedTo: "Nurse Educator",
  },
  {
    id: "iv-005",
    patientId: "pr-003",
    patient: "Dorothy Martinez",
    riskLevel: "high",
    type: "PCP Follow-up within 7 Days",
    description: "Schedule PCP follow-up within 7 days of discharge for CHF + DM2 management reassessment",
    priority: "urgent",
    status: "pending",
    scheduledDate: "2026-03-02",
    assignedTo: "Scheduling Team",
  },
  {
    id: "iv-006",
    patientId: "pr-003",
    patient: "Dorothy Martinez",
    riskLevel: "high",
    type: "Care Plan Update",
    description: "Update care plan to include insulin sliding scale optimization and daily glucose monitoring protocol",
    priority: "routine",
    status: "completed",
    scheduledDate: "2026-02-28",
    assignedTo: "Dr. Ahmed Khan",
  },
  {
    id: "iv-007",
    patientId: "pr-004",
    patient: "Eleanor Thompson",
    riskLevel: "high",
    type: "Telemedicine Check-in Schedule",
    description: "Establish telemedicine check-in schedule: Day 3, Day 7, Day 14 post-discharge for respiratory assessment",
    priority: "routine",
    status: "pending",
    scheduledDate: "2026-03-03",
    assignedTo: "Telemedicine Team",
  },
  {
    id: "iv-008",
    patientId: "pr-005",
    patient: "David Kim",
    riskLevel: "medium",
    type: "RPM Enrollment",
    description: "Continue Dexcom G7 monitoring post-discharge with telemedicine glucose management review weekly",
    priority: "routine",
    status: "scheduled",
    scheduledDate: "2026-03-04",
    assignedTo: "Device Integration Team",
  },
  {
    id: "iv-009",
    patientId: "pr-005",
    patient: "David Kim",
    riskLevel: "medium",
    type: "Family Education Session",
    description: "Diabetes self-management education with daughter — insulin administration, hypoglycemia recognition, dietary guidance",
    priority: "routine",
    status: "pending",
    scheduledDate: "2026-03-02",
    assignedTo: "Nurse Educator",
  },
  {
    id: "iv-010",
    patientId: "pr-006",
    patient: "Patricia Moore",
    riskLevel: "medium",
    type: "Medication Reconciliation",
    description: "Pre-discharge medication reconciliation for 6 active medications including inhaler technique assessment",
    priority: "routine",
    status: "completed",
    scheduledDate: "2026-02-27",
    assignedTo: "Clinical Pharmacist",
  },
  {
    id: "iv-011",
    patientId: "pr-007",
    patient: "Robert Davis",
    riskLevel: "low",
    type: "PCP Follow-up within 7 Days",
    description: "Schedule orthopedic and PCP follow-up for post-ORIF rehabilitation progress assessment",
    priority: "routine",
    status: "scheduled",
    scheduledDate: "2026-03-05",
    assignedTo: "Scheduling Team",
  },
  {
    id: "iv-012",
    patientId: "pr-008",
    patient: "Charles Anderson",
    riskLevel: "low",
    type: "Home Health Referral",
    description: "Home health physical therapy referral for continued rehabilitation and fall prevention",
    priority: "routine",
    status: "completed",
    scheduledDate: "2026-02-28",
    assignedTo: "Care Coordinator",
  },
];

// --- Tab Components ---

function RiskScoresTab() {
  const [sortField, setSortField] = useState<SortField>("riskScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...PATIENTS].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return a.name.localeCompare(b.name) * mul;
    if (sortField === "probability") return (a.probability30Day - b.probability30Day) * mul;
    return (a.riskScore - b.riskScore) * mul;
  });

  const highCount = PATIENTS.filter((p) => getRiskCategory(p.riskScore) === "high").length;
  const medCount = PATIENTS.filter((p) => getRiskCategory(p.riskScore) === "medium").length;
  const lowCount = PATIENTS.filter((p) => getRiskCategory(p.riskScore) === "low").length;

  const total = PATIENTS.length;
  const highPct = Math.round((highCount / total) * 100);
  const medPct = Math.round((medCount / total) * 100);
  const lowPct = 100 - highPct - medPct;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Total Patients</p>
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 shadow-medos-sm p-5">
          <p className="text-[10px] text-red-500 uppercase tracking-wider">High Risk</p>
          <p className="text-2xl font-bold text-red-700">{highCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 shadow-medos-sm p-5">
          <p className="text-[10px] text-amber-500 uppercase tracking-wider">Medium Risk</p>
          <p className="text-2xl font-bold text-amber-700">{medCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 shadow-medos-sm p-5">
          <p className="text-[10px] text-emerald-500 uppercase tracking-wider">Low Risk</p>
          <p className="text-2xl font-bold text-emerald-700">{lowCount}</p>
        </div>
      </div>

      {/* Distribution Bar */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Risk Distribution</h3>
        </div>
        <div className="h-4 bg-[var(--medos-gray-100)] rounded-full overflow-hidden flex">
          <div className="bg-red-400 h-full" style={{ width: `${highPct}%` }} />
          <div className="bg-amber-400 h-full" style={{ width: `${medPct}%` }} />
          <div className="bg-emerald-400 h-full" style={{ width: `${lowPct}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[10px] text-[var(--medos-gray-500)]">High ({highPct}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-[var(--medos-gray-500)]">Medium ({medPct}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[var(--medos-gray-500)]">Low ({lowPct}%)</span>
          </div>
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <AlertTriangle className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Patient Risk Scores</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {[
                  { key: "name" as SortField, label: "Patient" },
                  { key: null, label: "Facility" },
                  { key: null, label: "Age" },
                  { key: null, label: "Primary Dx" },
                  { key: "riskScore" as SortField, label: "Risk Score" },
                  { key: "probability" as SortField, label: "30-Day Prob." },
                  { key: null, label: "Category" },
                  { key: null, label: "Last Assessment" },
                ].map((col, i) => (
                  <th
                    key={i}
                    className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5"
                  >
                    {col.key ? (
                      <button
                        onClick={() => handleSort(col.key!)}
                        className="flex items-center gap-1 hover:text-[var(--medos-navy)]"
                      >
                        {col.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {sorted.map((pt) => {
                const cat = getRiskCategory(pt.riskScore);
                const catStyle = RISK_CATEGORY_STYLES[cat];
                return (
                  <tr key={pt.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">{pt.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{pt.facility}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{pt.age}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{pt.primaryDx}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-28">
                        <div className="flex-1 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", catStyle.bar)}
                            style={{ width: `${pt.riskScore}%` }}
                          />
                        </div>
                        <span className={cn("text-[10px] font-bold w-6 text-right", catStyle.text)}>
                          {pt.riskScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium", catStyle.text)}>
                        {pt.probability30Day}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          catStyle.bg,
                          catStyle.text
                        )}
                      >
                        {cat}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-500)]">{pt.lastAssessment}</span>
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

function RiskFactorsTab() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const highRiskPatients = PATIENTS.filter((p) => getRiskCategory(p.riskScore) === "high");

  return (
    <div className="space-y-6">
      {/* Population-Level Factor Frequency */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Population-Level Risk Factor Prevalence
          </h3>
        </div>
        <div className="space-y-3">
          {POPULATION_FACTORS.map((factor) => (
            <div key={factor.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--medos-gray-700)]">{factor.name}</span>
                <span className="text-xs font-medium text-[var(--medos-navy)]">{factor.prevalence}%</span>
              </div>
              <div className="h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    factor.prevalence > 60
                      ? "bg-red-400"
                      : factor.prevalence > 40
                        ? "bg-amber-400"
                        : "bg-blue-400"
                  )}
                  style={{ width: `${factor.prevalence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Patient Factor Breakdown */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <User className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            High-Risk Patient Factor Breakdown
          </h3>
        </div>
        <div className="divide-y divide-[var(--medos-gray-100)]">
          {highRiskPatients.map((pt) => {
            const isOpen = expanded[pt.id] ?? true;
            return (
              <div key={pt.id}>
                <button
                  onClick={() => toggle(pt.id)}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[var(--medos-gray-50)] transition-default"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-[var(--medos-navy)]">{pt.name}</span>
                    <span className="text-[10px] text-[var(--medos-gray-400)] ml-2">
                      Score: {pt.riskScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--medos-gray-400)]">
                    {pt.riskFactors.length} factors
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-4">
                    <div className="space-y-2 ml-5">
                      {pt.riskFactors.map((factor) => {
                        const pct = Math.round(factor.weight * 100);
                        return (
                          <div key={factor.name}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-[var(--medos-gray-600)]">
                                {factor.name}
                              </span>
                              <span className="text-[10px] font-medium text-[var(--medos-navy)]">
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  pct > 25 ? "bg-red-400" : pct > 15 ? "bg-amber-400" : "bg-blue-400"
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InterventionsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = INTERVENTIONS.filter((iv) => {
    if (statusFilter !== "all" && iv.status !== statusFilter) return false;
    if (priorityFilter !== "all" && iv.priority !== priorityFilter) return false;
    return true;
  });

  const pendingCount = INTERVENTIONS.filter((i) => i.status === "pending").length;
  const completedThisWeek = INTERVENTIONS.filter((i) => i.status === "completed").length;
  const totalCount = INTERVENTIONS.length;
  const successRate = totalCount > 0 ? Math.round((completedThisWeek / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Total Pending</p>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Completed This Week</p>
          <p className="text-2xl font-bold text-emerald-700">{completedThisWeek}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Completion Rate</p>
          <p className="text-2xl font-bold text-[var(--medos-primary)]">{successRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
          <span className="text-xs text-[var(--medos-gray-500)]">Status:</span>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-[var(--medos-gray-200)] rounded-md pl-3 pr-7 py-1.5 text-xs text-[var(--medos-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--medos-primary)]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[var(--medos-gray-400)] pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--medos-gray-500)]">Priority:</span>
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none bg-white border border-[var(--medos-gray-200)] rounded-md pl-3 pr-7 py-1.5 text-xs text-[var(--medos-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--medos-primary)]"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[var(--medos-gray-400)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Interventions Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <ListChecks className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Recommended Interventions ({filtered.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Patient", "Risk", "Type", "Description", "Priority", "Status", "Scheduled", "Assigned To"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((iv) => {
                const riskStyle = RISK_CATEGORY_STYLES[iv.riskLevel];
                const priStyle = PRIORITY_STYLES[iv.priority];
                const statStyle = STATUS_STYLES[iv.status];
                return (
                  <tr key={iv.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">{iv.patient}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          riskStyle.bg,
                          riskStyle.text
                        )}
                      >
                        {iv.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-700)] font-medium">{iv.type}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-xs text-[var(--medos-gray-600)]">{iv.description}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          priStyle.bg,
                          priStyle.text
                        )}
                      >
                        {iv.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          statStyle.bg,
                          statStyle.text
                        )}
                      >
                        {iv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[var(--medos-gray-400)]" />
                        <span className="text-xs text-[var(--medos-gray-500)]">{iv.scheduledDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{iv.assignedTo}</span>
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

// --- Main Export ---

export default function ReadmissionRiskPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("scores");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Readmission Risk</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              AI-powered predictive scoring — 30-day readmission prevention
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
      {activeTab === "scores" && <RiskScoresTab />}
      {activeTab === "factors" && <RiskFactorsTab />}
      {activeTab === "interventions" && <InterventionsTab />}
    </div>
  );
}
