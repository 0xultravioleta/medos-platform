"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Database,
  GitBranch,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Timer,
  Users,
  Shield,
  FileText,
  Settings,
  Pill,
  Heart,
  Calendar,
} from "lucide-react";

// --- Types ---

type Urgency = "Immediate" | "Soon" | "Batch";
type EventStatus = "success" | "failed";

interface PatientContext {
  id: string;
  name: string;
  encounter: number;
  clinical_summary: number;
  medication: number;
  billing: number;
  care_plan: number;
  device_vitals: number | null;
}

interface SystemContext {
  name: string;
  icon: typeof Database;
  score: number;
  lastUpdated: string;
  ttlSeconds: number;
  remainingSeconds: number;
  urgency: Urgency;
}

interface DependencyRow {
  changeType: string;
  affectedContexts: { name: string; urgency: Urgency }[];
}

interface RehydrationEvent {
  id: string;
  timestamp: string;
  changeType: string;
  affectedContexts: string[];
  durationMs: number;
  status: EventStatus;
}

// --- Mock Data ---

const MOCK_PATIENTS: PatientContext[] = [
  {
    id: "p-001",
    name: "Maria Santos",
    encounter: 0.95,
    clinical_summary: 0.92,
    medication: 0.88,
    billing: 0.91,
    care_plan: 0.85,
    device_vitals: 0.97,
  },
  {
    id: "p-002",
    name: "James Wilson",
    encounter: 0.82,
    clinical_summary: 0.78,
    medication: 0.95,
    billing: 0.65,
    care_plan: 0.90,
    device_vitals: 0.88,
  },
  {
    id: "p-003",
    name: "Robert Chen",
    encounter: 0.71,
    clinical_summary: 0.68,
    medication: 0.45,
    billing: 0.92,
    care_plan: 0.55,
    device_vitals: null,
  },
  {
    id: "p-004",
    name: "Sarah Johnson",
    encounter: 0.98,
    clinical_summary: 0.96,
    medication: 0.91,
    billing: 0.94,
    care_plan: 0.89,
    device_vitals: null,
  },
  {
    id: "p-005",
    name: "David Kim",
    encounter: 0.62,
    clinical_summary: 0.58,
    medication: 0.72,
    billing: 0.81,
    care_plan: 0.48,
    device_vitals: 0.91,
  },
  {
    id: "p-006",
    name: "Lisa Park",
    encounter: 0.88,
    clinical_summary: 0.85,
    medication: 0.93,
    billing: 0.87,
    care_plan: 0.91,
    device_vitals: 0.94,
  },
];

const MOCK_SYSTEM_CONTEXTS: SystemContext[] = [
  { name: "Scheduling", icon: Calendar, score: 0.91, lastUpdated: "15 min ago", ttlSeconds: 900, remainingSeconds: 630, urgency: "Soon" },
  { name: "Payer Rules", icon: FileText, score: 0.78, lastUpdated: "45 min ago", ttlSeconds: 3600, remainingSeconds: 1500, urgency: "Batch" },
  { name: "Agent Config", icon: Settings, score: 0.96, lastUpdated: "5 min ago", ttlSeconds: 300, remainingSeconds: 210, urgency: "Immediate" },
  { name: "Clinical Protocols", icon: Heart, score: 0.83, lastUpdated: "25 min ago", ttlSeconds: 900, remainingSeconds: 340, urgency: "Soon" },
  { name: "Formulary", icon: Pill, score: 0.65, lastUpdated: "2h ago", ttlSeconds: 900, remainingSeconds: 0, urgency: "Soon" },
  { name: "Compliance", icon: Shield, score: 0.99, lastUpdated: "2 min ago", ttlSeconds: 300, remainingSeconds: 280, urgency: "Immediate" },
];

