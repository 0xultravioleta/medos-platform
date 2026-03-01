"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  HeartPulse,
  Layers,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Users,
  Zap,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════ */

const SYSTEM_KPIS = [
  {
    label: "System Uptime",
    value: "99.87%",
    target: "> 99.5%",
    status: "healthy" as const,
    icon: Activity,
    since: "Feb 15, 2026",
  },
  {
    label: "API Error Rate",
    value: "0.4%",
    target: "< 1%",
    status: "healthy" as const,
    icon: AlertTriangle,
    detail: "5xx errors",
  },
  {
    label: "P99 Latency",
    value: "847ms",
    target: "< 1s",
    status: "healthy" as const,
    icon: Zap,
    detail: "across all endpoints",
  },
  {
    label: "Active Users",
    value: "23",
    target: "",
    status: "neutral" as const,
    icon: Users,
    detail: "today",
  },
  {
    label: "AI Confidence",
    value: "0.91",
    target: "> 0.90",
    status: "healthy" as const,
    icon: Bot,
    detail: "avg across agents",
  },
];

const PLATFORM_KPIS = [
  {
    label: "MCP Tools",
    value: "44 / 44",
    target: "",
    status: "healthy" as const,
    icon: Server,
    detail: "all online",
  },
  {
    label: "AI Agents",
    value: "3 / 3",
    target: "",
    status: "healthy" as const,
    icon: Bot,
    detail: "active",
  },
  {
    label: "Tenants",
    value: "3",
    target: "",
    status: "neutral" as const,
    icon: Building2,
    detail: "practices onboarded",
  },
  {
    label: "FHIR Resources",
    value: "12,847",
    target: "",
    status: "neutral" as const,
    icon: Database,
    detail: "across all tenants",
  },
  {
    label: "Context Freshness",
    value: "0.82",
    target: "> 0.75",
    status: "healthy" as const,
    icon: RefreshCw,
    detail: "system-wide avg",
  },
];

const MCP_SERVERS = [
  { name: "FHIR Server", tools: 12, status: "healthy" as const, rpm: 142, latency: "420ms" },
  { name: "Scribe Server", tools: 6, status: "healthy" as const, rpm: 28, latency: "890ms" },
  { name: "Billing Server", tools: 8, status: "healthy" as const, rpm: 67, latency: "340ms" },
  { name: "Scheduling", tools: 6, status: "healthy" as const, rpm: 34, latency: "280ms" },
  { name: "Device Server", tools: 8, status: "warning" as const, rpm: 12, latency: "1,240ms" },
  { name: "Context Server", tools: 4, status: "healthy" as const, rpm: 89, latency: "190ms" },
];

const RECENT_EVENTS = [
  { ts: "14:32", type: "agent", detail: "Clinical Scribe processed encounter E-2847", severity: "info" as const },
  { ts: "14:28", type: "user", detail: "Dr. Sarah Chen invited to Sunshine Orthopedics", severity: "info" as const },
  { ts: "14:15", type: "alert", detail: "Device Server latency returned to normal", severity: "success" as const },
  { ts: "13:55", type: "billing", detail: "Batch of 12 claims submitted to Change Healthcare", severity: "info" as const },
  { ts: "13:40", type: "config", detail: "Palm Beach Dermatology updated fee schedule", severity: "info" as const },
  { ts: "13:22", type: "security", detail: "Failed login attempt from 203.0.113.42 blocked", severity: "warning" as const },
  { ts: "13:10", type: "agent", detail: "Prior Auth agent gathered evidence for PA-3421", severity: "info" as const },
  { ts: "12:55", type: "device", detail: "Oura Ring batch: 847 readings ingested for 12 patients", severity: "info" as const },
  { ts: "12:30", type: "system", detail: "Redis cache hit rate: 87% (target: 80%)", severity: "success" as const },
  { ts: "12:00", type: "billing", detail: "Underpayment detected: Aetna claim CLM-2847 ($42.17 short)", severity: "warning" as const },
];

const QUICK_ACTIONS = [
  { label: "Onboard Practice", href: "/admin/tenants", icon: Building2 },
  { label: "View Audit Log", href: "/admin/security", icon: Shield },
  { label: "Run Health Check", href: "/admin/monitoring", icon: HeartPulse },
  { label: "View Alerts", href: "/admin/monitoring", icon: AlertTriangle },
];

