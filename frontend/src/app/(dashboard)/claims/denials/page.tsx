"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RotateCcw,
  TrendingUp,
  ChevronDown,
  Sparkles,
  Scale,
  Target,
} from "lucide-react";

/* ---------- types ---------- */

interface DenialCase {
  id: string;
  claim_id: string;
  patient: string;
  billed_amount: number;
  denial_code: string;
  denial_reason: string;
  root_cause: string;
  payer: string;
  denial_date: string;
  appeal_status: "analyzing" | "appeal_drafted" | "appeal_submitted" | "won" | "lost" | "no_appeal";
  appeal_probability: number;
  historical_rate: number;
  appeal_letter_preview: string | null;
  corrective_actions: string[];
}

/* ---------- mock data ---------- */

const MOCK_DENIALS: DenialCase[] = [
  {
    id: "DEN-2026-0047",
    claim_id: "CLM-2026-0844",
    patient: "William Torres",
    billed_amount: 375.0,
    denial_code: "CO-16",
    denial_reason: "Claim/service lacks information or has submission/billing error(s)",
    root_cause: "Missing Information",
    payer: "Humana Gold Plus",
    denial_date: "Feb 24, 2026",
    appeal_status: "appeal_drafted",
    appeal_probability: 0.72,
    historical_rate: 0.65,
    appeal_letter_preview:
      "Dear Humana Claims Review Department,\n\nWe are writing to appeal the denial of claim CLM-2026-0844 under reason code CO-16. The original submission contained all required information per the CMS-1500 guidelines. We have attached the following supporting documentation: (1) Updated CMS-1500 with corrected Box 21, (2) Complete medical records for date of service, (3) Provider attestation of medical necessity.\n\nWe respectfully request reconsideration of this claim.",
    corrective_actions: [
      "Verify all required fields before submission",
      "Add secondary diagnosis codes for complex cases",
      "Include supporting documentation with initial submission",
    ],
  },
  {
    id: "DEN-2026-0045",
    claim_id: "CLM-2026-0839",
    patient: "Robert Chen",
    billed_amount: 285.0,
    denial_code: "CO-4",
    denial_reason: "The procedure code is inconsistent with the modifier used or a required modifier is missing",
    root_cause: "Coding Error",
    payer: "Medicare Part B",
    denial_date: "Feb 22, 2026",
    appeal_status: "won",
    appeal_probability: 0.82,
    historical_rate: 0.75,
    appeal_letter_preview: null,
    corrective_actions: [
      "Verify modifier usage with CPT guidelines",
      "Cross-reference procedure code with diagnosis",
    ],
  },
  {
    id: "DEN-2026-0043",
    claim_id: "CLM-2026-0835",
    patient: "Sarah Kim",
    billed_amount: 450.0,
    denial_code: "CO-197",
    denial_reason: "Precertification/authorization/notification absent",
    root_cause: "Prior Auth Missing",
    payer: "Aetna",
    denial_date: "Feb 20, 2026",
    appeal_status: "appeal_submitted",
    appeal_probability: 0.55,
    historical_rate: 0.45,
    appeal_letter_preview:
      "Dear Aetna Appeals Department,\n\nWe appeal claim CLM-2026-0835 denied under CO-197. We submit evidence that prior authorization was obtained (Auth #PA-2026-0182) on Feb 15, 2026, prior to the date of service. The authorization reference number was inadvertently omitted from the original claim submission. Attached: PA approval letter, corrected claim form.",
    corrective_actions: [
      "Always include PA reference number on claim submission",
      "Implement automated PA verification before claim generation",
    ],
  },
  {
    id: "DEN-2026-0041",
    claim_id: "CLM-2026-0830",
    patient: "Michael Brown",
    billed_amount: 125.0,
    denial_code: "CO-29",
    denial_reason: "The time limit for filing has expired",
    root_cause: "Timely Filing",
    payer: "Cigna",
    denial_date: "Feb 18, 2026",
    appeal_status: "no_appeal",
    appeal_probability: 0.12,
    historical_rate: 0.15,
    appeal_letter_preview: null,
    corrective_actions: [
      "Set up automated filing deadline alerts",
      "Prioritize claims nearing filing deadline",
      "Implement weekly aging report review",
    ],
  },
];

