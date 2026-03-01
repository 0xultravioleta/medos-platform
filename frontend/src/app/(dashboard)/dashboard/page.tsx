"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  MOCK_DASHBOARD_STATS,
  MOCK_TODAYS_APPOINTMENTS,
  MOCK_RECENT_ACTIVITY,
} from "@/lib/mock-data";
import type {
  MockAppointment,
  MockRecentActivity,
  MockDashboardStats,
} from "@/lib/mock-data";
import {
  getDashboardStats,
  getTodayAppointments,
  getRecentActivity,
  getApprovalStats,
  type ApprovalStats,
} from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  PlayCircle,
  UserPlus,
  Mic,
  AlertTriangle,
  Activity,
  Timer,
  ChevronRight,
  ChevronDown,
  Users,
  FileCheck,
  Brain,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Eye,
  CheckCircle2,
  Send,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusBadge(status: MockAppointment["status"]) {
  const config: Record<
    MockAppointment["status"],
    { variant: "success" | "info" | "warning" | "default"; label: string; pulse?: boolean }
  > = {
    completed: { variant: "success", label: "Completed" },
    "in-progress": { variant: "info", label: "In Progress", pulse: true },
    confirmed: { variant: "default", label: "Confirmed" },
    pending: { variant: "warning", label: "Pending" },
  };
  const c = config[status];
  return (
    <Badge variant={c.variant} className={c.pulse ? "animate-pulse" : ""}>
      {c.label}
    </Badge>
  );
}

function getActivityIcon(type: MockRecentActivity["type"]) {
  switch (type) {
    case "ai":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
          <Sparkles className="h-4 w-4 text-purple-600" />
        </div>
      );
    case "claim":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
          <DollarSign className="h-4 w-4 text-emerald-600" />
        </div>
      );
    case "appointment":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
          <Calendar className="h-4 w-4 text-blue-600" />
        </div>
      );
    case "alert":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Stat card builder
// ---------------------------------------------------------------------------

type StatCardKey = "patients" | "claims" | "priorAuths" | "aiNotes";

function buildStatsCards(stats: MockDashboardStats) {
  return [
    {
      key: "patients" as StatCardKey,
      label: "Patients Today",
      value: stats.appointmentsToday,
      change: "+12%",
      trend: "up" as const,
      icon: Calendar,
      iconBg: "bg-blue-50",
      iconColor: "text-[#0066FF]",
      expandedBorder: "border-blue-400",
    },
    {
      key: "claims" as StatCardKey,
      label: "Pending Claims",
      value: `$${stats.pendingClaims}`,
      change: "-5%",
      trend: "down" as const,
      icon: DollarSign,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      expandedBorder: "border-emerald-400",
    },
    {
      key: "priorAuths" as StatCardKey,
      label: "Prior Auths",
      value: `${stats.pendingPriorAuths} pending`,
      change: "+3%",
      trend: "up" as const,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      expandedBorder: "border-amber-400",
    },
    {
      key: "aiNotes" as StatCardKey,
      label: "AI Notes Today",
      value: stats.aiNotesGenerated,
      change: "+28%",
      trend: "up" as const,
      icon: Sparkles,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      expandedBorder: "border-purple-400",
    },
  ];
}

// ---------------------------------------------------------------------------
// KPI Drill-Down Panels
// ---------------------------------------------------------------------------

function PatientsDrillDown() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-blue-50/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            Scheduled
          </div>
          <p className="mt-1 text-lg font-bold text-[#0F172A]">18</p>
        </div>
        <div className="rounded-lg bg-amber-50/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            Walk-in
          </div>
          <p className="mt-1 text-lg font-bold text-[#0F172A]">4</p>
        </div>
        <div className="rounded-lg bg-red-50/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <AlertTriangle className="h-3 w-3" />
            Urgent
          </div>
          <p className="mt-1 text-lg font-bold text-[#0F172A]">2</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-gray-400" />
            No-show rate today
          </span>
          <span className="font-medium text-[#0F172A]">4.2%</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
            Busiest hour
          </span>
          <span className="font-medium text-[#0F172A]">10:00-11:00 AM (6 pts)</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          <Clock className="h-3.5 w-3.5" />
          Next available slot: 2:30 PM
        </div>
      </div>
    </div>
  );
}

