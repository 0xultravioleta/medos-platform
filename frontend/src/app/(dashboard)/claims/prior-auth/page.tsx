"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Send,
  Activity,
  Stethoscope,
  ChevronDown,
} from "lucide-react";

/* ---------- types ---------- */

interface PriorAuth {
  id: string;
  claim_id: string;
  patient: string;
  procedure: string;
  cpt: string;
  payer: string;
  status: "pending" | "submitted" | "approved" | "denied" | "not_required";
  urgency: "routine" | "urgent" | "emergent";
  submitted_date: string;
  decision_date: string | null;
  confidence: number;
  justification_preview: string;
}

/* ---------- mock data ---------- */

const MOCK_PRIOR_AUTHS: PriorAuth[] = [
  {
    id: "PA-2026-0201",
    claim_id: "CLM-2026-0847",
    patient: "Maria Garcia",
    procedure: "Total Knee Arthroplasty, Right",
    cpt: "27447",
    payer: "Blue Cross Blue Shield",
    status: "pending",
    urgency: "routine",
    submitted_date: "Feb 27, 2026",
    decision_date: null,
    confidence: 0.88,
    justification_preview:
      "Patient has failed 6 months of conservative treatment including physical therapy, NSAIDs, and corticosteroid injections. Kellgren-Lawrence Grade IV osteoarthritis confirmed on weight-bearing X-ray.",
  },
  {
    id: "PA-2026-0199",
    claim_id: "CLM-2026-0845",
    patient: "James Rodriguez",
    procedure: "Lumbar Epidural Steroid Injection",
    cpt: "62323",
    payer: "Aetna",
    status: "submitted",
    urgency: "urgent",
    submitted_date: "Feb 25, 2026",
    decision_date: null,
    confidence: 0.92,
    justification_preview:
      "Chronic lumbar radiculopathy with MRI-confirmed L4-L5 disc herniation. Conservative management (PT, medications) for 8 weeks without adequate relief. VAS pain score 7/10.",
  },
  {
    id: "PA-2026-0195",
    claim_id: "CLM-2026-0843",
    patient: "Ana Flores",
    procedure: "MRI Brain with Contrast",
    cpt: "70553",
    payer: "Cigna",
    status: "approved",
    urgency: "routine",
    submitted_date: "Feb 20, 2026",
    decision_date: "Feb 23, 2026",
    confidence: 0.95,
    justification_preview:
      "New-onset migraine with aura, atypical features including visual disturbances and unilateral weakness. Neurological exam shows focal findings requiring urgent imaging to rule out structural pathology.",
  },
  {
    id: "PA-2026-0190",
    claim_id: "CLM-2026-0844",
    patient: "William Torres",
    procedure: "Cardiac Catheterization",
    cpt: "93458",
    payer: "Humana Gold Plus",
    status: "denied",
    urgency: "urgent",
    submitted_date: "Feb 18, 2026",
    decision_date: "Feb 22, 2026",
    confidence: 0.72,
    justification_preview:
      "CHF exacerbation with EF 35%. Payer denied stating non-invasive stress testing not completed first. Appeal initiated with cardiology peer review documentation.",
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; style: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: "Pending Review",
    style: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  submitted: {
    label: "Submitted to Payer",
    style: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Send,
  },
  approved: {
    label: "Approved",
    style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  denied: {
    label: "Denied",
    style: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  not_required: {
    label: "Not Required",
    style: "bg-slate-50 text-slate-600 border-slate-200",
    icon: CheckCircle2,
  },
};

const URGENCY_STYLE: Record<string, string> = {
  routine: "bg-slate-50 text-slate-600 border-slate-200",
  urgent: "bg-orange-50 text-orange-700 border-orange-200",
  emergent: "bg-red-50 text-red-700 border-red-200",
};

/* ---------- stat cards ---------- */

const STATS = [
  { label: "Pending PAs", value: "12", sub: "Avg 3.2 days wait" },
  { label: "Approval Rate", value: "78%", sub: "Last 30 days" },
  { label: "Avg Turnaround", value: "4.1d", sub: "Down from 6.8d" },
  { label: "AI Auto-Drafted", value: "94%", sub: "Justifications generated" },
];

/* ---------- timeline component ---------- */

const PA_STEPS = ["Created", "Submitted", "Under Review", "Decision"];

function PATimeline({ status }: { status: string }) {
  const stepMap: Record<string, number> = {
    pending: 0,
    submitted: 1,
    approved: 3,
    denied: 3,
  };
  const current = stepMap[status] ?? 0;

  return (
    <div className="flex items-center gap-0">
      {PA_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-[var(--medos-primary)] text-white animate-pulse"
                    : "bg-[var(--medos-gray-200)] text-[var(--medos-gray-400)]"
                }`}
              >
                {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </div>
              <span
                className={`text-[9px] mt-0.5 whitespace-nowrap ${
                  done || active
                    ? "text-[var(--medos-gray-600)] font-medium"
                    : "text-[var(--medos-gray-400)]"
                }`}
              >
                {step}
              </span>
            </div>
            {i < PA_STEPS.length - 1 && (
              <div
                className={`w-6 h-0.5 mx-0.5 mb-3 ${
                  i < current ? "bg-emerald-500" : "bg-[var(--medos-gray-200)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- page ---------- */

export default function PriorAuthPage() {
  const [auths, setAuths] = useState<PriorAuth[]>(MOCK_PRIOR_AUTHS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? auths : auths.filter((a) => a.status === filter);

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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-50">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
              Prior Authorizations
            </h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              AI-powered PA management and tracking
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
          <FileText className="w-4 h-4" />
          New PA Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5"
          >
            <p className="text-2xl font-bold text-[var(--medos-navy)]">
              {s.value}
            </p>
            <p className="text-xs text-[var(--medos-gray-500)]">{s.label}</p>
            <p className="text-[10px] text-emerald-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {["all", "pending", "submitted", "approved", "denied"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-default ${
              filter === f
                ? "bg-[var(--medos-primary)] text-white"
                : "bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-200)]"
            }`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {/* PA list */}
      <div className="space-y-3">
        {filtered.map((pa) => {
          const cfg = STATUS_CONFIG[pa.status];
          const StatusIcon = cfg?.icon;
          const isExpanded = expanded === pa.id;

          return (
            <div
              key={pa.id}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden"
            >
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : pa.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--medos-gray-50)] transition-default"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-50 flex-shrink-0">
                    <Stethoscope className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--medos-navy)] truncate">
                        {pa.procedure}
                      </p>
                      <span className="text-xs font-mono text-[var(--medos-gray-400)]">
                        CPT {pa.cpt}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--medos-gray-500)]">
                      {pa.patient} &middot; {pa.payer} &middot; {pa.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${URGENCY_STYLE[pa.urgency]}`}
                  >
                    {pa.urgency}
                  </span>
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
                    {/* Left: Timeline + details */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                          Authorization Timeline
                        </p>
                        <PATimeline status={pa.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[var(--medos-gray-500)]">
                            Submitted
                          </p>
                          <p className="font-medium text-[var(--medos-gray-900)]">
                            {pa.submitted_date}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--medos-gray-500)]">
                            Decision
                          </p>
                          <p className="font-medium text-[var(--medos-gray-900)]">
                            {pa.decision_date ?? "Pending"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--medos-gray-500)]">
                            Linked Claim
                          </p>
                          <Link
                            href="/claims"
                            className="font-mono font-medium text-[var(--medos-primary)] hover:underline"
                          >
                            {pa.claim_id}
                          </Link>
                        </div>
                        <div>
                          <p className="text-[var(--medos-gray-500)]">
                            AI Confidence
                          </p>
                          <span
                            className={`font-semibold ${
                              pa.confidence >= 0.9
                                ? "text-emerald-600"
                                : pa.confidence >= 0.8
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {(pa.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: AI justification */}
                    <div>
                      <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                        AI-Generated Clinical Justification
                      </p>
                      <div className="bg-white rounded-lg border border-[var(--medos-gray-200)] p-3">
                        <p className="text-xs text-[var(--medos-gray-700)] leading-relaxed">
                          {pa.justification_preview}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {pa.status === "pending" && (
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
                            <Send className="w-3.5 h-3.5" />
                            Submit to Payer
                          </button>
                        )}
                        {pa.status === "denied" && (
                          <Link
                            href="/claims/denials"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-default"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Start Appeal
                          </Link>
                        )}
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
                          <FileText className="w-3.5 h-3.5" />
                          View Full Form
                        </button>
                      </div>
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
