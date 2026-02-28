"use client";

import { useAuth } from "@/lib/auth-context";
import {
  MOCK_DASHBOARD_STATS,
  MOCK_TODAYS_APPOINTMENTS,
  MOCK_RECENT_ACTIVITY,
} from "@/lib/mock-data";
import type { MockAppointment, MockRecentActivity } from "@/lib/mock-data";
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
// Stat card data
// ---------------------------------------------------------------------------

const statsCards = [
  {
    label: "Patients Today",
    value: MOCK_DASHBOARD_STATS.appointmentsToday,
    change: "+12%",
    trend: "up" as const,
    icon: Calendar,
    iconBg: "bg-blue-50",
    iconColor: "text-[#0066FF]",
  },
  {
    label: "Pending Claims",
    value: `$${MOCK_DASHBOARD_STATS.pendingClaims}`,
    change: "-5%",
    trend: "down" as const,
    icon: DollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    label: "Prior Auths",
    value: `${MOCK_DASHBOARD_STATS.pendingPriorAuths} pending`,
    change: "+3%",
    trend: "up" as const,
    icon: Clock,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    label: "AI Notes Today",
    value: MOCK_DASHBOARD_STATS.aiNotesGenerated,
    change: "+28%",
    trend: "up" as const,
    icon: Sparkles,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();

  const displayName = user?.name ?? "Dr. Di Reze";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0055DD]">
            <PlayCircle className="h-4 w-4" />
            Start Visit
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-gray-50">
            <UserPlus className="h-4 w-4" />
            New Patient
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-gray-50">
            <Mic className="h-4 w-4" />
            AI Scribe
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Stats Grid                                                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-[#0F172A]">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
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
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                {MOCK_TODAYS_APPOINTMENTS.length} appointments
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
                  {MOCK_TODAYS_APPOINTMENTS.map((appt) => (
                    <tr key={appt.id} className="group">
                      <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-gray-500">
                        {appt.time}
                      </td>
                      <td className="py-3 pr-4">
                        <button className="font-medium text-[#0066FF] transition hover:underline">
                          {appt.patientName}
                        </button>
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
              <button className="text-xs font-medium text-[#0066FF] transition hover:underline">
                View all
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {MOCK_RECENT_ACTIVITY.map((item) => (
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
                  {formatCurrency(MOCK_DASHBOARD_STATS.revenueThisMonth)}
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
                  {MOCK_DASHBOARD_STATS.claimDenialRate}%
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
                  {MOCK_DASHBOARD_STATS.avgWaitTime} min
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
