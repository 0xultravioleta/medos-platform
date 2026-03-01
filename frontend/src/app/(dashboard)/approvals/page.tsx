"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  Brain,
  CheckCircle2,
  XCircle,
  ChevronDown,
  AlertCircle,
  FileText,
  Scale,
  DollarSign,
  Search,
  X,
  Sparkles,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import {
  getApprovals,
  getApprovalStats,
  approveTask,
  rejectTask,
  type ApprovalTask,
  type ApprovalStats,
} from "@/lib/approvals-api";

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const AGENT_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: typeof Brain }
> = {
  prior_auth: {
    label: "Prior Auth",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: FileText,
  },
  denial_management: {
    label: "Denial Mgmt",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Scale,
  },
  billing: {
    label: "Billing",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: DollarSign,
  },
  clinical_scribe: {
    label: "Clinical Scribe",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Brain,
  },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "prior_auth", label: "Prior Auth" },
  { key: "denial_management", label: "Denial Mgmt" },
  { key: "billing", label: "Billing" },
] as const;

function getConfidenceColor(score: number): {
  text: string;
  bg: string;
  border: string;
  ring: string;
} {
  if (score >= 0.85)
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      ring: "ring-emerald-400",
    };
  if (score >= 0.7)
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      ring: "ring-amber-400",
    };
  return {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    ring: "ring-red-400",
  };
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getResourceIcon(type: string) {
  switch (type) {
    case "PriorAuthForm":
      return <FileText className="w-3.5 h-3.5" />;
    case "AppealLetter":
      return <Scale className="w-3.5 h-3.5" />;
    case "Claim":
      return <DollarSign className="w-3.5 h-3.5" />;
    default:
      return <FileText className="w-3.5 h-3.5" />;
  }
}

// ---------------------------------------------------------------------------
// Confidence Ring (visual indicator)
// ---------------------------------------------------------------------------

function ConfidenceRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const colors = getConfidenceColor(score);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score * circumference);

  return (
    <div className="relative flex items-center justify-center w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-[var(--medos-gray-100)]"
        />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={colors.text}
        />
      </svg>
      <span className={`absolute text-xs font-bold ${colors.text}`}>
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast Notification
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border animate-[slideUp_0.3s_ease-out] ${
        type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 rounded hover:bg-white/50 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[var(--medos-gray-200)] w-full max-w-md mx-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <h3 className="text-lg font-semibold text-[var(--medos-navy)]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--medos-gray-100)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--medos-gray-400)]" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function DetailPanel({
  task,
  onClose,
  onApprove,
  onReject,
}: {
  task: ApprovalTask;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const agent = AGENT_CONFIG[task.agent_type];
  const conf = getConfidenceColor(task.confidence_score);

  return (
    <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--medos-gray-100)] bg-[var(--medos-gray-50)]">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${agent?.bg}`}>
            {agent && <agent.icon className={`w-4 h-4 ${agent.color}`} />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
              {task.title}
            </h3>
            <p className="text-xs text-[var(--medos-gray-500)]">
              {task.patient_name} -- {task.resource_type}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--medos-gray-200)] transition-colors"
        >
          <X className="w-4 h-4 text-[var(--medos-gray-400)]" />
        </button>
      </div>

      {/* Confidence bar */}
      <div className="px-6 py-3 border-b border-[var(--medos-gray-100)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-[var(--medos-gray-500)]">
            AI Confidence
          </span>
          <span className={`text-xs font-bold ${conf.text}`}>
            {Math.round(task.confidence_score * 100)}%
          </span>
        </div>
        <div className="w-full h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              task.confidence_score >= 0.85
                ? "bg-emerald-500"
                : task.confidence_score >= 0.7
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${task.confidence_score * 100}%` }}
          />
        </div>
        {task.confidence_score < 0.85 && (
          <p className="mt-1.5 text-[10px] text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Below auto-approval threshold -- human review required
          </p>
        )}
      </div>

      {/* Payload */}
      <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
        <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider">
          Details
        </p>
        <p className="text-sm text-[var(--medos-gray-700)] leading-relaxed">
          {task.description}
        </p>

        {Object.entries(task.payload).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <p className="text-xs font-medium text-[var(--medos-gray-500)] capitalize">
              {key.replace(/_/g, " ")}
            </p>
            {typeof value === "string" ? (
              <p className="text-sm text-[var(--medos-gray-800)] whitespace-pre-wrap bg-[var(--medos-gray-50)] rounded-lg p-3 border border-[var(--medos-gray-100)]">
                {value}
              </p>
            ) : Array.isArray(value) ? (
              <ul className="text-sm text-[var(--medos-gray-800)] list-disc list-inside space-y-0.5">
                {value.map((item, i) => (
                  <li key={i}>{String(item)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--medos-gray-800)] font-mono text-xs bg-[var(--medos-gray-50)] rounded-lg p-3 border border-[var(--medos-gray-100)]">
                {JSON.stringify(value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--medos-gray-100)] bg-[var(--medos-gray-50)]">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ApprovalsPage() {
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Modal state
  const [approveModal, setApproveModal] = useState<ApprovalTask | null>(null);
  const [rejectModal, setRejectModal] = useState<ApprovalTask | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    Promise.all([getApprovals(), getApprovalStats()]).then(
      ([approvals, approvalStats]) => {
        setTasks(approvals);
        setStats(approvalStats);
        setLoading(false);
      }
    );
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => t.status === "pending");
    if (activeFilter !== "all") {
      result = result.filter((t) => t.agent_type === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.patient_name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, activeFilter, searchQuery]);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  async function handleApprove() {
    if (!approveModal) return;
    setActionLoading(true);
    const success = await approveTask(approveModal.id, approveNotes);
    if (success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === approveModal.id ? { ...t, status: "approved" as const } : t
        )
      );
      setToast({ message: `Approved: ${approveModal.title}`, type: "success" });
      if (expandedTask === approveModal.id) setExpandedTask(null);
    } else {
      setToast({ message: "Failed to approve task", type: "error" });
    }
    setApproveModal(null);
    setApproveNotes("");
    setActionLoading(false);
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    const success = await rejectTask(rejectModal.id, rejectReason);
    if (success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === rejectModal.id ? { ...t, status: "rejected" as const } : t
        )
      );
      setToast({ message: `Rejected: ${rejectModal.title}`, type: "success" });
      if (expandedTask === rejectModal.id) setExpandedTask(null);
    } else {
      setToast({ message: "Failed to reject task", type: "error" });
    }
    setRejectModal(null);
    setRejectReason("");
    setActionLoading(false);
  }

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
            <ShieldCheck className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
              Approval Queue
            </h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              {pendingCount} task{pendingCount !== 1 ? "s" : ""} pending review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">
              {pendingCount} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Pending */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-[var(--medos-navy)]">
                  {stats.total_pending}
                </p>
                <p className="text-xs text-[var(--medos-gray-500)]">
                  Total Pending
                </p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Avg Confidence */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-[var(--medos-navy)]">
                  {Math.round(stats.avg_confidence * 100)}%
                </p>
                <p className="text-xs text-[var(--medos-gray-500)]">
                  Avg Confidence
                </p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50">
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Approved Today */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.approved_today}
                </p>
                <p className="text-xs text-[var(--medos-gray-500)]">
                  Approved Today
                </p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Rejected Today */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {stats.rejected_today}
                </p>
                <p className="text-xs text-[var(--medos-gray-500)]">
                  Rejected Today
                </p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Breakdown */}
      {stats && (
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-3">
            By Agent Type
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.by_agent).map(([agent, count]) => {
              const config = AGENT_CONFIG[agent];
              if (!config) return null;
              const AgentIcon = config.icon;
              return (
                <button
                  key={agent}
                  onClick={() =>
                    setActiveFilter(activeFilter === agent ? "all" : agent)
                  }
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                    activeFilter === agent
                      ? `${config.bg} ${config.border} ${config.color} shadow-sm`
                      : "border-[var(--medos-gray-200)] text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-50)]"
                  }`}
                >
                  <AgentIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{config.label}</span>
                  <span
                    className={`ml-auto text-sm font-bold ${
                      count > 0 ? "" : "opacity-40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--medos-gray-100)]">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeFilter === tab.key
                  ? "bg-white text-[var(--medos-navy)] shadow-sm"
                  : "text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
          <input
            type="text"
            placeholder="Search by title, patient, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--medos-navy)]">
              All caught up!
            </h3>
            <p className="mt-1 text-sm text-[var(--medos-gray-500)] max-w-sm">
              No pending approval tasks
              {activeFilter !== "all"
                ? ` for ${AGENT_CONFIG[activeFilter]?.label || activeFilter}`
                : ""}
              . AI agents will create new tasks as they process clinical workflows.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const agent = AGENT_CONFIG[task.agent_type];
            const conf = getConfidenceColor(task.confidence_score);
            const isExpanded = expandedTask === task.id;
            const AgentIcon = agent?.icon || Brain;

            return (
              <div key={task.id} className="space-y-0">
                {/* Card */}
                <div
                  className={`bg-white rounded-xl border shadow-medos-sm transition-all duration-200 cursor-pointer ${
                    isExpanded
                      ? "border-[var(--medos-primary)] shadow-md rounded-b-none"
                      : "border-[var(--medos-gray-200)] hover:shadow-md hover:border-[var(--medos-gray-300)]"
                  }`}
                  onClick={() =>
                    setExpandedTask(isExpanded ? null : task.id)
                  }
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Confidence Ring */}
                    <ConfidenceRing score={task.confidence_score} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[var(--medos-navy)] truncate">
                          {task.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Agent badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${agent?.bg} ${agent?.color} ${agent?.border}`}
                        >
                          <AgentIcon className="w-3 h-3" />
                          {agent?.label}
                        </span>
                        {/* Resource type */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]">
                          {getResourceIcon(task.resource_type)}
                          {task.resource_type}
                        </span>
                        {/* Confidence badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          {task.confidence_score < 0.7 && (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {task.confidence_score >= 0.85 && (
                            <Sparkles className="w-3 h-3" />
                          )}
                          {Math.round(task.confidence_score * 100)}%
                          {task.confidence_score >= 0.95
                            ? " Auto-eligible"
                            : task.confidence_score < 0.7
                            ? " Low"
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--medos-gray-500)]">
                        {task.patient_name} -- {formatTimestamp(task.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setApproveModal(task);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectModal(task);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--medos-gray-400)] transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <DetailPanel
                    task={task}
                    onClose={() => setExpandedTask(null)}
                    onApprove={() => setApproveModal(task)}
                    onReject={() => setRejectModal(task)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <Modal
          title="Approve Task"
          onClose={() => {
            setApproveModal(null);
            setApproveNotes("");
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  {approveModal.title}
                </p>
                <p className="text-xs text-emerald-600">
                  Confidence: {Math.round(approveModal.confidence_score * 100)}%
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1">
                Notes (optional)
              </label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add any notes for the approval..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--medos-gray-300)] text-sm placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirm Approval
              </button>
              <button
                onClick={() => {
                  setApproveModal(null);
                  setApproveNotes("");
                }}
                className="px-4 py-2.5 rounded-lg border border-[var(--medos-gray-300)] text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal
          title="Reject Task"
          onClose={() => {
            setRejectModal(null);
            setRejectReason("");
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {rejectModal.title}
                </p>
                <p className="text-xs text-red-600">
                  This will send the task back to the AI agent for revision.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this task is being rejected..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--medos-gray-300)] text-sm placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="px-4 py-2.5 rounded-lg border border-[var(--medos-gray-300)] text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