const APPEAL_STATUS_CONFIG: Record<
  string,
  { label: string; style: string; icon: typeof CheckCircle2 }
> = {
  analyzing: {
    label: "AI Analyzing",
    style: "bg-violet-50 text-violet-700 border-violet-200",
    icon: Sparkles,
  },
  appeal_drafted: {
    label: "Appeal Drafted",
    style: "bg-blue-50 text-blue-700 border-blue-200",
    icon: FileText,
  },
  appeal_submitted: {
    label: "Appeal Submitted",
    style: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  won: {
    label: "Appeal Won",
    style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  lost: {
    label: "Appeal Lost",
    style: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  no_appeal: {
    label: "No Appeal",
    style: "bg-slate-50 text-slate-600 border-slate-200",
    icon: XCircle,
  },
};

const ROOT_CAUSE_COLORS: Record<string, string> = {
  "Missing Information": "bg-orange-50 text-orange-700 border-orange-200",
  "Coding Error": "bg-red-50 text-red-700 border-red-200",
  "Prior Auth Missing": "bg-violet-50 text-violet-700 border-violet-200",
  "Timely Filing": "bg-slate-50 text-slate-600 border-slate-200",
  "Medical Necessity": "bg-amber-50 text-amber-700 border-amber-200",
  "Eligibility": "bg-blue-50 text-blue-700 border-blue-200",
};

/* ---------- stat cards ---------- */

const DENIAL_STATS = [
  { label: "Active Denials", value: "23", color: "text-red-600" },
  { label: "Appeals in Progress", value: "8", color: "text-amber-600" },
  { label: "Appeals Won (30d)", value: "14", color: "text-emerald-600" },
  { label: "Revenue Recovered", value: "$18,450", color: "text-emerald-600" },
];

/* ---------- denial code distribution ---------- */

const CODE_DISTRIBUTION = [
  { code: "CO-16", label: "Missing Information", pct: 32, color: "from-orange-400 to-orange-300" },
  { code: "CO-4", label: "Coding Mismatch", pct: 24, color: "from-red-400 to-red-300" },
  { code: "CO-197", label: "No Prior Auth", pct: 18, color: "from-violet-400 to-violet-300" },
  { code: "PR-1", label: "Deductible", pct: 14, color: "from-blue-400 to-blue-300" },
  { code: "CO-29", label: "Timely Filing", pct: 12, color: "from-slate-400 to-slate-300" },
];

/* ---------- page ---------- */

export default function DenialsPage() {
  const [denials] = useState<DenialCase[]>(MOCK_DENIALS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? denials : denials.filter((d) => d.appeal_status === filter);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/claims"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--medos-gray-200)] hover:bg-[var(--medos-gray-50)] transition-default"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--medos-gray-600)]" />
          </Link>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
              Denial Management
            </h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              AI-powered denial analysis, appeal drafting, and tracking
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {DENIAL_STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5"
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--medos-gray-500)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Denial code distribution */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
        <p className="text-sm font-semibold text-[var(--medos-navy)] mb-3">
          Denial Code Distribution (Last 30 Days)
        </p>
        <div className="space-y-2.5">
          {CODE_DISTRIBUTION.map((d) => (
            <div key={d.code} className="flex items-center gap-3">
              <span className="w-14 text-xs font-mono font-medium text-[var(--medos-gray-600)]">
                {d.code}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-[var(--medos-gray-600)]">
                    {d.label}
                  </span>
                  <span className="text-xs font-semibold text-[var(--medos-gray-500)] tabular-nums">
                    {d.pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${d.color}`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: "all", label: "All" },
          { key: "analyzing", label: "Analyzing" },
          { key: "appeal_drafted", label: "Drafted" },
          { key: "appeal_submitted", label: "Submitted" },
          { key: "won", label: "Won" },
          { key: "no_appeal", label: "No Appeal" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-default ${
              filter === f.key
                ? "bg-[var(--medos-primary)] text-white"
                : "bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-200)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Denial list */}
      <div className="space-y-3">
        {filtered.map((den) => {
          const cfg = APPEAL_STATUS_CONFIG[den.appeal_status];
          const StatusIcon = cfg?.icon;
          const isExpanded = expanded === den.id;

          return (
            <div
              key={den.id}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden"
            >
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : den.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--medos-gray-50)] transition-default"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-mono font-bold text-red-600">
                      {den.denial_code}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                        ROOT_CAUSE_COLORS[den.root_cause] || ""
                      }`}
                    >
                      {den.root_cause}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--medos-navy)] truncate">
                      {den.patient} — ${den.billed_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-[var(--medos-gray-500)] truncate">
                      {den.denial_reason}
                    </p>
                    <p className="text-[10px] text-[var(--medos-gray-400)]">
                      {den.payer} &middot; {den.claim_id} &middot;{" "}
                      {den.denial_date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Appeal probability */}
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-[var(--medos-gray-400)]" />
                      <span
                        className={`text-xs font-semibold ${
                          den.appeal_probability >= 0.6
                            ? "text-emerald-600"
                            : den.appeal_probability >= 0.3
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {(den.appeal_probability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[9px] text-[var(--medos-gray-400)]">
                      appeal prob.
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg?.style}`}
                  >
                    {StatusIcon && <StatusIcon className="w-3 h-3" />}
                    {cfg?.label}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--medos-gray-400)] transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[var(--medos-gray-100)] px-5 py-4 bg-[var(--medos-gray-50)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Analysis */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                          AI Root Cause Analysis
                        </p>
                        <div className="bg-white rounded-lg border border-[var(--medos-gray-200)] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--medos-gray-500)]">
                              CARC Code
                            </span>
                            <span className="text-xs font-mono font-bold text-red-600">
                              {den.denial_code}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--medos-gray-500)]">
                              Root Cause
                            </span>
                            <span className="text-xs font-medium text-[var(--medos-gray-700)]">
                              {den.root_cause}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--medos-gray-500)]">
                              Historical Success Rate
                            </span>
                            <span className="text-xs font-semibold text-[var(--medos-gray-700)]">
                              {(den.historical_rate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--medos-gray-500)]">
                              Appeal Probability
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                den.appeal_probability >= 0.6
                                  ? "text-emerald-600"
                                  : den.appeal_probability >= 0.3
                                  ? "text-amber-600"
                                  : "text-red-600"
                              }`}
                            >
                              {(den.appeal_probability * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                          Corrective Actions
                        </p>
                        <ul className="space-y-1.5">
                          {den.corrective_actions.map((action, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-[var(--medos-gray-700)]"
                            >
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--medos-primary-light)] text-[var(--medos-primary)] flex items-center justify-center text-[9px] font-bold mt-0.5">
                                {i + 1}
                              </span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Right: Appeal letter */}
                    <div>
                      <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                        {den.appeal_letter_preview
                          ? "AI-Drafted Appeal Letter"
                          : "Appeal Status"}
                      </p>
                      {den.appeal_letter_preview ? (
                        <div className="bg-white rounded-lg border border-[var(--medos-gray-200)] p-3">
                          <p className="text-xs text-[var(--medos-gray-700)] leading-relaxed whitespace-pre-line">
                            {den.appeal_letter_preview}
                          </p>
                        </div>
                      ) : den.appeal_status === "no_appeal" ? (
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                          <p className="text-xs text-slate-600">
                            AI analysis determined appeal is not viable for this
                            denial (probability: {(den.appeal_probability * 100).toFixed(0)}%).
                            Focus on corrective actions to prevent future denials
                            of this type.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <p className="text-xs font-semibold text-emerald-700">
                              Appeal Won
                            </p>
                          </div>
                          <p className="text-xs text-emerald-600">
                            ${den.billed_amount.toFixed(2)} recovered. Claim
                            reprocessed and paid.
                          </p>
                        </div>
                      )}

                      {den.appeal_status === "appeal_drafted" && (
                        <div className="flex gap-2 mt-3">
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
                            <RotateCcw className="w-3.5 h-3.5" />
                            Submit Appeal
                          </button>
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
                            <FileText className="w-3.5 h-3.5" />
                            Edit Letter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