const MOCK_DEPENDENCIES: DependencyRow[] = [
  { changeType: "patient.lab.received", affectedContexts: [{ name: "Encounter", urgency: "Immediate" }, { name: "Clinical Summary", urgency: "Soon" }, { name: "Analytics", urgency: "Batch" }] },
  { changeType: "patient.vitals.recorded", affectedContexts: [{ name: "Encounter", urgency: "Immediate" }, { name: "Clinical Summary", urgency: "Soon" }, { name: "Device Vitals", urgency: "Soon" }] },
  { changeType: "patient.device.reading", affectedContexts: [{ name: "Device Vitals", urgency: "Soon" }, { name: "Clinical Summary", urgency: "Soon" }, { name: "Analytics", urgency: "Batch" }] },
  { changeType: "patient.medication.changed", affectedContexts: [{ name: "Encounter", urgency: "Immediate" }, { name: "Clinical Summary", urgency: "Soon" }, { name: "Medication", urgency: "Immediate" }, { name: "Care Plan", urgency: "Soon" }] },
  { changeType: "patient.demographic.updated", affectedContexts: [{ name: "Encounter", urgency: "Immediate" }, { name: "Clinical Summary", urgency: "Soon" }, { name: "Billing", urgency: "Soon" }] },
  { changeType: "patient.claim.status_changed", affectedContexts: [{ name: "Billing", urgency: "Soon" }] },
  { changeType: "patient.encounter.created", affectedContexts: [{ name: "Encounter", urgency: "Immediate" }, { name: "Clinical Summary", urgency: "Soon" }, { name: "Analytics", urgency: "Batch" }] },
  { changeType: "patient.appointment.changed", affectedContexts: [{ name: "Encounter", urgency: "Immediate" }, { name: "Care Plan", urgency: "Soon" }, { name: "Scheduling", urgency: "Soon" }] },
  { changeType: "patient.allergy.updated", affectedContexts: [{ name: "Encounter", urgency: "Immediate" }, { name: "Clinical Summary", urgency: "Soon" }, { name: "Medication", urgency: "Immediate" }] },
  { changeType: "patient.insurance.updated", affectedContexts: [{ name: "Billing", urgency: "Soon" }, { name: "Payer Rules", urgency: "Batch" }] },
  { changeType: "payer.rules_updated", affectedContexts: [{ name: "Billing", urgency: "Soon" }, { name: "Payer Rules", urgency: "Batch" }] },
  { changeType: "provider.schedule_changed", affectedContexts: [{ name: "Scheduling", urgency: "Soon" }] },
  { changeType: "agent.config_updated", affectedContexts: [{ name: "Agent Config", urgency: "Immediate" }] },
  { changeType: "protocol.clinical_updated", affectedContexts: [{ name: "Clinical Protocols", urgency: "Soon" }, { name: "Encounter", urgency: "Immediate" }, { name: "Care Plan", urgency: "Soon" }] },
  { changeType: "formulary.updated", affectedContexts: [{ name: "Formulary", urgency: "Soon" }, { name: "Medication", urgency: "Immediate" }] },
  { changeType: "compliance.policy_changed", affectedContexts: [{ name: "Compliance", urgency: "Immediate" }] },
  { changeType: "system.mcp_tools_changed", affectedContexts: [{ name: "Agent Config", urgency: "Immediate" }] },
];

