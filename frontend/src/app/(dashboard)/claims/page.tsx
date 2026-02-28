"use client";

import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  DollarSign,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Eye,
  RotateCcw,
  Radar,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Shield,
  Zap,
  AlertCircle,
} from "lucide-react";
import { getClaims, type Claim } from "@/lib/api";

const MOCK_CLAIMS: Claim[] = [
  {
    id: "CLM-2026-0847",
    patient: "Maria Garcia",
    cpt: "99214",
    icd10: "E11.65, I10",
    amount: 285.0,
    payer: "Blue Cross Blue Shield",
    status: "submitted",
    date: "Feb 28, 2026",
  },
  {
    id: "CLM-2026-0846",
    patient: "Robert Chen",
    cpt: "99215",
    icd10: "I48.91, N18.3, I10",
    amount: 375.0,
    payer: "Medicare Part B",
    status: "approved",
    date: "Feb 27, 2026",
  },
  {
    id: "CLM-2026-0845",
    patient: "James Rodriguez",
    cpt: "99214",
    icd10: "J44.1, G47.33, E66.01",
    amount: 285.0,
    payer: "Aetna",
    status: "pending",
    date: "Feb 27, 2026",
  },
  {
    id: "CLM-2026-0844",
    patient: "William Torres",
    cpt: "99215",
    icd10: "I50.22, E11.65, G62.9",
    amount: 375.0,
    payer: "Humana Gold Plus",
    status: "denied",
    date: "Feb 26, 2026",
  },
  {
    id: "CLM-2026-0843",
    patient: "Ana Flores",
    cpt: "99203",
    icd10: "G43.909, F41.1",
    amount: 225.0,
    payer: "Cigna",
    status: "approved",
    date: "Feb 25, 2026",
  },
];

const CLAIM_CONFIDENCE: Record<string, number> = {
  "CLM-2026-0847": 92,
  "CLM-2026-0846": 96,
  "CLM-2026-0845": 87,
  "CLM-2026-0844": 34,
  "CLM-2026-0843": 94,
};

function getConfidenceColor(score: number): string {
  if (score > 90) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 70) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

const DENIAL_REASONS = [
  { label: "Medical Necessity Documentation", pct: 32 },
  { label: "Coding Error / Mismatch", pct: 28 },
  { label: "Prior Authorization Missing", pct: 18 },
];

const STATUS_MAP: Record<string, { label: string; style: string; icon: typeof CheckCircle2 }> = {
  approved: {
    label: "Approved",
    style: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: CheckCircle2,
  },
  submitted: {
    label: "Submitted",
    style: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: Send,
  },
  pending: {
    label: "Pending",
    style: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Clock,
  },
  denied: {
    label: "Denied",
    style: "bg-red-50 text-red-700 border border-red-200",
    icon: AlertTriangle,
  },
};

const TIMELINE_STEPS = ["Created", "Submitted", "Processing", "Resolved"];

function getTimelineState(status: string): number {
  switch (status) {
    case "submitted":
      return 1;
    case "pending":
      return 2;
    case "approved":
    case "denied":
      return 3;
    default:
      return 0;
  }
}

function getResolvedLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "denied":
      return "Denied";
    case "pending":
      return "Pending";
    default:
      return "Resolved";
  }
}