function ClaimsDrillDown() {
  const payers = [
    { name: "BCBS", amount: "$12.4K", pct: 33 },
    { name: "Medicare", amount: "$9.8K", pct: 26 },
    { name: "Aetna", amount: "$8.2K", pct: 22 },
    { name: "Other", amount: "$7.6K", pct: 19 },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">By Payer</p>
        {payers.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-sm">
            <span className="w-16 text-gray-600">{p.name}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${p.pct}%` }}
              />
            </div>
            <span className="w-14 text-right text-xs font-medium text-[#0F172A]">{p.amount}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            Oldest pending
          </span>
          <span className="font-medium text-[#0F172A]">14 days (CLM-2026-0831)</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-gray-400" />
            Auto-submitted today
          </span>
          <span className="font-medium text-[#0F172A]">8 claims</span>
        </div>
      </div>
      <button
        type="button"
        className="mt-1 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        Submit next batch
      </button>
    </div>
  );
}

function PriorAuthsDrillDown() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-emerald-50/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <CheckCircle2 className="h-3 w-3" />
            Approved today
          </div>
          <p className="mt-1 text-lg font-bold text-emerald-700">3</p>
        </div>
        <div className="rounded-lg bg-amber-50/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Timer className="h-3 w-3" />
            Avg approval
          </div>
          <p className="mt-1 text-lg font-bold text-amber-700">2.4d</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-red-400" />
            AI-flagged likely denials
          </span>
          <span className="font-medium text-red-600">2</span>
        </div>
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <Shield className="h-3.5 w-3.5" />
            High Priority
          </div>
          <Link
            href="/patients/p-002"
            className="mt-1 block text-sm font-medium text-[#0066FF] transition hover:underline"
          >
            James Rodriguez &mdash; MRI Lumbar
          </Link>
        </div>
      </div>
    </div>
  );
}

function AINotesDrillDown() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-purple-50/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Zap className="h-3 w-3" />
            Avg confidence
          </div>
          <p className="mt-1 text-lg font-bold text-purple-700">94.2%</p>
        </div>
        <div className="rounded-lg bg-amber-50/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Eye className="h-3 w-3" />
            Pending review
          </div>
          <p className="mt-1 text-lg font-bold text-amber-700">8</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-gray-400" />
            Auto-signed (&gt;95% conf)
          </span>
          <span className="font-medium text-[#0F172A]">112</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-gray-400" />
            Time saved vs manual
          </span>
          <span className="font-medium text-emerald-600">12.4 hrs</span>
        </div>
      </div>
      <Link
        href="/ai-notes"
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
      >
        <Eye className="h-3.5 w-3.5" />
        View pending reviews
      </Link>
    </div>
  );
}

function getDrillDown(key: StatCardKey) {
  switch (key) {
    case "patients":
      return <PatientsDrillDown />;
    case "claims":
      return <ClaimsDrillDown />;
    case "priorAuths":
      return <PriorAuthsDrillDown />;
    case "aiNotes":
      return <AINotesDrillDown />;
  }
}

// ---------------------------------------------------------------------------
// Sparkline-style mini bar chart for Patient Volume Trend
// ---------------------------------------------------------------------------

function MiniSparkBars() {
  const days = [62, 58, 71, 65, 74, 68, 80];
  const max = Math.max(...days);
  return (
    <div className="flex items-end gap-1 h-8">
      {days.map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-sm bg-blue-400/70 transition-all duration-300"
          style={{ height: `${(v / max) * 100}%` }}
          title={`Day ${i + 1}: ${v} patients`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forecast Row
// ---------------------------------------------------------------------------

function ForecastRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Projected Monthly Revenue */}
      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-5 shadow-sm">
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            <Brain className="h-3 w-3 animate-pulse" />
            AI Forecast
          </span>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Projected Monthly Revenue</p>
        <p className="mt-2 text-2xl font-bold text-[#0F172A]">$312,400</p>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium text-emerald-600">+8.2%</span>
          <span className="text-gray-400">vs last month</span>
        </div>
      </div>

      {/* Predicted Denial Rate */}
      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-red-50/60 via-white to-red-50/30 p-5 shadow-sm">
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
            <Brain className="h-3 w-3 animate-pulse" />
            AI Forecast
          </span>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Predicted Denial Rate EOQ</p>
        <p className="mt-2 text-2xl font-bold text-[#0F172A]">3.8%</p>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium text-emerald-600">Target: &lt;4.0%</span>
          <span className="text-gray-400">on track</span>
        </div>
      </div>

      {/* Patient Volume Trend */}
      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30 p-5 shadow-sm">
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            <Brain className="h-3 w-3 animate-pulse" />
            AI Forecast
          </span>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Patient Volume Trend</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-2xl font-bold text-[#0F172A]">+14%</p>
          <MiniSparkBars />
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-medium text-blue-600">Last 7 days</span>
          <span className="text-gray-400">trending upward</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState<MockDashboardStats>(MOCK_DASHBOARD_STATS);
  const [appointments, setAppointments] = useState<MockAppointment[]>(MOCK_TODAYS_APPOINTMENTS);
  const [activity, setActivity] = useState<MockRecentActivity[]>(MOCK_RECENT_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<StatCardKey | null>(null);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getTodayAppointments(),
      getRecentActivity(),
      getApprovalStats(),
    ]).then(([apiStats, apiAppts, apiActivity, apiApprovals]) => {
      if (apiStats) setStats(apiStats);
      if (apiAppts) setAppointments(apiAppts);
      if (apiActivity) setActivity(apiActivity);
      if (apiApprovals) setApprovalStats(apiApprovals);
      setLoading(false);
    });
  }, []);

  const displayName = user?.name ?? "Dr. Justin";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statsCards = buildStatsCards(stats);

  function handleCardClick(key: StatCardKey) {
    setExpandedCard((prev) => (prev === key ? null : key));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--medos-gray-200)] border-t-[var(--medos-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* 1. Welcome Header                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {getGreeting()}, Dr. {displayName.replace(/^Dr\.?\s*/i, "")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{today}</p>
        </div>

        <div className="flex gap-2">
          <Link href="/patients" className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0055DD]">
            <PlayCircle className="h-4 w-4" />
            Start Visit
          </Link>
          <Link href="/patients" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-gray-50">
            <UserPlus className="h-4 w-4" />
            New Patient
          </Link>
          <Link href="/ai-notes/new" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-gray-50">
            <Mic className="h-4 w-4" />
            AI Scribe
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Interactive Stats Grid                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const isExpanded = expandedCard === stat.key;
          return (
            <div
              key={stat.key}
              className={`rounded-xl border bg-white shadow-sm transition-all duration-300 cursor-pointer
                ${isExpanded ? `${stat.expandedBorder} border-2 shadow-md` : "border-gray-100 hover:shadow-md hover:scale-[1.02]"}
              `}
              onClick={() => handleCardClick(stat.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(stat.key);
                }
              }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-[#0F172A]">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                    >
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span className="font-medium text-emerald-600">
                    {stat.change}
                  </span>
                  <span className="text-gray-400">vs last week</span>
                </div>
              </div>

              {/* Expandable drill-down panel */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                  {getDrillDown(stat.key)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2b. AI Forecast Row                                              */}
      {/* ---------------------------------------------------------------- */}
      <ForecastRow />

      {/* ---------------------------------------------------------------- */}
      {/* 2c. Agent Activity Banner                                        */}
      {/* ---------------------------------------------------------------- */}
      {approvalStats && approvalStats.pending_count > 0 && (
        <Link
          href="/approvals"
          className="group flex items-center justify-between rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 p-4 shadow-sm transition hover:shadow-md hover:border-amber-300"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                {approvalStats.pending_count} AI agent task{approvalStats.pending_count !== 1 ? "s" : ""} awaiting review
              </p>
              <p className="text-xs text-gray-500">
                Avg confidence: {(approvalStats.avg_confidence * 100).toFixed(0)}%
                {approvalStats.by_agent_type && Object.keys(approvalStats.by_agent_type).length > 0 && (
                  <> &middot; {Object.entries(approvalStats.by_agent_type).map(([k, v]) => `${k.replace("_", " ")}: ${v}`).join(", ")}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-amber-700 group-hover:text-amber-800">
            Review now
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 3. Schedule + Activity Feed                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Today's Schedule -- ~60% */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today&apos;s Schedule</CardTitle>
              <span className="text-xs text-gray-400">
                {appointments.length} appointments
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="hidden pb-3 pr-4 sm:table-cell">
                      Visit Type
                    </th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="group">
                      <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-gray-500">
                        {appt.time}
                      </td>
                      <td className="py-3 pr-4">
                        <Link href={`/patients/${appt.patientId}`} className="font-medium text-[#0066FF] transition hover:underline">
                          {appt.patientName}
                        </Link>
                      </td>
                      <td className="hidden py-3 pr-4 text-gray-500 sm:table-cell">
                        {appt.type}
                      </td>
                      <td className="py-3 text-right">
                        {getStatusBadge(appt.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity -- ~40% */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link href="/ai-notes" className="text-xs font-medium text-[#0066FF] transition hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  {getActivityIcon(item.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0F172A]">
                      {item.action}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {item.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {item.time}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 5. Revenue Overview                                              */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {/* Revenue This Month */}
            <div className="flex items-center gap-4 py-4 sm:px-6 sm:py-0 sm:first:pl-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F172A]">
                  {formatCurrency(stats.revenueThisMonth)}
                </p>
                <p className="text-sm text-gray-500">Revenue this month</p>
              </div>
              <ChevronRight className="ml-auto hidden h-5 w-5 text-gray-300 sm:block" />
            </div>

            {/* Denial Rate */}
            <div className="flex items-center gap-4 py-4 sm:px-6 sm:py-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                <Activity className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F172A]">
                  {stats.claimDenialRate}%
                </p>
                <p className="text-sm text-gray-500">Denial rate</p>
              </div>
              <ChevronRight className="ml-auto hidden h-5 w-5 text-gray-300 sm:block" />
            </div>

            {/* Avg Wait Time */}
            <div className="flex items-center gap-4 py-4 sm:px-6 sm:py-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
                <Timer className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F172A]">
                  {stats.avgWaitTime} min
                </p>
                <p className="text-sm text-gray-500">Avg wait time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