const MOCK_REHYDRATION_LOG: RehydrationEvent[] = [
  { id: "evt-001", timestamp: "2026-02-28 14:52:03", changeType: "patient.vitals.recorded", affectedContexts: ["Encounter", "Clinical Summary", "Device Vitals"], durationMs: 42, status: "success" },
  { id: "evt-002", timestamp: "2026-02-28 14:48:17", changeType: "patient.lab.received", affectedContexts: ["Encounter", "Clinical Summary", "Analytics"], durationMs: 67, status: "success" },
  { id: "evt-003", timestamp: "2026-02-28 14:45:30", changeType: "patient.device.reading", affectedContexts: ["Device Vitals", "Clinical Summary", "Analytics"], durationMs: 38, status: "success" },
  { id: "evt-004", timestamp: "2026-02-28 14:42:11", changeType: "payer.rules_updated", affectedContexts: ["Billing", "Payer Rules"], durationMs: 155, status: "success" },
  { id: "evt-005", timestamp: "2026-02-28 14:38:55", changeType: "patient.medication.changed", affectedContexts: ["Encounter", "Clinical Summary", "Medication", "Care Plan"], durationMs: 89, status: "success" },
  { id: "evt-006", timestamp: "2026-02-28 14:35:22", changeType: "agent.config_updated", affectedContexts: ["Agent Config"], durationMs: 12, status: "success" },
  { id: "evt-007", timestamp: "2026-02-28 14:31:08", changeType: "patient.encounter.created", affectedContexts: ["Encounter", "Clinical Summary", "Analytics"], durationMs: 73, status: "success" },
  { id: "evt-008", timestamp: "2026-02-28 14:28:44", changeType: "patient.allergy.updated", affectedContexts: ["Encounter", "Clinical Summary", "Medication"], durationMs: 201, status: "failed" },
  { id: "evt-009", timestamp: "2026-02-28 14:25:19", changeType: "provider.schedule_changed", affectedContexts: ["Scheduling"], durationMs: 28, status: "success" },
  { id: "evt-010", timestamp: "2026-02-28 14:20:03", changeType: "patient.claim.status_changed", affectedContexts: ["Billing"], durationMs: 34, status: "success" },
  { id: "evt-011", timestamp: "2026-02-28 14:15:47", changeType: "compliance.policy_changed", affectedContexts: ["Compliance"], durationMs: 18, status: "success" },
  { id: "evt-012", timestamp: "2026-02-28 14:10:33", changeType: "patient.demographic.updated", affectedContexts: ["Encounter", "Clinical Summary", "Billing"], durationMs: 56, status: "success" },
  { id: "evt-013", timestamp: "2026-02-28 14:05:12", changeType: "formulary.updated", affectedContexts: ["Formulary", "Medication"], durationMs: 312, status: "failed" },
  { id: "evt-014", timestamp: "2026-02-28 13:58:41", changeType: "patient.insurance.updated", affectedContexts: ["Billing", "Payer Rules"], durationMs: 47, status: "success" },
  { id: "evt-015", timestamp: "2026-02-28 13:52:09", changeType: "patient.vitals.recorded", affectedContexts: ["Encounter", "Clinical Summary", "Device Vitals"], durationMs: 39, status: "success" },
  { id: "evt-016", timestamp: "2026-02-28 13:45:28", changeType: "system.mcp_tools_changed", affectedContexts: ["Agent Config"], durationMs: 22, status: "success" },
  { id: "evt-017", timestamp: "2026-02-28 13:38:55", changeType: "patient.appointment.changed", affectedContexts: ["Encounter", "Care Plan", "Scheduling"], durationMs: 64, status: "success" },
  { id: "evt-018", timestamp: "2026-02-28 13:30:14", changeType: "protocol.clinical_updated", affectedContexts: ["Clinical Protocols", "Encounter", "Care Plan"], durationMs: 178, status: "success" },
];

// --- Helpers ---