function ClaimTimeline({ status }: { status: string }) {
  const currentStep = getTimelineState(status);
  const steps = TIMELINE_STEPS.map((s, i) =>
    i === 3 ? getResolvedLabel(status) : s
  );

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const isFuture = i > currentStep;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-[var(--medos-primary)] text-white animate-pulse"
                    : "bg-[var(--medos-gray-200)] text-[var(--medos-gray-400)]"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  isFuture
                    ? "text-[var(--medos-gray-400)]"
                    : "text-[var(--medos-gray-600)] font-medium"
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 mb-4 ${
                  i < currentStep
                    ? "bg-emerald-500"
                    : "bg-[var(--medos-gray-200)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClaimActions({ status }: { status: string }) {
  switch (status) {
    case "denied":
      return (
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
            <RotateCcw className="w-3.5 h-3.5" />
            Appeal
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
            <Eye className="w-3.5 h-3.5" />
            View Denial Reason
          </button>
        </div>
      );
    case "pending":
      return (
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
          <Clock className="w-3.5 h-3.5" />
          Check Status
        </button>
      );
    case "approved":
      return (
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
          <Eye className="w-3.5 h-3.5" />
          View EOB
        </button>
      );
    case "submitted":
      return (
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
          <Radar className="w-3.5 h-3.5" />
          Track
        </button>
      );
    default:
      return null;
  }
}

function ExpandableClaimRow({ claim, isExpanded }: { claim: Claim; isExpanded: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded]);

  const billedAmount = claim.amount;
  const allowedAmount = +(billedAmount * 0.82).toFixed(2);
  const patientResp = +(billedAmount * 0.18).toFixed(2);

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: isExpanded ? `${maxHeight}px` : "0px" }}
        >
          <div ref={contentRef}>
            <div className="px-6 py-4 bg-[var(--medos-gray-50)] border-t border-[var(--medos-gray-100)]">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-3">
                    Claim Timeline
                  </p>
                  <ClaimTimeline status={claim.status} />
                </div>
                <div className="flex flex-col items-end gap-3">
                  <ClaimActions status={claim.status} />
                  <p className="text-xs text-[var(--medos-gray-500)]">
                    <span className="font-medium">Billed: ${billedAmount.toFixed(2)}</span>
                    <span className="mx-1.5">|</span>
                    <span className="font-medium">Allowed: ${allowedAmount.toFixed(2)}</span>
                    <span className="mx-1.5">|</span>
                    <span className="font-medium">Patient Resp: ${patientResp.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [denialPanelOpen, setDenialPanelOpen] = useState(false);

  useEffect(() => {
    getClaims().then((apiData) => {
      if (apiData) setClaims(apiData);
      setLoading(false);
    });
  }, []);

  const filteredClaims = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return claims;
    return claims.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.patient.toLowerCase().includes(q) ||
        c.cpt.toLowerCase().includes(q) ||
        c.icd10.toLowerCase().includes(q) ||
        c.payer.toLowerCase().includes(q)
    );
  }, [claims, searchQuery]);

  const totalRevenue = filteredClaims.filter((c) => c.status === "approved").reduce(
    (sum, c) => sum + c.amount,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--medos-gray-200)] border-t-[var(--medos-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <DollarSign className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Claims</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              Revenue cycle management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--medos-gray-300)] text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
            <Send className="w-4 h-4" />
            Submit Claim
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">38</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Pending Claims</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-emerald-600">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">Approved This Week</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">4.2%</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Denial Rate</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">12</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Prior Auths Pending</p>
        </div>
      </div>

      {/* Revenue Intelligence */}
      <div className="space-y-4">
        {/* Revenue Opportunity Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Recoverable Revenue */}
          <div className="group relative bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                  Recoverable Revenue
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">$12,450</p>
                <p className="text-xs text-[var(--medos-gray-500)] mt-1">
                  From 4 appealable denied claims
                </p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Avg Days-to-Payment */}
          <div className="group relative bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                  Avg Days-to-Payment
                </p>
                <p className="text-2xl font-bold text-[var(--medos-navy)] mt-1">18.3</p>
                <p className="text-xs text-emerald-600 mt-1">
                  3.2 days faster than last quarter
                </p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Pre-Submit AI Accuracy */}
          <div className="group relative bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                  Pre-Submit AI Accuracy
                </p>
                <p className="text-2xl font-bold text-violet-600 mt-1">94.7%</p>
                <p className="text-xs text-[var(--medos-gray-500)] mt-1">
                  Claims auto-coded correctly
                </p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-100 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Denial Prevention Panel */}
        <div className="rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <button
            onClick={() => setDenialPanelOpen(!denialPanelOpen)}
            className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50 hover:from-slate-100 hover:via-white hover:to-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--medos-primary-light)]">
                <Shield className="w-4 h-4 text-[var(--medos-primary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--medos-navy)]">
                  AI Denial Prevention Insights
                </p>
                <p className="text-xs text-[var(--medos-gray-500)]">
                  Top denial reasons and AI-powered corrections
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-[var(--medos-gray-400)] transition-transform duration-300 ${
                denialPanelOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              denialPanelOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-5 pb-5 pt-2 bg-gradient-to-br from-slate-50/80 via-white to-blue-50/60">
              <div className="space-y-3">
                {DENIAL_REASONS.map((reason) => (
                  <div key={reason.label} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-[var(--medos-gray-700)] font-medium truncate">
                          {reason.label}
                        </p>
                        <span className="text-xs font-semibold text-[var(--medos-gray-500)] tabular-nums ml-2">
                          {reason.pct}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--medos-primary)] to-blue-400 transition-all duration-500"
                          style={{ width: `${reason.pct}%` }}
                        />
                      </div>
                    </div>
                    <button className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 text-violet-700 text-[10px] font-semibold border border-violet-200 hover:bg-violet-100 transition-colors">
                      <Zap className="w-3 h-3" />
                      AI Fix
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--medos-gray-100)]">
                <p className="text-xs text-[var(--medos-gray-500)]">
                  <span className="font-semibold text-emerald-600">AI prevented 23 potential denials</span>{" "}
                  this month, saving an estimated{" "}
                  <span className="font-semibold text-emerald-600">$8,740</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
        <input
          type="text"
          placeholder="Search by claim ID, patient, or CPT code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
        />
      </div>

      {/* Claims table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Claim ID
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Patient
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                CPT / ICD-10
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Payer
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {filteredClaims.map((claim) => {
              const statusInfo = STATUS_MAP[claim.status];
              const StatusIcon = statusInfo?.icon;
              const isExpanded = expandedClaim === claim.id;
              return (
                <Fragment key={claim.id}>
                  <tr
                    className={`transition-default cursor-pointer ${
                      isExpanded
                        ? "bg-[var(--medos-primary-light)]"
                        : "hover:bg-[var(--medos-gray-50)]"
                    }`}
                    onClick={() =>
                      setExpandedClaim(isExpanded ? null : claim.id)
                    }
                  >
                    <td className="px-6 py-4 text-sm font-mono font-medium text-[var(--medos-primary)]">
                      {claim.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--medos-gray-900)]">
                      {claim.patient}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[var(--medos-gray-900)]">
                        CPT: {claim.cpt}
                      </p>
                      <p className="text-xs text-[var(--medos-gray-500)]">
                        {claim.icd10}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--medos-gray-600)]">
                      {claim.payer}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--medos-gray-900)] text-right tabular-nums">
                      ${claim.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo?.style || ""}`}
                        >
                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                          {statusInfo?.label || claim.status}
                        </span>
                        {CLAIM_CONFIDENCE[claim.id] != null && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border animate-[fadeIn_0.5s_ease-in-out] ${getConfidenceColor(
                              CLAIM_CONFIDENCE[claim.id]
                            )}`}
                          >
                            {CLAIM_CONFIDENCE[claim.id] < 70 && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            AI Confidence: {CLAIM_CONFIDENCE[claim.id]}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--medos-gray-500)]">
                          {claim.date}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-[var(--medos-gray-400)] transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                  <ExpandableClaimRow claim={claim} isExpanded={isExpanded} />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
