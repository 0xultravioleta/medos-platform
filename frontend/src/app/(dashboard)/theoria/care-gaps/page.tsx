"use client";

import { useState } from "react";
import {
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageSquare,
  MessagesSquare,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowUpDown,
  Target,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Mail,
  Activity,
  Eye,
  ShieldCheck,
  Brain,
  Pill,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =============================================
   TYPES
   ============================================= */

type TabKey = "population" | "gaps" | "outreach";
type OutreachResult = "reached" | "voicemail" | "no-answer" | "scheduled";
type OutreachChannel = "phone" | "SMS" | "ChatEasy";
type GapOutreachStatus = "not-started" | "contacted" | "scheduled" | "completed";

type GapType =
  | "hba1c-overdue"
  | "bp-missing"
  | "awv-not-scheduled"
  | "acp-not-documented"
  | "med-adherence-overdue"
  | "fall-risk-expired"
  | "phq9-due"
  | "colorectal-screening"
  | "diabetic-eye-exam";

interface CareGap {
  type: GapType;
  lastCompleted: string | null;
  dueDate: string;
  daysOverdue: number;
  qualityMeasure: string;
  revenueImpact: number;
  outreachStatus: GapOutreachStatus;
}

interface GapPatient {
  id: string;
  name: string;
  age: number;
  facility: string;
  payer: "Medicare" | "Empassion ACO REACH";
  riskScore: number;
  gaps: CareGap[];
}

interface OutreachEntry {
  patientId: string;
  patientName: string;
  gapType: GapType;
  channel: OutreachChannel;
  contactDate: string;
  result: OutreachResult;
  followUpDate: string | null;
  assignedTo: string;
}

/* =============================================
   CONSTANTS
   ============================================= */

const GAP_LABELS: Record<GapType, string> = {
  "hba1c-overdue": "HbA1c Overdue",
  "bp-missing": "BP Reading Missing",
  "awv-not-scheduled": "Annual Wellness Visit",
  "acp-not-documented": "Advance Care Planning",
  "med-adherence-overdue": "Med Adherence Review",
  "fall-risk-expired": "Fall Risk Assessment",
  "phq9-due": "Depression Screening (PHQ-9)",
  "colorectal-screening": "Colorectal Cancer Screening",
  "diabetic-eye-exam": "Diabetic Eye Exam",
};

const GAP_ICONS: Record<GapType, typeof Activity> = {
  "hba1c-overdue": Activity,
  "bp-missing": HeartPulse,
  "awv-not-scheduled": Calendar,
  "acp-not-documented": ShieldCheck,
  "med-adherence-overdue": Pill,
  "fall-risk-expired": AlertTriangle,
  "phq9-due": Brain,
  "colorectal-screening": Stethoscope,
  "diabetic-eye-exam": Eye,
};

const GAP_MEASURES: Record<GapType, string> = {
  "hba1c-overdue": "HEDIS CDC-HbA1c",
  "bp-missing": "CMS 165v10",
  "awv-not-scheduled": "CMS AWV G0438/G0439",
  "acp-not-documented": "CMS 99497",
  "med-adherence-overdue": "HEDIS PDC",
  "fall-risk-expired": "CMS 318v2",
  "phq9-due": "CMS 159v10",
  "colorectal-screening": "HEDIS COL",
  "diabetic-eye-exam": "HEDIS EED",
};

const GAP_REVENUE: Record<GapType, number> = {
  "hba1c-overdue": 45,
  "bp-missing": 30,
  "awv-not-scheduled": 175,
  "acp-not-documented": 86,
  "med-adherence-overdue": 35,
  "fall-risk-expired": 42,
  "phq9-due": 48,
  "colorectal-screening": 55,
  "diabetic-eye-exam": 65,
};

const FACILITIES = [
  "Sunrise Senior Living, Troy MI",
  "Oakwood Manor, Dearborn MI",
  "Palm Gardens, Boca Raton FL",
  "Willow Creek, Jacksonville FL",
];

const CHANNEL_ICONS: Record<OutreachChannel, typeof Phone> = {
  phone: Phone,
  SMS: MessageSquare,
  ChatEasy: MessagesSquare,
};

/* =============================================
   MOCK DATA
   ============================================= */

const PATIENTS: GapPatient[] = [
  {
    id: "cg-001", name: "Margaret Thompson", age: 78, facility: FACILITIES[0],
    payer: "Medicare", riskScore: 2.4,
    gaps: [
      { type: "hba1c-overdue", lastCompleted: "2025-11-15", dueDate: "2026-02-15", daysOverdue: 14, qualityMeasure: GAP_MEASURES["hba1c-overdue"], revenueImpact: 45, outreachStatus: "contacted" },
      { type: "awv-not-scheduled", lastCompleted: "2025-02-20", dueDate: "2026-02-20", daysOverdue: 9, qualityMeasure: GAP_MEASURES["awv-not-scheduled"], revenueImpact: 175, outreachStatus: "scheduled" },
    ],
  },
  {
    id: "cg-002", name: "Robert Williams", age: 82, facility: FACILITIES[1],
    payer: "Empassion ACO REACH", riskScore: 3.1,
    gaps: [
      { type: "fall-risk-expired", lastCompleted: "2025-08-10", dueDate: "2026-02-10", daysOverdue: 19, qualityMeasure: GAP_MEASURES["fall-risk-expired"], revenueImpact: 42, outreachStatus: "not-started" },
      { type: "phq9-due", lastCompleted: "2025-06-05", dueDate: "2025-12-05", daysOverdue: 86, qualityMeasure: GAP_MEASURES["phq9-due"], revenueImpact: 48, outreachStatus: "not-started" },
      { type: "acp-not-documented", lastCompleted: null, dueDate: "2025-12-31", daysOverdue: 60, qualityMeasure: GAP_MEASURES["acp-not-documented"], revenueImpact: 86, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-003", name: "Dorothy Garcia", age: 71, facility: FACILITIES[2],
    payer: "Medicare", riskScore: 1.8,
    gaps: [
      { type: "hba1c-overdue", lastCompleted: "2025-10-01", dueDate: "2026-01-01", daysOverdue: 59, qualityMeasure: GAP_MEASURES["hba1c-overdue"], revenueImpact: 45, outreachStatus: "completed" },
      { type: "diabetic-eye-exam", lastCompleted: "2025-01-15", dueDate: "2026-01-15", daysOverdue: 45, qualityMeasure: GAP_MEASURES["diabetic-eye-exam"], revenueImpact: 65, outreachStatus: "contacted" },
    ],
  },
  {
    id: "cg-004", name: "James Mitchell", age: 76, facility: FACILITIES[0],
    payer: "Empassion ACO REACH", riskScore: 1.5,
    gaps: [
      { type: "bp-missing", lastCompleted: "2026-01-28", dueDate: "2026-02-28", daysOverdue: 1, qualityMeasure: GAP_MEASURES["bp-missing"], revenueImpact: 30, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-005", name: "Helen Anderson", age: 84, facility: FACILITIES[3],
    payer: "Medicare", riskScore: 3.8,
    gaps: [
      { type: "fall-risk-expired", lastCompleted: "2025-07-01", dueDate: "2026-01-01", daysOverdue: 59, qualityMeasure: GAP_MEASURES["fall-risk-expired"], revenueImpact: 42, outreachStatus: "scheduled" },
      { type: "acp-not-documented", lastCompleted: null, dueDate: "2025-12-31", daysOverdue: 60, qualityMeasure: GAP_MEASURES["acp-not-documented"], revenueImpact: 86, outreachStatus: "contacted" },
      { type: "phq9-due", lastCompleted: "2025-05-20", dueDate: "2025-11-20", daysOverdue: 101, qualityMeasure: GAP_MEASURES["phq9-due"], revenueImpact: 48, outreachStatus: "not-started" },
      { type: "med-adherence-overdue", lastCompleted: "2025-09-15", dueDate: "2026-01-15", daysOverdue: 45, qualityMeasure: GAP_MEASURES["med-adherence-overdue"], revenueImpact: 35, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-006", name: "William Brown", age: 79, facility: FACILITIES[1],
    payer: "Empassion ACO REACH", riskScore: 2.9,
    gaps: [
      { type: "awv-not-scheduled", lastCompleted: "2025-01-10", dueDate: "2026-01-10", daysOverdue: 50, qualityMeasure: GAP_MEASURES["awv-not-scheduled"], revenueImpact: 175, outreachStatus: "contacted" },
      { type: "colorectal-screening", lastCompleted: "2024-02-15", dueDate: "2025-02-15", daysOverdue: 379, qualityMeasure: GAP_MEASURES["colorectal-screening"], revenueImpact: 55, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-007", name: "Patricia Davis", age: 68, facility: FACILITIES[2],
    payer: "Medicare", riskScore: 2.1,
    gaps: [
      { type: "diabetic-eye-exam", lastCompleted: "2024-12-01", dueDate: "2025-12-01", daysOverdue: 90, qualityMeasure: GAP_MEASURES["diabetic-eye-exam"], revenueImpact: 65, outreachStatus: "scheduled" },
    ],
  },
  {
    id: "cg-008", name: "Richard Wilson", age: 85, facility: FACILITIES[3],
    payer: "Empassion ACO REACH", riskScore: 4.2,
    gaps: [
      { type: "fall-risk-expired", lastCompleted: "2025-06-01", dueDate: "2025-12-01", daysOverdue: 90, qualityMeasure: GAP_MEASURES["fall-risk-expired"], revenueImpact: 42, outreachStatus: "contacted" },
      { type: "phq9-due", lastCompleted: "2025-04-10", dueDate: "2025-10-10", daysOverdue: 142, qualityMeasure: GAP_MEASURES["phq9-due"], revenueImpact: 48, outreachStatus: "not-started" },
      { type: "acp-not-documented", lastCompleted: null, dueDate: "2025-06-30", daysOverdue: 244, qualityMeasure: GAP_MEASURES["acp-not-documented"], revenueImpact: 86, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-009", name: "Barbara Martinez", age: 73, facility: FACILITIES[0],
    payer: "Medicare", riskScore: 2.6,
    gaps: [
      { type: "med-adherence-overdue", lastCompleted: "2025-10-20", dueDate: "2026-02-20", daysOverdue: 9, qualityMeasure: GAP_MEASURES["med-adherence-overdue"], revenueImpact: 35, outreachStatus: "completed" },
    ],
  },
  {
    id: "cg-010", name: "Charles Taylor", age: 77, facility: FACILITIES[1],
    payer: "Empassion ACO REACH", riskScore: 2.3,
    gaps: [
      { type: "hba1c-overdue", lastCompleted: "2025-09-01", dueDate: "2025-12-01", daysOverdue: 90, qualityMeasure: GAP_MEASURES["hba1c-overdue"], revenueImpact: 45, outreachStatus: "contacted" },
      { type: "bp-missing", lastCompleted: "2026-01-15", dueDate: "2026-02-15", daysOverdue: 14, qualityMeasure: GAP_MEASURES["bp-missing"], revenueImpact: 30, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-011", name: "Susan Clark", age: 80, facility: FACILITIES[2],
    payer: "Medicare", riskScore: 1.9,
    gaps: [],
  },
  {
    id: "cg-012", name: "Thomas Rodriguez", age: 74, facility: FACILITIES[3],
    payer: "Empassion ACO REACH", riskScore: 2.7,
    gaps: [
      { type: "awv-not-scheduled", lastCompleted: "2024-11-15", dueDate: "2025-11-15", daysOverdue: 106, qualityMeasure: GAP_MEASURES["awv-not-scheduled"], revenueImpact: 175, outreachStatus: "scheduled" },
      { type: "colorectal-screening", lastCompleted: "2023-06-01", dueDate: "2024-06-01", daysOverdue: 638, qualityMeasure: GAP_MEASURES["colorectal-screening"], revenueImpact: 55, outreachStatus: "not-started" },
      { type: "phq9-due", lastCompleted: "2025-07-15", dueDate: "2026-01-15", daysOverdue: 45, qualityMeasure: GAP_MEASURES["phq9-due"], revenueImpact: 48, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-013", name: "Karen Lewis", age: 69, facility: FACILITIES[0],
    payer: "Medicare", riskScore: 1.4,
    gaps: [
      { type: "bp-missing", lastCompleted: "2026-01-20", dueDate: "2026-02-20", daysOverdue: 9, qualityMeasure: GAP_MEASURES["bp-missing"], revenueImpact: 30, outreachStatus: "completed" },
    ],
  },
  {
    id: "cg-014", name: "Daniel Walker", age: 81, facility: FACILITIES[1],
    payer: "Empassion ACO REACH", riskScore: 3.5,
    gaps: [
      { type: "fall-risk-expired", lastCompleted: "2025-05-15", dueDate: "2025-11-15", daysOverdue: 106, qualityMeasure: GAP_MEASURES["fall-risk-expired"], revenueImpact: 42, outreachStatus: "contacted" },
      { type: "med-adherence-overdue", lastCompleted: "2025-08-01", dueDate: "2026-01-01", daysOverdue: 59, qualityMeasure: GAP_MEASURES["med-adherence-overdue"], revenueImpact: 35, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-015", name: "Nancy Hall", age: 75, facility: FACILITIES[2],
    payer: "Medicare", riskScore: 2.0,
    gaps: [],
  },
  {
    id: "cg-016", name: "Paul Young", age: 83, facility: FACILITIES[3],
    payer: "Empassion ACO REACH", riskScore: 3.3,
    gaps: [
      { type: "acp-not-documented", lastCompleted: null, dueDate: "2025-09-30", daysOverdue: 152, qualityMeasure: GAP_MEASURES["acp-not-documented"], revenueImpact: 86, outreachStatus: "contacted" },
      { type: "awv-not-scheduled", lastCompleted: "2025-03-01", dueDate: "2026-03-01", daysOverdue: 0, qualityMeasure: GAP_MEASURES["awv-not-scheduled"], revenueImpact: 175, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-017", name: "Linda King", age: 72, facility: FACILITIES[0],
    payer: "Medicare", riskScore: 1.7,
    gaps: [
      { type: "colorectal-screening", lastCompleted: "2024-08-01", dueDate: "2025-08-01", daysOverdue: 212, qualityMeasure: GAP_MEASURES["colorectal-screening"], revenueImpact: 55, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-018", name: "Mark Wright", age: 86, facility: FACILITIES[1],
    payer: "Empassion ACO REACH", riskScore: 4.0,
    gaps: [
      { type: "fall-risk-expired", lastCompleted: "2025-04-01", dueDate: "2025-10-01", daysOverdue: 151, qualityMeasure: GAP_MEASURES["fall-risk-expired"], revenueImpact: 42, outreachStatus: "scheduled" },
      { type: "phq9-due", lastCompleted: "2025-03-01", dueDate: "2025-09-01", daysOverdue: 182, qualityMeasure: GAP_MEASURES["phq9-due"], revenueImpact: 48, outreachStatus: "contacted" },
      { type: "acp-not-documented", lastCompleted: null, dueDate: "2025-06-30", daysOverdue: 244, qualityMeasure: GAP_MEASURES["acp-not-documented"], revenueImpact: 86, outreachStatus: "not-started" },
    ],
  },
  {
    id: "cg-019", name: "Betty Scott", age: 70, facility: FACILITIES[2],
    payer: "Medicare", riskScore: 1.6,
    gaps: [],
  },
  {
    id: "cg-020", name: "George Adams", age: 79, facility: FACILITIES[3],
    payer: "Empassion ACO REACH", riskScore: 2.8,
    gaps: [
      { type: "hba1c-overdue", lastCompleted: "2025-08-15", dueDate: "2025-11-15", daysOverdue: 106, qualityMeasure: GAP_MEASURES["hba1c-overdue"], revenueImpact: 45, outreachStatus: "scheduled" },
      { type: "diabetic-eye-exam", lastCompleted: "2024-10-01", dueDate: "2025-10-01", daysOverdue: 151, qualityMeasure: GAP_MEASURES["diabetic-eye-exam"], revenueImpact: 65, outreachStatus: "not-started" },
    ],
  },
];

const OUTREACH_LOG: OutreachEntry[] = [
  { patientId: "cg-001", patientName: "Margaret Thompson", gapType: "hba1c-overdue", channel: "phone", contactDate: "2026-02-25", result: "reached", followUpDate: "2026-03-05", assignedTo: "RN Sarah Chen" },
  { patientId: "cg-001", patientName: "Margaret Thompson", gapType: "awv-not-scheduled", channel: "phone", contactDate: "2026-02-25", result: "scheduled", followUpDate: null, assignedTo: "RN Sarah Chen" },
  { patientId: "cg-003", patientName: "Dorothy Garcia", gapType: "hba1c-overdue", channel: "SMS", contactDate: "2026-02-20", result: "scheduled", followUpDate: null, assignedTo: "RN James Wu" },
  { patientId: "cg-003", patientName: "Dorothy Garcia", gapType: "diabetic-eye-exam", channel: "ChatEasy", contactDate: "2026-02-28", result: "reached", followUpDate: "2026-03-10", assignedTo: "RN James Wu" },
  { patientId: "cg-005", patientName: "Helen Anderson", gapType: "fall-risk-expired", channel: "phone", contactDate: "2026-02-22", result: "scheduled", followUpDate: null, assignedTo: "RN Maria Lopez" },
  { patientId: "cg-005", patientName: "Helen Anderson", gapType: "acp-not-documented", channel: "phone", contactDate: "2026-02-22", result: "voicemail", followUpDate: "2026-03-01", assignedTo: "RN Maria Lopez" },
  { patientId: "cg-006", patientName: "William Brown", gapType: "awv-not-scheduled", channel: "ChatEasy", contactDate: "2026-02-26", result: "reached", followUpDate: "2026-03-08", assignedTo: "RN Sarah Chen" },
  { patientId: "cg-007", patientName: "Patricia Davis", gapType: "diabetic-eye-exam", channel: "SMS", contactDate: "2026-02-24", result: "scheduled", followUpDate: null, assignedTo: "RN James Wu" },
  { patientId: "cg-008", patientName: "Richard Wilson", gapType: "fall-risk-expired", channel: "phone", contactDate: "2026-02-27", result: "reached", followUpDate: "2026-03-05", assignedTo: "RN Maria Lopez" },
  { patientId: "cg-009", patientName: "Barbara Martinez", gapType: "med-adherence-overdue", channel: "phone", contactDate: "2026-02-18", result: "scheduled", followUpDate: null, assignedTo: "RN Sarah Chen" },
  { patientId: "cg-010", patientName: "Charles Taylor", gapType: "hba1c-overdue", channel: "ChatEasy", contactDate: "2026-02-28", result: "reached", followUpDate: "2026-03-07", assignedTo: "RN James Wu" },
  { patientId: "cg-012", patientName: "Thomas Rodriguez", gapType: "awv-not-scheduled", channel: "phone", contactDate: "2026-02-23", result: "scheduled", followUpDate: null, assignedTo: "RN Maria Lopez" },
  { patientId: "cg-013", patientName: "Karen Lewis", gapType: "bp-missing", channel: "SMS", contactDate: "2026-02-19", result: "scheduled", followUpDate: null, assignedTo: "RN Sarah Chen" },
  { patientId: "cg-014", patientName: "Daniel Walker", gapType: "fall-risk-expired", channel: "phone", contactDate: "2026-02-26", result: "voicemail", followUpDate: "2026-03-02", assignedTo: "RN Maria Lopez" },
  { patientId: "cg-016", patientName: "Paul Young", gapType: "acp-not-documented", channel: "ChatEasy", contactDate: "2026-02-27", result: "reached", followUpDate: "2026-03-06", assignedTo: "RN James Wu" },
  { patientId: "cg-018", patientName: "Mark Wright", gapType: "fall-risk-expired", channel: "phone", contactDate: "2026-02-21", result: "scheduled", followUpDate: null, assignedTo: "RN Maria Lopez" },
  { patientId: "cg-018", patientName: "Mark Wright", gapType: "phq9-due", channel: "phone", contactDate: "2026-02-21", result: "voicemail", followUpDate: "2026-03-01", assignedTo: "RN Maria Lopez" },
  { patientId: "cg-020", patientName: "George Adams", gapType: "hba1c-overdue", channel: "SMS", contactDate: "2026-02-25", result: "scheduled", followUpDate: null, assignedTo: "RN James Wu" },
  { patientId: "cg-002", patientName: "Robert Williams", gapType: "fall-risk-expired", channel: "phone", contactDate: "2026-02-28", result: "no-answer", followUpDate: "2026-03-02", assignedTo: "RN Sarah Chen" },
];

/* =============================================
   HELPERS
   ============================================= */

function riskBadge(score: number) {
  if (score >= 3.5) return { bg: "bg-red-50", text: "text-red-700" };
  if (score >= 2.5) return { bg: "bg-amber-50", text: "text-amber-700" };
  return { bg: "bg-emerald-50", text: "text-emerald-700" };
}

function gapCountBadge(count: number) {
  if (count >= 3) return { bg: "bg-red-50", text: "text-red-700" };
  if (count >= 1) return { bg: "bg-amber-50", text: "text-amber-700" };
  return { bg: "bg-emerald-50", text: "text-emerald-700" };
}

const resultBadge: Record<OutreachResult, { bg: string; text: string; label: string }> = {
  reached: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Reached" },
  voicemail: { bg: "bg-amber-50", text: "text-amber-700", label: "Voicemail" },
  "no-answer": { bg: "bg-red-50", text: "text-red-700", label: "No Answer" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", label: "Scheduled" },
};

const outreachStatusBadge: Record<GapOutreachStatus, { bg: string; text: string }> = {
  "not-started": { bg: "bg-[var(--medos-gray-100)]", text: "text-[var(--medos-gray-500)]" },
  contacted: { bg: "bg-amber-50", text: "text-amber-700" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

/* =============================================
   TABS
   ============================================= */

const TABS: { key: TabKey; label: string; icon: typeof Search }[] = [
  { key: "population", label: "Population Grid", icon: Users },
  { key: "gaps", label: "Gap Types", icon: Target },
  { key: "outreach", label: "Outreach Status", icon: Phone },
];

/* =============================================
   POPULATION GRID TAB
   ============================================= */

function PopulationGridTab() {
  const [filterFacility, setFilterFacility] = useState<string>("all");
  const [filterPayer, setFilterPayer] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "gaps" | "risk">("gaps");

  const totalGaps = PATIENTS.reduce((s, p) => s + p.gaps.length, 0);
  const zeroGaps = PATIENTS.filter((p) => p.gaps.length === 0).length;
  const completedThisMonth = PATIENTS.reduce(
    (s, p) => s + p.gaps.filter((g) => g.outreachStatus === "completed").length, 0
  );

  let filtered = PATIENTS.filter((p) => {
    if (filterFacility !== "all" && p.facility !== filterFacility) return false;
    if (filterPayer !== "all" && p.payer !== filterPayer) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "gaps") return b.gaps.length - a.gaps.length;
    if (sortBy === "risk") return b.riskScore - a.riskScore;
    return a.name.localeCompare(b.name);
  });

  const kpis = [
    { label: "Total Patients", value: PATIENTS.length, icon: Users, color: "text-[var(--medos-primary)]" },
    { label: "Total Open Gaps", value: totalGaps, icon: AlertTriangle, color: "text-amber-600" },
    { label: "0 Gaps", value: `${Math.round((zeroGaps / PATIENTS.length) * 100)}%`, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Closed This Month", value: completedThisMonth, icon: TrendingUp, color: "text-blue-600" },
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

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-[var(--medos-gray-400)]" />
        <select value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)}
          className="text-xs border border-[var(--medos-gray-200)] rounded-md px-2 py-1.5 text-[var(--medos-gray-700)]">
          <option value="all">All Facilities</option>
          {FACILITIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterPayer} onChange={(e) => setFilterPayer(e.target.value)}
          className="text-xs border border-[var(--medos-gray-200)] rounded-md px-2 py-1.5 text-[var(--medos-gray-700)]">
          <option value="all">All Payers</option>
          <option value="Medicare">Medicare</option>
          <option value="Empassion ACO REACH">Empassion ACO REACH</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "name" | "gaps" | "risk")}
          className="text-xs border border-[var(--medos-gray-200)] rounded-md px-2 py-1.5 text-[var(--medos-gray-700)]">
          <option value="gaps">Sort: Most Gaps</option>
          <option value="risk">Sort: Highest Risk</option>
          <option value="name">Sort: Name A-Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Patient", "Age", "Facility", "Payer", "Risk Score", "Open Gaps", "Gap Types"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((p) => {
                const risk = riskBadge(p.riskScore);
                const gapBdg = gapCountBadge(p.gaps.length);
                return (
                  <tr key={p.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-navy)]">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{p.age}</td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{p.facility}</td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{p.payer}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", risk.bg, risk.text)}>
                        {p.riskScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", gapBdg.bg, gapBdg.text)}>
                        {p.gaps.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.gaps.length === 0 && (
                          <span className="text-[10px] text-emerald-600 font-medium">All clear</span>
                        )}
                        {p.gaps.map((g) => (
                          <span key={g.type} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]">
                            {GAP_LABELS[g.type]}
                          </span>
                        ))}
                      </div>
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

/* =============================================
   GAP TYPES TAB
   ============================================= */

function GapTypesTab() {
  const [sortMode, setSortMode] = useState<"count" | "revenue">("revenue");

  // Aggregate by gap type
  const gapTypes = Object.keys(GAP_LABELS) as GapType[];
  const aggregated = gapTypes.map((type) => {
    const affected = PATIENTS.filter((p) => p.gaps.some((g) => g.type === type));
    const allGaps = PATIENTS.flatMap((p) => p.gaps.filter((g) => g.type === type));
    const avgOverdue = allGaps.length > 0 ? Math.round(allGaps.reduce((s, g) => s + g.daysOverdue, 0) / allGaps.length) : 0;
    return {
      type,
      label: GAP_LABELS[type],
      count: affected.length,
      measure: GAP_MEASURES[type],
      revenuePerGap: GAP_REVENUE[type],
      totalRevenue: affected.length * GAP_REVENUE[type],
      avgDaysOverdue: avgOverdue,
      // simulate trend (random-ish but deterministic)
      trendUp: type.length % 2 === 0,
    };
  }).filter((g) => g.count > 0);

  const sorted = [...aggregated].sort((a, b) => {
    if (sortMode === "count") return b.count - a.count;
    return b.totalRevenue - a.totalRevenue;
  });

  const maxCount = Math.max(...sorted.map((g) => g.count));

  // Priority gaps (top 5 by count * revenue)
  const priority = [...aggregated]
    .sort((a, b) => (b.count * b.revenuePerGap) - (a.count * a.revenuePerGap))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Sort control */}
      <div className="flex items-center gap-3">
        <ArrowUpDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as "count" | "revenue")}
          className="text-xs border border-[var(--medos-gray-200)] rounded-md px-2 py-1.5 text-[var(--medos-gray-700)]">
          <option value="revenue">Sort: Revenue Impact</option>
          <option value="count">Sort: Patient Count</option>
        </select>
      </div>

      {/* Gap type cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map((g) => {
          const GapIcon = GAP_ICONS[g.type];
          return (
            <div key={g.type} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GapIcon className="w-4 h-4 text-[var(--medos-primary)]" />
                  <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{g.label}</h3>
                </div>
                <div className={cn("flex items-center gap-1 text-[10px] font-medium", g.trendUp ? "text-red-600" : "text-emerald-600")}>
                  {g.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {g.trendUp ? "Up" : "Down"} vs last month
                </div>
              </div>

              {/* Patient count bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--medos-gray-500)]">{g.count} patients affected</span>
                  <span className="text-xs font-semibold text-[var(--medos-navy)]">{g.count}/{PATIENTS.length}</span>
                </div>
                <div className="w-full h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--medos-primary)] transition-all"
                    style={{ width: `${(g.count / maxCount) * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase">Measure</p>
                  <p className="text-[10px] font-medium text-[var(--medos-navy)] mt-0.5">{g.measure}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase">Avg Overdue</p>
                  <p className="text-xs font-semibold text-amber-700 mt-0.5">{g.avgDaysOverdue}d</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase">Rev Impact</p>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">${g.totalRevenue}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Gaps */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Target className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Priority Gaps (Patients x Revenue)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Rank", "Gap Type", "Patients", "Revenue/Gap", "Total Impact", "Priority Score"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {priority.map((g, i) => (
                <tr key={g.type} className="hover:bg-[var(--medos-gray-50)] transition-default">
                  <td className="px-4 py-3 text-xs font-bold text-[var(--medos-primary)]">#{i + 1}</td>
                  <td className="px-4 py-3 text-xs font-medium text-[var(--medos-navy)]">{g.label}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{g.count}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">${g.revenuePerGap}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-700">${g.totalRevenue}</td>
                  <td className="px-4 py-3 text-xs font-bold text-[var(--medos-navy)]">{g.count * g.revenuePerGap}</td>
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
   OUTREACH STATUS TAB
   ============================================= */

function OutreachStatusTab() {
  const reached = OUTREACH_LOG.filter((o) => o.result === "reached").length;
  const scheduled = OUTREACH_LOG.filter((o) => o.result === "scheduled").length;
  const reachRate = Math.round(((reached + scheduled) / OUTREACH_LOG.length) * 100);

  // Funnel
  const allGaps = PATIENTS.flatMap((p) => p.gaps);
  const funnel = {
    notStarted: allGaps.filter((g) => g.outreachStatus === "not-started").length,
    contacted: allGaps.filter((g) => g.outreachStatus === "contacted").length,
    scheduled: allGaps.filter((g) => g.outreachStatus === "scheduled").length,
    completed: allGaps.filter((g) => g.outreachStatus === "completed").length,
  };
  const funnelMax = Math.max(funnel.notStarted, funnel.contacted, funnel.scheduled, funnel.completed, 1);

  const summaryKpis = [
    { label: "Total Outreach", value: OUTREACH_LOG.length, icon: Phone, color: "text-[var(--medos-primary)]" },
    { label: "Reach Rate", value: `${reachRate}%`, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Appts Scheduled", value: scheduled, icon: Calendar, color: "text-blue-600" },
    { label: "Gaps Closed", value: funnel.completed, icon: Target, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryKpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={cn("w-4 h-4", k.color)} />
              <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Outreach Pipeline</h3>
        </div>
        <div className="space-y-3">
          {([
            { key: "notStarted", label: "Not Started", count: funnel.notStarted, color: "bg-[var(--medos-gray-400)]" },
            { key: "contacted", label: "Contacted", count: funnel.contacted, color: "bg-amber-500" },
            { key: "scheduled", label: "Scheduled", count: funnel.scheduled, color: "bg-blue-500" },
            { key: "completed", label: "Completed", count: funnel.completed, color: "bg-emerald-500" },
          ] as const).map((stage) => (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--medos-gray-700)]">{stage.label}</span>
                <span className="text-xs font-bold text-[var(--medos-navy)]">{stage.count}</span>
              </div>
              <div className="w-full h-5 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", stage.color)}
                  style={{ width: `${(stage.count / funnelMax) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outreach log table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Phone className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Outreach Activity Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Patient", "Gap Type", "Channel", "Contact Date", "Result", "Follow-Up", "Assigned To"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {OUTREACH_LOG.map((o, i) => {
                const ChannelIcon = CHANNEL_ICONS[o.channel];
                const badge = resultBadge[o.result];
                return (
                  <tr key={i} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-navy)]">{o.patientName}</td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{GAP_LABELS[o.gapType]}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ChannelIcon className="w-3.5 h-3.5 text-[var(--medos-gray-500)]" />
                        <span className="text-xs text-[var(--medos-gray-600)]">{o.channel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{o.contactDate}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", badge.bg, badge.text)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{o.followUpDate || "--"}</td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{o.assignedTo}</td>
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

/* =============================================
   MAIN PAGE
   ============================================= */

export default function CareGapScannerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("population");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Search className="w-6 h-6 text-[var(--medos-primary)]" />
          <h1 className="text-xl font-bold text-[var(--medos-navy)]">Care Gap Scanner</h1>
        </div>
        <p className="text-sm text-[var(--medos-gray-500)] ml-9">
          Population health gap detection — HEDIS &amp; ACO REACH quality measures
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
      {activeTab === "population" && <PopulationGridTab />}
      {activeTab === "gaps" && <GapTypesTab />}
      {activeTab === "outreach" && <OutreachStatusTab />}
    </div>
  );
}
