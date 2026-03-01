"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  Bot,
  Check,
  Clock,
  Cloud,
  Cpu,
  Database,
  DollarSign,
  ExternalLink,
  Eye,
  HardDrive,
  Layers,
  MemoryStick,
  Server,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "metrics" | "alerts" | "infra" | "ai" | "cost";
type AlertSeverity = "P1" | "P2" | "P3" | "P4";
type AlertStatus = "firing" | "acknowledged" | "resolved";
type ServiceStatus = "healthy" | "degraded" | "down";

interface ActiveAlert {
  id: string;
  severity: AlertSeverity;
  name: string;
  triggeredAt: string;
  duration: string;
  service: string;
  status: AlertStatus;
}

interface AlertRule {
  id: string;
  metric: string;
  warnThreshold: string;
  critThreshold: string;
  window: string;
  channel: string;
}

interface EcsService {
  name: string;
  cpu: number;
  memory: number;
  tasks: number;
  desiredTasks: number;
  status: ServiceStatus;
  lastDeploy: string;
}

interface AgentQuality {
  name: string;
  tasks: number;
  avgConfidence: number;
  reviewRate: number;
  avgDuration: number;
}

interface TenantCost {
  name: string;
  compute: number;
  storage: number;
  ai: number;
  total: number;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: "metrics", label: "Real-Time Metrics", icon: Activity },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "infra", label: "Infrastructure", icon: Server },
  { key: "ai", label: "AI Observability", icon: Bot },
  { key: "cost", label: "Cost", icon: DollarSign },
];

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; text: string; border: string }> = {
  P1: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  P2: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  P3: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  P4: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

const STATUS_DOT: Record<ServiceStatus, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

// --- Mock Data ---

const TIME_RANGES = ["1h", "6h", "24h", "7d", "30d"];

const LATENCY = { p50: 120, p95: 234, p99: 847 };
const ERROR_RATES = { "5xx": 0.4, "4xx": 2.1 };
const THROUGHPUT = {
  total: 342,
  breakdown: [
    { label: "FHIR", value: 142, color: "bg-teal-400" },
    { label: "AI", value: 28, color: "bg-purple-400" },
    { label: "Billing", value: 67, color: "bg-pink-400" },
    { label: "Scheduling", value: 34, color: "bg-sky-400" },
    { label: "Admin", value: 71, color: "bg-amber-400" },
  ],
};

const ACTIVE_ALERTS: ActiveAlert[] = [
  { id: "ALT-001", severity: "P2", name: "Device Server latency > 2s", triggeredAt: "2026-03-01 08:42", duration: "47m", service: "device-server", status: "firing" },
  { id: "ALT-002", severity: "P3", name: "High memory usage on billing worker", triggeredAt: "2026-03-01 07:15", duration: "2h 14m", service: "billing-worker", status: "firing" },
  { id: "ALT-003", severity: "P4", name: "Failed login attempts spike (12 in 5min)", triggeredAt: "2026-03-01 09:03", duration: "26m", service: "auth-service", status: "firing" },
];

const ALERT_RULES: AlertRule[] = [
  { id: "R1", metric: "API P99 Latency", warnThreshold: "> 800ms", critThreshold: "> 1500ms", window: "5min", channel: "PagerDuty + Slack" },
  { id: "R2", metric: "Error Rate (5xx)", warnThreshold: "> 0.5%", critThreshold: "> 2%", window: "5min", channel: "PagerDuty" },
  { id: "R3", metric: "CPU Utilization", warnThreshold: "> 70%", critThreshold: "> 90%", window: "10min", channel: "Slack" },
  { id: "R4", metric: "Memory Utilization", warnThreshold: "> 75%", critThreshold: "> 90%", window: "10min", channel: "Slack" },
  { id: "R5", metric: "DB Connection Pool", warnThreshold: "> 80%", critThreshold: "> 95%", window: "5min", channel: "PagerDuty + Slack" },
  { id: "R6", metric: "Redis Hit Rate", warnThreshold: "< 80%", critThreshold: "< 60%", window: "15min", channel: "Slack" },
  { id: "R7", metric: "AI Confidence Score", warnThreshold: "< 0.85", critThreshold: "< 0.75", window: "30min", channel: "Slack" },
  { id: "R8", metric: "Failed Auth Attempts", warnThreshold: "> 5/5min", critThreshold: "> 20/5min", window: "5min", channel: "PagerDuty + Slack" },
];

const ECS_SERVICES: EcsService[] = [
  { name: "API Server", cpu: 42, memory: 61, tasks: 3, desiredTasks: 3, status: "healthy", lastDeploy: "2h ago" },
  { name: "Worker", cpu: 28, memory: 74, tasks: 2, desiredTasks: 2, status: "healthy", lastDeploy: "2h ago" },
  { name: "Scheduler", cpu: 12, memory: 38, tasks: 1, desiredTasks: 1, status: "healthy", lastDeploy: "6h ago" },
];

const AGENT_QUALITY: AgentQuality[] = [
  { name: "Clinical Scribe", tasks: 47, avgConfidence: 0.91, reviewRate: 12, avgDuration: 8.2 },
  { name: "Prior Auth", tasks: 13, avgConfidence: 0.88, reviewRate: 23, avgDuration: 14.5 },
  { name: "Denial Mgmt", tasks: 8, avgConfidence: 0.85, reviewRate: 31, avgDuration: 22.1 },
];

const TOKEN_USAGE = { input: 1850000, output: 523000, costToday: 3.80 };

const DAILY_AWS_SPEND = {
  total: 42.17,
  breakdown: [
    { label: "ECS", value: 18.50, color: "bg-sky-400" },
    { label: "RDS", value: 12.30, color: "bg-violet-400" },
    { label: "Redis", value: 4.20, color: "bg-teal-400" },
    { label: "Claude", value: 3.80, color: "bg-purple-400" },
    { label: "S3", value: 1.20, color: "bg-emerald-400" },
    { label: "Other", value: 2.17, color: "bg-gray-400" },
  ],
};

const TENANT_COSTS: TenantCost[] = [
  { name: "Sunshine Orthopedics", compute: 16.40, storage: 2.80, ai: 1.60, total: 20.80 },
  { name: "Palm Beach Dermatology", compute: 12.10, storage: 2.10, ai: 1.40, total: 15.60 },
  { name: "Miami Spine Center", compute: 4.20, storage: 0.90, ai: 0.67, total: 5.77 },
];

// --- Tab Content ---

function RealTimeMetricsTab() {
  const [timeRange, setTimeRange] = useState("24h");

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-1 bg-[var(--medos-gray-100)] rounded-lg p-1 w-fit">
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              timeRange === r
                ? "bg-white text-[var(--medos-primary)] shadow-medos-sm"
                : "text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)]"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* API Performance */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">API Performance</h3>
          <span className="ml-auto text-[10px] text-[var(--medos-gray-400)]">Last {timeRange}</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "P50", value: LATENCY.p50, unit: "ms", status: "healthy" as const },
            { label: "P95", value: LATENCY.p95, unit: "ms", status: "healthy" as const },
            { label: "P99", value: LATENCY.p99, unit: "ms", status: LATENCY.p99 > 800 ? "degraded" as const : "healthy" as const },
          ].map((metric) => (
            <div key={metric.label} className="text-center p-4 rounded-lg bg-[var(--medos-gray-50)] border border-[var(--medos-gray-100)]">
              <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-[var(--medos-navy)]">{metric.value}<span className="text-sm text-[var(--medos-gray-400)] ml-0.5">{metric.unit}</span></p>
              <div className={cn("w-2 h-2 rounded-full mx-auto mt-2", STATUS_DOT[metric.status])} />
            </div>
          ))}
        </div>
      </div>

      {/* Error Rate */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Error Rate</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[var(--medos-gray-700)]">5xx Server Errors</span>
              <span className="text-sm font-bold text-[var(--medos-navy)]">{ERROR_RATES["5xx"]}%</span>
            </div>
            <div className="h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full" style={{ width: `${ERROR_RATES["5xx"] * 10}%` }} />
            </div>
            <p className="text-[10px] text-[var(--medos-gray-400)] mt-1">Threshold: &lt; 1%</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[var(--medos-gray-700)]">4xx Client Errors</span>
              <span className="text-sm font-bold text-[var(--medos-navy)]">{ERROR_RATES["4xx"]}%</span>
            </div>
            <div className="h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${ERROR_RATES["4xx"] * 5}%` }} />
            </div>
            <p className="text-[10px] text-[var(--medos-gray-400)] mt-1">Threshold: &lt; 5%</p>
          </div>
        </div>
      </div>

      {/* Throughput */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Throughput</h3>
          <span className="ml-auto text-lg font-bold text-[var(--medos-navy)]">{THROUGHPUT.total} <span className="text-xs text-[var(--medos-gray-400)] font-medium">req/min</span></span>
        </div>
        <div className="space-y-2.5">
          {THROUGHPUT.breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-20 flex-shrink-0">
                <span className="text-xs font-medium text-[var(--medos-gray-700)]">{item.label}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-5 bg-[var(--medos-gray-100)] rounded-md overflow-hidden">
                  <div
                    className={cn("h-full rounded-md flex items-center px-2", item.color)}
                    style={{ width: `${(item.value / THROUGHPUT.total) * 100}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{item.value}</span>
                  </div>
                </div>
              </div>
              <div className="w-14 flex-shrink-0 text-right">
                <span className="text-[10px] text-[var(--medos-gray-500)]">{Math.round((item.value / THROUGHPUT.total) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsTab() {
  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Bell className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Active Alerts</h3>
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            {ACTIVE_ALERTS.length} active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Severity", "Alert Name", "Triggered At", "Duration", "Service", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {ACTIVE_ALERTS.map((alert) => {
                const sev = SEVERITY_STYLES[alert.severity];
                return (
                  <tr key={alert.id} className="hover:bg-[var(--medos-gray-50)] transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", sev.bg, sev.text, sev.border)}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-gray-900)]">{alert.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)] font-mono">{alert.triggeredAt}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-gray-700)]">{alert.duration}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-700)]">
                        {alert.service}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Firing
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[var(--medos-primary-light)] text-[var(--medos-primary)] hover:bg-[var(--medos-primary)] hover:text-white transition-colors">
                          <Check className="w-3 h-3" />
                          Ack
                        </button>
                        <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-200)] transition-colors">
                          <BellOff className="w-3 h-3" />
                          Snooze
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Shield className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Alert Rules</h3>
          <span className="ml-auto text-xs text-[var(--medos-gray-400)]">{ALERT_RULES.length} configured</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Metric", "Warning", "Critical", "Window", "Channel"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {ALERT_RULES.map((rule) => (
                <tr key={rule.id} className="hover:bg-[var(--medos-gray-50)] transition-colors">
                  <td className="px-4 py-2.5 text-xs font-medium text-[var(--medos-gray-900)]">{rule.metric}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">{rule.warnThreshold}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700">{rule.critThreshold}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--medos-gray-600)]">{rule.window}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--medos-gray-600)]">{rule.channel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfrastructureTab() {
  return (
    <div className="space-y-6">
      {/* ECS Services */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">ECS Services</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ECS_SERVICES.map((svc) => (
            <div key={svc.name} className="rounded-lg border border-[var(--medos-gray-200)] p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", STATUS_DOT[svc.status])} />
                  <span className="text-sm font-semibold text-[var(--medos-gray-900)]">{svc.name}</span>
                </div>
                <span className="text-[10px] text-[var(--medos-gray-400)]">{svc.lastDeploy}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">CPU</span>
                    <span className="text-xs font-bold text-[var(--medos-gray-700)]">{svc.cpu}%</span>
                  </div>
                  <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", svc.cpu > 70 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${svc.cpu}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">Memory</span>
                    <span className="text-xs font-bold text-[var(--medos-gray-700)]">{svc.memory}%</span>
                  </div>
                  <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", svc.memory > 75 ? "bg-amber-400" : "bg-sky-400")} style={{ width: `${svc.memory}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--medos-gray-100)]">
                  <span className="text-[10px] text-[var(--medos-gray-500)]">Tasks</span>
                  <span className="text-xs font-medium text-[var(--medos-gray-700)]">{svc.tasks}/{svc.desiredTasks}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database + Redis + S3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Database */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-[var(--medos-navy)]">PostgreSQL 17</h4>
            <div className={cn("w-2 h-2 rounded-full ml-auto", STATUS_DOT.healthy)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Connection Pool</span>
              <span className="text-xs font-bold text-[var(--medos-gray-900)]">23 / 50</span>
            </div>
            <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
              <div className="h-full bg-violet-400 rounded-full" style={{ width: "46%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Query Latency</span>
              <span className="text-xs font-bold text-[var(--medos-gray-900)]">12ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Active Queries</span>
              <span className="text-xs font-bold text-[var(--medos-gray-900)]">4</span>
            </div>
          </div>
        </div>

        {/* Redis */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-teal-500" />
            <h4 className="text-sm font-semibold text-[var(--medos-navy)]">Redis 7+</h4>
            <div className={cn("w-2 h-2 rounded-full ml-auto", STATUS_DOT.healthy)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Memory</span>
              <span className="text-xs font-bold text-[var(--medos-gray-900)]">1.2 GB / 2 GB</span>
            </div>
            <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full" style={{ width: "60%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Hit Rate</span>
              <span className="text-xs font-bold text-emerald-600">87%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Evictions</span>
              <span className="text-xs font-bold text-[var(--medos-gray-900)]">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Connected Clients</span>
              <span className="text-xs font-bold text-[var(--medos-gray-900)]">12</span>
            </div>
          </div>
        </div>

        {/* S3 */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-[var(--medos-navy)]">S3 Storage</h4>
            <div className={cn("w-2 h-2 rounded-full ml-auto", STATUS_DOT.healthy)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Total Storage</span>
              <span className="text-xs font-bold text-[var(--medos-gray-900)]">3.9 GB</span>
            </div>
            <div className="border-t border-[var(--medos-gray-100)] pt-2 space-y-2">
              <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">Per-Tenant Breakdown</p>
              {[
                { name: "Sunshine Ortho", size: "1.8 GB" },
                { name: "Palm Beach Derm", size: "1.4 GB" },
                { name: "Miami Spine", size: "0.7 GB" },
              ].map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-600)]">{t.name}</span>
                  <span className="text-xs font-medium text-[var(--medos-gray-700)]">{t.size}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiObservabilityTab() {
  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
  };

  return (
    <div className="space-y-6">
      {/* Agent Quality */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Bot className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Agent Quality (Today)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Agent", "Tasks", "Avg Confidence", "Human Review Rate", "Avg Duration"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {AGENT_QUALITY.map((agent) => (
                <tr key={agent.name} className="hover:bg-[var(--medos-gray-50)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[var(--medos-primary)]" />
                      <span className="text-xs font-semibold text-[var(--medos-gray-900)]">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-[var(--medos-gray-900)] tabular-nums">{agent.tasks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold tabular-nums",
                        agent.avgConfidence >= 0.90 ? "text-emerald-600" : agent.avgConfidence >= 0.85 ? "text-amber-600" : "text-red-600"
                      )}>
                        {agent.avgConfidence.toFixed(2)}
                      </span>
                      <div className="w-16 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", agent.avgConfidence >= 0.90 ? "bg-emerald-400" : agent.avgConfidence >= 0.85 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${agent.avgConfidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-bold tabular-nums",
                      agent.reviewRate <= 15 ? "text-emerald-600" : agent.reviewRate <= 25 ? "text-amber-600" : "text-red-600"
                    )}>
                      {agent.reviewRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-700)] tabular-nums">{agent.avgDuration}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Usage + Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Usage */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-semibold text-[var(--medos-navy)]">Token Usage (Today)</h4>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--medos-gray-600)]">Input Tokens</span>
                <span className="text-sm font-bold text-[var(--medos-navy)]">{formatTokens(TOKEN_USAGE.input)}</span>
              </div>
              <div className="h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: "78%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--medos-gray-600)]">Output Tokens</span>
                <span className="text-sm font-bold text-[var(--medos-navy)]">{formatTokens(TOKEN_USAGE.output)}</span>
              </div>
              <div className="h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: "22%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* LLM Cost Tracker */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-[var(--medos-navy)]">LLM Cost Tracker</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Today</span>
              <span className="text-lg font-bold text-[var(--medos-navy)]">${TOKEN_USAGE.costToday.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-600)]">Monthly Projected</span>
              <span className="text-lg font-bold text-[var(--medos-navy)]">$114.00</span>
            </div>
            <div className="pt-2 border-t border-[var(--medos-gray-100)]">
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--medos-primary)] hover:text-[var(--medos-primary-hover)] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View traces in Langfuse
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostDashboardTab() {
  const monthlyProjected = 1265;
  const monthlyBudget = 1500;
  const budgetPct = Math.round((monthlyProjected / monthlyBudget) * 100);

  return (
    <div className="space-y-6">
      {/* Daily AWS Spend */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Daily AWS Spend</h3>
          <span className="ml-auto text-lg font-bold text-[var(--medos-navy)]">${DAILY_AWS_SPEND.total.toFixed(2)}</span>
        </div>
        <div className="space-y-2.5">
          {DAILY_AWS_SPEND.breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-16 flex-shrink-0">
                <span className="text-xs font-medium text-[var(--medos-gray-700)]">{item.label}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-5 bg-[var(--medos-gray-100)] rounded-md overflow-hidden">
                  <div
                    className={cn("h-full rounded-md flex items-center px-2", item.color)}
                    style={{ width: `${(item.value / DAILY_AWS_SPEND.total) * 100}%` }}
                  >
                    {item.value >= 3 && (
                      <span className="text-[10px] font-bold text-white">${item.value.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-xs font-medium text-[var(--medos-gray-600)]">${item.value.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Budget Progress */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Monthly Budget Progress</h3>
        </div>
        <div className="flex items-end gap-4 mb-3">
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase font-medium">Projected</p>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">${monthlyProjected.toLocaleString()}</p>
          </div>
          <p className="text-sm text-[var(--medos-gray-400)] mb-1">of ${monthlyBudget.toLocaleString()} budget</p>
          <span className={cn(
            "ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold",
            budgetPct <= 80 ? "bg-emerald-50 text-emerald-700" : budgetPct <= 95 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
          )}>
            {budgetPct}%
          </span>
        </div>
        <div className="h-4 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", budgetPct <= 80 ? "bg-emerald-400" : budgetPct <= 95 ? "bg-amber-400" : "bg-red-400")}
            style={{ width: `${Math.min(budgetPct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--medos-gray-400)]">
          <span>$0</span>
          <span>${(monthlyBudget / 2).toLocaleString()}</span>
          <span>${monthlyBudget.toLocaleString()}</span>
        </div>
      </div>

      {/* Per-Tenant Cost Allocation */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <DollarSign className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Per-Tenant Cost Allocation (Daily)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Tenant", "Compute", "Storage", "AI/LLM", "Total/Day", "Est. Monthly"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {TENANT_COSTS.map((tenant) => (
                <tr key={tenant.name} className="hover:bg-[var(--medos-gray-50)] transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-[var(--medos-gray-900)]">{tenant.name}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-700)] tabular-nums">${tenant.compute.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-700)] tabular-nums">${tenant.storage.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-700)] tabular-nums">${tenant.ai.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-[var(--medos-navy)] tabular-nums">${tenant.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)] tabular-nums">${(tenant.total * 30).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--medos-gray-200)] bg-[var(--medos-gray-50)]">
                <td className="px-4 py-2.5 text-xs font-bold text-[var(--medos-gray-900)]">Total</td>
                <td className="px-4 py-2.5 text-xs font-bold text-[var(--medos-gray-900)] tabular-nums">
                  ${TENANT_COSTS.reduce((s, t) => s + t.compute, 0).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-xs font-bold text-[var(--medos-gray-900)] tabular-nums">
                  ${TENANT_COSTS.reduce((s, t) => s + t.storage, 0).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-xs font-bold text-[var(--medos-gray-900)] tabular-nums">
                  ${TENANT_COSTS.reduce((s, t) => s + t.ai, 0).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-xs font-bold text-[var(--medos-navy)] tabular-nums">
                  ${TENANT_COSTS.reduce((s, t) => s + t.total, 0).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-xs font-bold text-[var(--medos-gray-900)] tabular-nums">
                  ${(TENANT_COSTS.reduce((s, t) => s + t.total, 0) * 30).toFixed(0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function AdminMonitoringPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("metrics");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Activity className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Platform Monitoring</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Real-time infrastructure, AI, and cost observability
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
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
      {activeTab === "metrics" && <RealTimeMetricsTab />}
      {activeTab === "alerts" && <AlertsTab />}
      {activeTab === "infra" && <InfrastructureTab />}
      {activeTab === "ai" && <AiObservabilityTab />}
      {activeTab === "cost" && <CostDashboardTab />}
    </div>
  );
}