const COMPLIANCE_SNAPSHOT = {
  score: 94,
  items: [
    { label: "Access Controls", score: 98, status: "pass" as const },
    { label: "Audit Logging", score: 100, status: "pass" as const },
    { label: "Encryption", score: 95, status: "pass" as const },
    { label: "Backup & Recovery", score: 90, status: "pass" as const },
    { label: "BAAs", score: 100, status: "pass" as const },
    { label: "Risk Assessment", score: 80, status: "warn" as const },
    { label: "Training", score: 70, status: "warn" as const },
  ],
};

const AGENT_PERFORMANCE = [
  { name: "Clinical Scribe", tasks24h: 47, confidence: 0.91, reviewRate: "12%", avgDuration: "8.2s" },
  { name: "Prior Auth", tasks24h: 13, confidence: 0.88, reviewRate: "23%", avgDuration: "14.5s" },
  { name: "Denial Mgmt", tasks24h: 8, confidence: 0.85, reviewRate: "31%", avgDuration: "22.1s" },
];

const COST_DATA = {
  dailySpend: 42.17,
  monthlyProjected: 1265.1,
  monthlyBudget: 1500.0,
  breakdown: [
    { service: "ECS Fargate", cost: 18.5 },
    { service: "RDS PostgreSQL", cost: 12.3 },
    { service: "ElastiCache", cost: 4.2 },
    { service: "Claude API", cost: 3.8 },
    { service: "S3 Storage", cost: 1.2 },
    { service: "Other", cost: 2.17 },
  ],
};

/* ═══════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════ */

const STATUS = {
  healthy: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Healthy" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Warning" },
  critical: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", label: "Critical" },
  neutral: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", label: "" },
};

const EVENT_STYLES: Record<string, { bg: string; text: string }> = {
  agent: { bg: "bg-violet-100", text: "text-violet-700" },
  user: { bg: "bg-blue-100", text: "text-blue-700" },
  alert: { bg: "bg-emerald-100", text: "text-emerald-700" },
  billing: { bg: "bg-amber-100", text: "text-amber-700" },
  config: { bg: "bg-gray-100", text: "text-gray-700" },
  security: { bg: "bg-red-100", text: "text-red-700" },
  device: { bg: "bg-cyan-100", text: "text-cyan-700" },
  system: { bg: "bg-indigo-100", text: "text-indigo-700" },
};

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */

function KPICard({ kpi }: { kpi: (typeof SYSTEM_KPIS)[0] }) {
  const s = STATUS[kpi.status];
  return (
    <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm hover:shadow-medos-md transition-default">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", s.bg)}>
          <kpi.icon className={cn("w-4 h-4", s.text)} />
        </div>
        {kpi.target && (
          <span className="text-[10px] font-medium text-[var(--medos-gray-400)]">
            Target: {kpi.target}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--medos-navy)] tracking-tight">{kpi.value}</p>
      <p className="text-xs text-[var(--medos-gray-500)] mt-0.5">{kpi.label}</p>
      {kpi.detail && (
        <p className="text-[10px] text-[var(--medos-gray-400)] mt-1">{kpi.detail}</p>
      )}
    </div>
  );
}