const TABS = [
  { key: "patients", label: "Patient Contexts", icon: Users },
  { key: "system", label: "System Contexts", icon: Database },
  { key: "dependencies", label: "Dependency Graph", icon: GitBranch },
  { key: "log", label: "Rehydration Log", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function scoreColor(score: number): string {
  if (score >= 0.90) return "bg-emerald-50 text-emerald-700";
  if (score >= 0.75) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function scoreBorderColor(score: number): string {
  if (score >= 0.90) return "border-emerald-200";
  if (score >= 0.75) return "border-amber-200";
  return "border-red-200";
}

function urgencyBadge(urgency: Urgency): string {
  switch (urgency) {
    case "Immediate":
      return "bg-red-50 text-red-700 border border-red-200";
    case "Soon":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "Batch":
      return "bg-blue-50 text-blue-700 border border-blue-200";
  }
}

function formatScore(score: number | null): string {
  if (score === null) return "--";
  return score.toFixed(2);
}

// --- Components ---

function PatientContextsTab() {
  const contextColumns = [
    "Encounter",
    "Clinical Summary",
    "Medication",
    "Billing",
    "Care Plan",
    "Device Vitals",
  ] as const;

  type ContextField = "encounter" | "clinical_summary" | "medication" | "billing" | "care_plan" | "device_vitals";

  const fieldMap: Record<string, ContextField> = {
    "Encounter": "encounter",
    "Clinical Summary": "clinical_summary",
    "Medication": "medication",
    "Billing": "billing",
    "Care Plan": "care_plan",
    "Device Vitals": "device_vitals",
  };

  const staleCount = MOCK_PATIENTS.reduce((count, p) => {
    const fields: ContextField[] = ["encounter", "clinical_summary", "medication", "billing", "care_plan", "device_vitals"];
    return count + fields.filter((f) => p[f] !== null && (p[f] as number) < 0.75).length;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--medos-gray-500)]">
            {MOCK_PATIENTS.length} patients tracked
          </p>
          {staleCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              <AlertTriangle className="w-3 h-3" />
              {staleCount} stale contexts
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  Patient
                </th>
                {contextColumns.map((col) => (
                  <th
                    key={col}
                    className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3"
                  >
                    {col}
                  </th>
                ))}
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {MOCK_PATIENTS.map((patient) => (
                <tr key={patient.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[var(--medos-gray-900)]">{patient.name}</p>
                    <p className="text-xs text-[var(--medos-gray-500)]">{patient.id}</p>
                  </td>
                  {contextColumns.map((col) => {
                    const field = fieldMap[col];
                    const value = patient[field];
                    const isStale = value !== null && (value as number) < 0.75;
                    return (
                      <td key={col} className="px-4 py-4 text-center">
                        {value === null ? (
                          <span className="text-xs text-[var(--medos-gray-400)]">--</span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${scoreColor(
                                value as number
                              )} ${scoreBorderColor(value as number)}`}
                            >
                              {formatScore(value)}
                            </span>
                            {isStale && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                STALE
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh
                    </button>
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

function SystemContextsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {MOCK_SYSTEM_CONTEXTS.length} system contexts monitored
        </p>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {MOCK_SYSTEM_CONTEXTS.filter((c) => c.score >= 0.75).length} Fresh
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            <AlertTriangle className="w-3 h-3" />
            {MOCK_SYSTEM_CONTEXTS.filter((c) => c.score < 0.75).length} Stale
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_SYSTEM_CONTEXTS.map((ctx) => {
          const CtxIcon = ctx.icon;
          const isStale = ctx.score < 0.75;
          const ttlPercent = ctx.ttlSeconds > 0 ? (ctx.remainingSeconds / ctx.ttlSeconds) * 100 : 0;
          const ttlBarColor = ttlPercent > 50 ? "bg-emerald-500" : ttlPercent > 20 ? "bg-amber-500" : "bg-red-500";

          return (
            <div
              key={ctx.name}
              className={`group bg-white rounded-xl border shadow-medos-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                isStale
                  ? "border-red-200 bg-red-50/30"
                  : "border-[var(--medos-gray-200)] hover:border-[var(--medos-primary)]"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                      isStale
                        ? "bg-red-100 text-red-600"
                        : "bg-[var(--medos-primary-light)] text-[var(--medos-primary)] group-hover:bg-[var(--medos-primary)] group-hover:text-white"
                    }`}
                  >
                    <CtxIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{ctx.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${urgencyBadge(ctx.urgency)}`}>
                      {ctx.urgency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-baseline gap-2 mb-4">
                <span
                  className={`text-3xl font-bold tabular-nums ${
                    ctx.score >= 0.90
                      ? "text-emerald-700"
                      : ctx.score >= 0.75
                      ? "text-amber-700"
                      : "text-red-700"
                  }`}
                >
                  {ctx.score.toFixed(2)}
                </span>
                <span className="text-xs text-[var(--medos-gray-500)]">freshness score</span>
                {isStale && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    STALE
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                    <span className="text-xs text-[var(--medos-gray-600)]">Last updated</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--medos-gray-700)]">{ctx.lastUpdated}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                      <span className="text-xs text-[var(--medos-gray-600)]">TTL</span>
                    </div>
                    <span className="text-xs font-mono text-[var(--medos-gray-700)]">
                      {ctx.remainingSeconds}s / {ctx.ttlSeconds}s
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${ttlBarColor}`}
                      style={{ width: `${Math.max(ttlPercent, 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Refresh */}
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DependencyGraphTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {MOCK_DEPENDENCIES.length} change types mapped to context refresh rules
        </p>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            <Zap className="w-3 h-3" />
            Immediate
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
            <Timer className="w-3 h-3" />
            Soon
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
            <Clock className="w-3 h-3" />
            Batch
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                When This Changes...
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                These Contexts Refresh...
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {MOCK_DEPENDENCIES.map((dep) => (
              <tr key={dep.changeType} className="hover:bg-[var(--medos-gray-50)] transition-all">
                <td className="px-6 py-3">
                  <span className="text-sm font-mono font-medium text-[var(--medos-primary)]">
                    {dep.changeType}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {dep.affectedContexts.map((ctx, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${urgencyBadge(ctx.urgency)}`}
                      >
                        {ctx.urgency === "Immediate" && <Zap className="w-2.5 h-2.5" />}
                        {ctx.urgency === "Soon" && <Timer className="w-2.5 h-2.5" />}
                        {ctx.urgency === "Batch" && <Clock className="w-2.5 h-2.5" />}
                        {ctx.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RehydrationLogTab() {
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");

  const changeTypes = Array.from(new Set(MOCK_REHYDRATION_LOG.map((e) => e.changeType))).sort();

  const filtered = MOCK_REHYDRATION_LOG.filter((evt) => {
    if (changeTypeFilter !== "all" && evt.changeType !== changeTypeFilter) return false;
    if (statusFilter !== "all" && evt.status !== statusFilter) return false;
    return true;
  });

  const successCount = MOCK_REHYDRATION_LOG.filter((e) => e.status === "success").length;
  const failedCount = MOCK_REHYDRATION_LOG.filter((e) => e.status === "failed").length;
  const avgDuration = Math.round(
    MOCK_REHYDRATION_LOG.reduce((sum, e) => sum + e.durationMs, 0) / MOCK_REHYDRATION_LOG.length
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Success</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">{successCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Failed</span>
          </div>
          <p className="text-2xl font-bold text-red-700 tabular-nums">{failedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
            <span className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)] tabular-nums">{avgDuration}ms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--medos-gray-500)]">Change Type:</label>
          <select
            value={changeTypeFilter}
            onChange={(e) => setChangeTypeFilter(e.target.value)}
            className="h-8 px-3 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
          >
            <option value="all">All Types</option>
            {changeTypes.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--medos-gray-500)]">Status:</label>
          <div className="flex items-center gap-1">
            {(["all", "success", "failed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s
                    ? "bg-[var(--medos-primary)] text-white"
                    : "border border-[var(--medos-gray-300)] text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)]"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-[var(--medos-gray-500)] ml-auto">
          {filtered.length} of {MOCK_REHYDRATION_LOG.length} events
        </p>
      </div>

      {/* Event List */}
      <div className="space-y-2">
        {filtered.map((evt) => (
          <div
            key={evt.id}
            className={`bg-white rounded-xl border shadow-medos-sm p-4 hover:shadow-md transition-all ${
              evt.status === "failed" ? "border-red-200 bg-red-50/20" : "border-[var(--medos-gray-200)]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg mt-0.5 ${
                    evt.status === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {evt.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-mono font-medium text-[var(--medos-primary)]">
                    {evt.changeType}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-[var(--medos-gray-400)]" />
                    <span className="text-xs text-[var(--medos-gray-500)]">{evt.timestamp}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {evt.affectedContexts.map((ctx) => (
                      <span
                        key={ctx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--medos-primary-light)] text-[var(--medos-primary)] border border-[var(--medos-primary)]/20"
                      >
                        {ctx}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-[var(--medos-gray-900)] tabular-nums">
                    {evt.durationMs}ms
                  </p>
                  <p className="text-[10px] text-[var(--medos-gray-500)]">duration</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    evt.status === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {evt.status === "success" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {evt.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---

export default function ContextFreshnessPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("patients");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--medos-gray-200)] text-[var(--medos-gray-500)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-700)] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <Activity className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Context Freshness Monitor</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              Track and refresh patient and system context freshness scores
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <RefreshCw className="w-4 h-4" />
          Force Refresh All
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--medos-gray-200)]">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? "border-[var(--medos-primary)] text-[var(--medos-primary)]"
                    : "border-transparent text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)] hover:border-[var(--medos-gray-300)]"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "patients" && <PatientContextsTab />}
      {activeTab === "system" && <SystemContextsTab />}
      {activeTab === "dependencies" && <DependencyGraphTab />}
      {activeTab === "log" && <RehydrationLogTab />}
    </div>
  );
}