function ServerCard({ server }: { server: (typeof MCP_SERVERS)[0] }) {
  const s = STATUS[server.status];
  return (
    <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm hover:shadow-medos-md transition-default">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-[var(--medos-navy)]">{server.name}</h4>
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full", s.dot)} />
          <span className={cn("text-[10px] font-medium", s.text)}>{s.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <p className="text-lg font-bold text-[var(--medos-navy)]">{server.tools}</p>
          <p className="text-[10px] text-[var(--medos-gray-400)]">tools</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--medos-navy)]">{server.rpm}</p>
          <p className="text-[10px] text-[var(--medos-gray-400)]">req/min</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[var(--medos-navy)]">{server.latency}</p>
          <p className="text-[10px] text-[var(--medos-gray-400)]">P99</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════ */

export default function AdminDashboardPage() {
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }

  const budgetPct = Math.round((COST_DATA.monthlyProjected / COST_DATA.monthlyBudget) * 100);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--medos-gray-500)] mt-0.5">
            Platform overview &middot; Last updated 2 min ago
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-medium hover:bg-[var(--medos-primary-dark)] transition-default shadow-medos-sm"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Row 1: System Health KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--medos-gray-400)] uppercase tracking-wider mb-3">
          System Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {SYSTEM_KPIS.map((k) => (
            <KPICard key={k.label} kpi={k} />
          ))}
        </div>
      </section>

      {/* Row 2: Platform Metrics */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--medos-gray-400)] uppercase tracking-wider mb-3">
          Platform Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PLATFORM_KPIS.map((k) => (
            <KPICard key={k.label} kpi={k} />
          ))}
        </div>
      </section>

      {/* Row 3: MCP Server Health Grid */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--medos-gray-400)] uppercase tracking-wider mb-3">
          MCP Server Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MCP_SERVERS.map((s) => (
            <ServerCard key={s.name} server={s} />
          ))}
        </div>
      </section>

      {/* Row 4: Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-5 shadow-medos-sm">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-primary)] transition-default group"
              >
                <a.icon className="w-4 h-4 text-[var(--medos-gray-400)] group-hover:text-[var(--medos-primary)]" />
                <span className="flex-1">{a.label}</span>
                <ChevronRight className="w-3 h-3 text-[var(--medos-gray-300)]" />
              </a>
            ))}
          </div>
        </div>

        {/* AI Agent Performance */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-5 shadow-medos-sm">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">AI Agent Performance</h3>
          <div className="space-y-3">
            {AGENT_PERFORMANCE.map((a) => (
              <div key={a.name} className="p-3 rounded-lg bg-[var(--medos-gray-50)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--medos-navy)]">{a.name}</span>
                  <span className="text-xs font-mono text-emerald-600">{a.confidence}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--medos-gray-500)]">
                  <div>
                    <span className="font-bold text-[var(--medos-navy)]">{a.tasks24h}</span> tasks
                  </div>
                  <div>
                    <span className="font-bold text-[var(--medos-navy)]">{a.reviewRate}</span> review
                  </div>
                  <div>
                    <span className="font-bold text-[var(--medos-navy)]">{a.avgDuration}</span> avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HIPAA Compliance Snapshot */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-5 shadow-medos-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">HIPAA Compliance</h3>
            <span className="text-lg font-bold text-emerald-600">{COMPLIANCE_SNAPSHOT.score}/100</span>
          </div>
          <div className="space-y-2">
            {COMPLIANCE_SNAPSHOT.items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    item.status === "pass" ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
                <span className="text-xs text-[var(--medos-gray-600)] flex-1">{item.label}</span>
                <span
                  className={cn(
                    "text-xs font-mono",
                    item.score >= 90 ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {item.score}
                </span>
              </div>
            ))}
          </div>
          <a
            href="/admin/security"
            className="flex items-center gap-1 mt-3 text-xs text-[var(--medos-primary)] font-medium hover:underline"
          >
            Full compliance report <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Row 5: Cost + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Dashboard */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-5 shadow-medos-sm">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Cost Overview</h3>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[var(--medos-gray-500)] mb-1">
              <span>Monthly Projected</span>
              <span>${COST_DATA.monthlyProjected.toFixed(0)} / ${COST_DATA.monthlyBudget.toFixed(0)}</span>
            </div>
            <div className="w-full bg-[var(--medos-gray-100)] rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  budgetPct > 90 ? "bg-red-500" : budgetPct > 75 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--medos-gray-400)] mt-1">{budgetPct}% of budget</p>
          </div>
          <div className="space-y-1.5">
            {COST_DATA.breakdown.map((b) => (
              <div key={b.service} className="flex justify-between text-xs">
                <span className="text-[var(--medos-gray-600)]">{b.service}</span>
                <span className="font-mono text-[var(--medos-navy)]">${b.cost.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs font-semibold border-t border-[var(--medos-gray-100)] pt-1.5 mt-1.5">
              <span className="text-[var(--medos-navy)]">Daily Total</span>
              <span className="font-mono text-[var(--medos-navy)]">${COST_DATA.dailySpend.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--medos-gray-200)] p-5 shadow-medos-sm">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {RECENT_EVENTS.map((e, i) => {
              const style = EVENT_STYLES[e.type] || EVENT_STYLES.system;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--medos-gray-50)] transition-default"
                >
                  <span className="text-xs font-mono text-[var(--medos-gray-400)] mt-0.5 w-10 flex-shrink-0">
                    {e.ts}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase flex-shrink-0 mt-0.5",
                      style.bg,
                      style.text
                    )}
                  >
                    {e.type}
                  </span>
                  <span className="text-xs text-[var(--medos-gray-700)] leading-relaxed">{e.detail}</span>
                  {e.severity === "warning" && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                  {e.severity === "success" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
