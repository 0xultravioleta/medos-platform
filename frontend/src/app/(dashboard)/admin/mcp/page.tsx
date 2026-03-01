"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Server,
  Wrench,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Search,
  Shield,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Zap,
} from "lucide-react";

// --- Types ---

type TabKey = "servers" | "tools" | "gateway" | "analytics";
type HealthStatus = "healthy" | "degraded" | "down";
type CircuitState = "closed" | "half-open" | "open";
type PhiLevel = "yes" | "limited" | "no";

interface HealthCheck {
  timestamp: string;
  status: "ok" | "timeout" | "error";
  latencyMs: number;
}

interface McpServerRow {
  name: string;
  tools: number;
  status: HealthStatus;
  requests24h: number;
  errors24h: number;
  p99Latency: number;
  circuitBreaker: CircuitState;
  healthChecks: HealthCheck[];
}

interface ToolEntry {
  name: string;
  phiLevel: PhiLevel;
  approvalRequired: boolean;
  enabled: boolean;
  calls24h: number;
  avgLatency: number;
}

interface ServerTools {
  serverName: string;
  tools: ToolEntry[];
}

interface GatewayConfig {
  label: string;
  value: string;
  description: string;
  icon: typeof Shield;
}

interface BarEntry {
  name: string;
  value: number;
  unit: string;
}

// --- Mock Data ---

const MOCK_SERVERS: McpServerRow[] = [
  {
    name: "FHIR",
    tools: 12,
    status: "healthy",
    requests24h: 14823,
    errors24h: 12,
    p99Latency: 420,
    circuitBreaker: "closed",
    healthChecks: [
      { timestamp: "2026-03-01T09:30:00Z", status: "ok", latencyMs: 12 },
      { timestamp: "2026-03-01T09:25:00Z", status: "ok", latencyMs: 15 },
      { timestamp: "2026-03-01T09:20:00Z", status: "ok", latencyMs: 11 },
      { timestamp: "2026-03-01T09:15:00Z", status: "ok", latencyMs: 14 },
      { timestamp: "2026-03-01T09:10:00Z", status: "ok", latencyMs: 13 },
    ],
  },
  {
    name: "Scribe",
    tools: 6,
    status: "healthy",
    requests24h: 2847,
    errors24h: 3,
    p99Latency: 890,
    circuitBreaker: "closed",
    healthChecks: [
      { timestamp: "2026-03-01T09:30:00Z", status: "ok", latencyMs: 18 },
      { timestamp: "2026-03-01T09:25:00Z", status: "ok", latencyMs: 22 },
      { timestamp: "2026-03-01T09:20:00Z", status: "ok", latencyMs: 19 },
      { timestamp: "2026-03-01T09:15:00Z", status: "ok", latencyMs: 21 },
      { timestamp: "2026-03-01T09:10:00Z", status: "ok", latencyMs: 20 },
    ],
  },
  {
    name: "Billing",
    tools: 8,
    status: "healthy",
    requests24h: 6912,
    errors24h: 8,
    p99Latency: 340,
    circuitBreaker: "closed",
    healthChecks: [
      { timestamp: "2026-03-01T09:30:00Z", status: "ok", latencyMs: 9 },
      { timestamp: "2026-03-01T09:25:00Z", status: "ok", latencyMs: 10 },
      { timestamp: "2026-03-01T09:20:00Z", status: "ok", latencyMs: 8 },
      { timestamp: "2026-03-01T09:15:00Z", status: "ok", latencyMs: 11 },
      { timestamp: "2026-03-01T09:10:00Z", status: "ok", latencyMs: 9 },
    ],
  },
  {
    name: "Scheduling",
    tools: 6,
    status: "healthy",
    requests24h: 3421,
    errors24h: 2,
    p99Latency: 280,
    circuitBreaker: "closed",
    healthChecks: [
      { timestamp: "2026-03-01T09:30:00Z", status: "ok", latencyMs: 7 },
      { timestamp: "2026-03-01T09:25:00Z", status: "ok", latencyMs: 8 },
      { timestamp: "2026-03-01T09:20:00Z", status: "ok", latencyMs: 6 },
      { timestamp: "2026-03-01T09:15:00Z", status: "ok", latencyMs: 9 },
      { timestamp: "2026-03-01T09:10:00Z", status: "ok", latencyMs: 7 },
    ],
  },
  {
    name: "Device",
    tools: 8,
    status: "degraded",
    requests24h: 1204,
    errors24h: 47,
    p99Latency: 1240,
    circuitBreaker: "half-open",
    healthChecks: [
      { timestamp: "2026-03-01T09:30:00Z", status: "timeout", latencyMs: 5000 },
      { timestamp: "2026-03-01T09:25:00Z", status: "ok", latencyMs: 320 },
      { timestamp: "2026-03-01T09:20:00Z", status: "timeout", latencyMs: 5000 },
      { timestamp: "2026-03-01T09:15:00Z", status: "error", latencyMs: 45 },
      { timestamp: "2026-03-01T09:10:00Z", status: "ok", latencyMs: 280 },
    ],
  },
  {
    name: "Context",
    tools: 4,
    status: "healthy",
    requests24h: 8934,
    errors24h: 5,
    p99Latency: 190,
    circuitBreaker: "closed",
    healthChecks: [
      { timestamp: "2026-03-01T09:30:00Z", status: "ok", latencyMs: 5 },
      { timestamp: "2026-03-01T09:25:00Z", status: "ok", latencyMs: 4 },
      { timestamp: "2026-03-01T09:20:00Z", status: "ok", latencyMs: 6 },
      { timestamp: "2026-03-01T09:15:00Z", status: "ok", latencyMs: 5 },
      { timestamp: "2026-03-01T09:10:00Z", status: "ok", latencyMs: 4 },
    ],
  },
];

const MOCK_SERVER_TOOLS: ServerTools[] = [
  {
    serverName: "FHIR",
    tools: [
      { name: "fhir_read", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 4212, avgLatency: 45 },
      { name: "fhir_search", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 3890, avgLatency: 120 },
      { name: "fhir_create", phiLevel: "yes", approvalRequired: true, enabled: true, calls24h: 1204, avgLatency: 180 },
      { name: "fhir_update", phiLevel: "yes", approvalRequired: true, enabled: true, calls24h: 982, avgLatency: 160 },
      { name: "fhir_delete", phiLevel: "yes", approvalRequired: true, enabled: true, calls24h: 45, avgLatency: 90 },
      { name: "fhir_validate", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 1520, avgLatency: 35 },
      { name: "fhir_batch", phiLevel: "yes", approvalRequired: true, enabled: true, calls24h: 312, avgLatency: 450 },
      { name: "fhir_history", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 678, avgLatency: 200 },
      { name: "fhir_search_patient", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 890, avgLatency: 95 },
      { name: "fhir_get_encounter", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 542, avgLatency: 65 },
      { name: "fhir_get_condition", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 321, avgLatency: 55 },
      { name: "fhir_get_observation", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 227, avgLatency: 70 },
    ],
  },
  {
    serverName: "Scribe",
    tools: [
      { name: "scribe_transcribe", phiLevel: "yes", approvalRequired: true, enabled: true, calls24h: 847, avgLatency: 2400 },
      { name: "scribe_generate_soap", phiLevel: "yes", approvalRequired: true, enabled: true, calls24h: 812, avgLatency: 3200 },
      { name: "scribe_suggest_codes", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 795, avgLatency: 890 },
      { name: "scribe_extract_entities", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 210, avgLatency: 1100 },
      { name: "scribe_summarize", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 143, avgLatency: 1800 },
      { name: "scribe_translate", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 40, avgLatency: 950 },
    ],
  },
  {
    serverName: "Billing",
    tools: [
      { name: "billing_submit_claim", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 1423, avgLatency: 280 },
      { name: "billing_scrub_claim", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 1890, avgLatency: 150 },
      { name: "billing_check_eligibility", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 1245, avgLatency: 320 },
      { name: "billing_parse_835", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 567, avgLatency: 200 },
      { name: "billing_post_payment", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 423, avgLatency: 180 },
      { name: "billing_detect_underpayment", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 312, avgLatency: 250 },
      { name: "billing_claims_analytics", phiLevel: "no", approvalRequired: false, enabled: true, calls24h: 678, avgLatency: 420 },
      { name: "billing_generate_837p", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 374, avgLatency: 350 },
    ],
  },
  {
    serverName: "Scheduling",
    tools: [
      { name: "scheduling_available_slots", phiLevel: "no", approvalRequired: false, enabled: true, calls24h: 1245, avgLatency: 85 },
      { name: "scheduling_book", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 892, avgLatency: 120 },
      { name: "scheduling_cancel", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 234, avgLatency: 95 },
      { name: "scheduling_reschedule", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 312, avgLatency: 130 },
      { name: "scheduling_waitlist", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 156, avgLatency: 70 },
      { name: "scheduling_provider_schedule", phiLevel: "no", approvalRequired: false, enabled: true, calls24h: 582, avgLatency: 65 },
    ],
  },
  {
    serverName: "Device",
    tools: [
      { name: "device_ingest_reading", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 312, avgLatency: 180 },
      { name: "device_get_readings", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 245, avgLatency: 220 },
      { name: "device_check_alerts", phiLevel: "no", approvalRequired: false, enabled: true, calls24h: 198, avgLatency: 95 },
      { name: "device_register", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 12, avgLatency: 150 },
      { name: "device_deregister", phiLevel: "limited", approvalRequired: true, enabled: true, calls24h: 3, avgLatency: 120 },
      { name: "device_get_devices", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 178, avgLatency: 75 },
      { name: "device_batch_readings", phiLevel: "limited", approvalRequired: false, enabled: true, calls24h: 145, avgLatency: 650 },
      { name: "device_get_patient_vitals", phiLevel: "yes", approvalRequired: false, enabled: true, calls24h: 111, avgLatency: 280 },
    ],
  },
  {
    serverName: "Context",
    tools: [
      { name: "context_get_freshness", phiLevel: "no", approvalRequired: false, enabled: true, calls24h: 4521, avgLatency: 25 },
      { name: "context_force_refresh", phiLevel: "no", approvalRequired: true, enabled: true, calls24h: 312, avgLatency: 450 },
      { name: "context_get_staleness_report", phiLevel: "no", approvalRequired: false, enabled: true, calls24h: 2890, avgLatency: 85 },
      { name: "context_get_dependency_graph", phiLevel: "no", approvalRequired: false, enabled: true, calls24h: 1211, avgLatency: 120 },
    ],
  },
];

const GATEWAY_CONFIGS: GatewayConfig[] = [
  { label: "Global Rate Limit", value: "100 req/s", description: "Maximum requests per second across all tenants", icon: Zap },
  { label: "Circuit Breaker Threshold", value: "50% / 30s", description: "Error rate threshold over sliding window", icon: AlertTriangle },
  { label: "Recovery Period", value: "60s half-open", description: "Time before circuit moves from open to half-open", icon: Clock },
  { label: "Audit Log Level", value: "Full", description: "All tool calls logged with request/response payloads", icon: Shield },
  { label: "PHI Screening", value: "Enabled", description: "Automatic PHI detection in tool responses", icon: Shield },
  { label: "Default Timeout", value: "30s", description: "Maximum time for any single tool execution", icon: Clock },
  { label: "Max Concurrent per Agent", value: "10", description: "Parallel tool calls allowed per agent instance", icon: Activity },
];

const MOST_CALLED_TOOLS: BarEntry[] = [
  { name: "context_get_freshness", value: 4521, unit: "calls" },
  { name: "fhir_read", value: 4212, unit: "calls" },
  { name: "fhir_search", value: 3890, unit: "calls" },
  { name: "context_get_staleness_report", value: 2890, unit: "calls" },
  { name: "billing_scrub_claim", value: 1890, unit: "calls" },
  { name: "fhir_validate", value: 1520, unit: "calls" },
  { name: "billing_submit_claim", value: 1423, unit: "calls" },
  { name: "scheduling_available_slots", value: 1245, unit: "calls" },
  { name: "billing_check_eligibility", value: 1245, unit: "calls" },
  { name: "context_get_dependency_graph", value: 1211, unit: "calls" },
];

const SLOWEST_TOOLS: BarEntry[] = [
  { name: "scribe_generate_soap", value: 3200, unit: "ms" },
  { name: "scribe_transcribe", value: 2400, unit: "ms" },
  { name: "scribe_summarize", value: 1800, unit: "ms" },
  { name: "scribe_extract_entities", value: 1100, unit: "ms" },
  { name: "scribe_translate", value: 950, unit: "ms" },
  { name: "scribe_suggest_codes", value: 890, unit: "ms" },
  { name: "device_batch_readings", value: 650, unit: "ms" },
  { name: "context_force_refresh", value: 450, unit: "ms" },
  { name: "fhir_batch", value: 450, unit: "ms" },
  { name: "billing_claims_analytics", value: 420, unit: "ms" },
];

const ERROR_PRONE_TOOLS: BarEntry[] = [
  { name: "device_ingest_reading", value: 18, unit: "errors" },
  { name: "device_batch_readings", value: 12, unit: "errors" },
  { name: "device_check_alerts", value: 9, unit: "errors" },
  { name: "billing_submit_claim", value: 5, unit: "errors" },
  { name: "fhir_create", value: 4, unit: "errors" },
  { name: "fhir_batch", value: 3, unit: "errors" },
  { name: "scribe_transcribe", value: 3, unit: "errors" },
  { name: "billing_check_eligibility", value: 2, unit: "errors" },
  { name: "context_force_refresh", value: 2, unit: "errors" },
  { name: "scheduling_book", value: 1, unit: "errors" },
];

type HeatLevel = "high" | "med" | "low" | "none";
const HEATMAP_DATA: { agent: string; tools: Record<string, HeatLevel> }[] = [
  {
    agent: "Clinical Scribe",
    tools: {
      fhir_read: "high", fhir_search: "high", fhir_create: "med", scribe_transcribe: "high",
      scribe_generate_soap: "high", billing_scrub_claim: "none", scheduling_book: "none",
      device_get_readings: "low", context_get_freshness: "med",
    },
  },
  {
    agent: "Prior Auth",
    tools: {
      fhir_read: "high", fhir_search: "med", fhir_create: "low", scribe_transcribe: "none",
      scribe_generate_soap: "none", billing_scrub_claim: "high", scheduling_book: "low",
      device_get_readings: "none", context_get_freshness: "med",
    },
  },
  {
    agent: "Denial Mgmt",
    tools: {
      fhir_read: "med", fhir_search: "high", fhir_create: "low", scribe_transcribe: "none",
      scribe_generate_soap: "none", billing_scrub_claim: "high", scheduling_book: "none",
      device_get_readings: "none", context_get_freshness: "low",
    },
  },
];

const HEATMAP_TOOLS = [
  "fhir_read", "fhir_search", "fhir_create", "scribe_transcribe",
  "scribe_generate_soap", "billing_scrub_claim", "scheduling_book",
  "device_get_readings", "context_get_freshness",
];

// --- Helpers ---

const TABS = [
  { key: "servers" as const, label: "Server Overview", icon: Server },
  { key: "tools" as const, label: "Tool Inventory", icon: Wrench },
  { key: "gateway" as const, label: "Gateway Config", icon: Settings },
  { key: "analytics" as const, label: "Usage Analytics", icon: BarChart3 },
];

const STATUS_MAP: Record<HealthStatus, { label: string; dot: string }> = {
  healthy: { label: "Healthy", dot: "bg-emerald-500" },
  degraded: { label: "Degraded", dot: "bg-amber-500" },
  down: { label: "Down", dot: "bg-red-500" },
};

const CIRCUIT_MAP: Record<CircuitState, { label: string; style: string }> = {
  closed: { label: "Closed", style: "bg-emerald-50 text-emerald-700" },
  "half-open": { label: "Half-Open", style: "bg-amber-50 text-amber-700" },
  open: { label: "Open", style: "bg-red-50 text-red-700" },
};

const PHI_MAP: Record<PhiLevel, { label: string; style: string }> = {
  yes: { label: "PHI", style: "bg-red-50 text-red-700" },
  limited: { label: "Limited", style: "bg-amber-50 text-amber-700" },
  no: { label: "None", style: "bg-emerald-50 text-emerald-700" },
};

const HEAT_COLORS: Record<HeatLevel, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-100", text: "text-red-700", label: "High" },
  med: { bg: "bg-amber-100", text: "text-amber-700", label: "Med" },
  low: { bg: "bg-blue-100", text: "text-blue-700", label: "Low" },
  none: { bg: "bg-[var(--medos-gray-50)]", text: "text-[var(--medos-gray-400)]", label: "--" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

// --- Tab Components ---

function ServerOverviewTab() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">
        {MOCK_SERVERS.length} MCP servers &middot; {MOCK_SERVERS.reduce((s, r) => s + r.tools, 0)} tools total
      </p>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3 w-8" />
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Server</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Tools</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Requests (24h)</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Errors (24h)</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">P99 Latency</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Circuit Breaker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {MOCK_SERVERS.map((server) => {
                const isExpanded = expanded.has(server.name);
                const st = STATUS_MAP[server.status];
                const cb = CIRCUIT_MAP[server.circuitBreaker];
                return (
                  <>
                    <tr
                      key={server.name}
                      className="hover:bg-[var(--medos-gray-50)] transition-all cursor-pointer"
                      onClick={() => toggle(server.name)}
                    >
                      <td className="px-6 py-3.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-[var(--medos-primary)]" />
                          <span className="text-sm font-semibold text-[var(--medos-navy)]">{server.name} MCP Server</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[var(--medos-gray-700)] text-center tabular-nums">{server.tools}</td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", st.dot)} />
                          <span className={cn("text-xs font-medium", server.status === "healthy" ? "text-emerald-700" : server.status === "degraded" ? "text-amber-700" : "text-red-700")}>
                            {st.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono">
                        {server.requests24h.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={cn("text-sm tabular-nums font-mono", server.errors24h > 20 ? "text-red-600 font-semibold" : "text-[var(--medos-gray-700)]")}>
                          {server.errors24h}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={cn("text-sm tabular-nums font-mono", server.p99Latency > 1000 ? "text-red-600 font-semibold" : "text-[var(--medos-gray-700)]")}>
                          {server.p99Latency}ms
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", cb.style)}>
                          {cb.label}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${server.name}-checks`}>
                        <td colSpan={8} className="px-6 py-3 bg-[var(--medos-gray-50)]">
                          <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Last 5 Health Checks</p>
                          <div className="flex items-center gap-3">
                            {server.healthChecks.map((hc, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                {hc.status === "ok" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : hc.status === "timeout" ? (
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                )}
                                <span className="text-[var(--medos-gray-600)] font-mono tabular-nums">{formatTime(hc.timestamp)}</span>
                                <span className="text-[var(--medos-gray-400)]">({hc.latencyMs}ms)</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ToolInventoryTab() {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set(["FHIR"]));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleServer = (name: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const filteredServerTools = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_SERVER_TOOLS;
    const q = searchQuery.toLowerCase();
    return MOCK_SERVER_TOOLS.map((st) => ({
      ...st,
      tools: st.tools.filter((t) => t.name.toLowerCase().includes(q)),
    })).filter((st) => st.tools.length > 0);
  }, [searchQuery]);

  const totalTools = MOCK_SERVER_TOOLS.reduce((s, st) => s + st.tools.length, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
          />
        </div>
        <p className="text-sm text-[var(--medos-gray-500)]">{totalTools} tools across {MOCK_SERVER_TOOLS.length} servers</p>
      </div>

      {/* Server sections */}
      <div className="space-y-3">
        {filteredServerTools.map((st) => {
          const isExpanded = expandedServers.has(st.serverName);
          return (
            <div key={st.serverName} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
              <button
                onClick={() => toggleServer(st.serverName)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--medos-gray-50)] transition-all"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" /> : <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />}
                  <Server className="w-4 h-4 text-[var(--medos-primary)]" />
                  <span className="text-sm font-semibold text-[var(--medos-navy)]">{st.serverName} MCP Server</span>
                  <span className="text-xs text-[var(--medos-gray-500)]">({st.tools.length} tools)</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--medos-gray-100)]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--medos-gray-100)]">
                        <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-2.5">Tool Name</th>
                        <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">PHI Level</th>
                        <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Approval</th>
                        <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Status</th>
                        <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Calls (24h)</th>
                        <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--medos-gray-100)]">
                      {st.tools.map((tool) => {
                        const phi = PHI_MAP[tool.phiLevel];
                        return (
                          <tr key={tool.name} className="hover:bg-[var(--medos-gray-50)] transition-all">
                            <td className="px-6 py-2.5 text-sm font-mono text-[var(--medos-gray-900)]">{tool.name}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", phi.style)}>
                                {phi.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {tool.approvalRequired ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Yes</span>
                              ) : (
                                <span className="text-xs text-[var(--medos-gray-400)]">No</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", tool.enabled ? "bg-emerald-50 text-emerald-700" : "bg-[var(--medos-gray-100)] text-[var(--medos-gray-500)]")}>
                                {tool.enabled ? "Enabled" : "Disabled"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono">{tool.calls24h.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono">{tool.avgLatency}ms</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GatewayConfigTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">MCP Gateway configuration parameters</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GATEWAY_CONFIGS.map((config) => {
          const ConfigIcon = config.icon;
          return (
            <div key={config.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--medos-primary-light)]">
                    <ConfigIcon className="w-4 h-4 text-[var(--medos-primary)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">{config.label}</p>
                </div>
                <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--medos-gray-200)] text-[var(--medos-gray-500)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-700)] text-xs font-medium transition-all">
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              </div>
              <p className="text-2xl font-bold text-[var(--medos-navy)] mb-2 tabular-nums">{config.value}</p>
              <p className="text-xs text-[var(--medos-gray-500)]">{config.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, maxValue, color }: { data: BarEntry[]; maxValue: number; color: string }) {
  return (
    <div className="space-y-2">
      {data.map((entry) => (
        <div key={entry.name} className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--medos-gray-700)] w-48 truncate flex-shrink-0" title={entry.name}>
            {entry.name}
          </span>
          <div className="flex-1 h-5 rounded bg-[var(--medos-gray-100)] overflow-hidden">
            <div
              className={cn("h-full rounded transition-all", color)}
              style={{ width: `${Math.max((entry.value / maxValue) * 100, 2)}%` }}
            />
          </div>
          <span className="text-xs font-mono text-[var(--medos-gray-600)] w-20 text-right tabular-nums flex-shrink-0">
            {entry.value.toLocaleString()} {entry.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function UsageAnalyticsTab() {
  return (
    <div className="space-y-6">
      {/* Bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Most Called Tools (24h)</h3>
          <HorizontalBarChart data={MOST_CALLED_TOOLS} maxValue={4521} color="bg-[var(--medos-primary)]" />
        </div>

        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Slowest Tools (Avg Latency)</h3>
          <HorizontalBarChart data={SLOWEST_TOOLS} maxValue={3200} color="bg-amber-400" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Error-Prone Tools (24h)</h3>
        <HorizontalBarChart data={ERROR_PRONE_TOOLS} maxValue={18} color="bg-red-400" />
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Agent-Tool Usage Heatmap</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-3 py-2">Agent</th>
                {HEATMAP_TOOLS.map((tool) => (
                  <th key={tool} className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-2 py-2">
                    <span className="writing-mode-vertical block transform -rotate-45 origin-center whitespace-nowrap">{tool}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {HEATMAP_DATA.map((row) => (
                <tr key={row.agent}>
                  <td className="px-3 py-2 text-sm font-medium text-[var(--medos-gray-900)] whitespace-nowrap">{row.agent}</td>
                  {HEATMAP_TOOLS.map((tool) => {
                    const level = row.tools[tool] || "none";
                    const heat = HEAT_COLORS[level];
                    return (
                      <td key={tool} className="px-2 py-2 text-center">
                        <span className={cn("inline-flex items-center justify-center w-10 h-7 rounded text-[10px] font-semibold", heat.bg, heat.text)}>
                          {heat.label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--medos-gray-100)]">
          <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Legend:</span>
          {(["high", "med", "low", "none"] as HeatLevel[]).map((level) => {
            const heat = HEAT_COLORS[level];
            return (
              <div key={level} className="flex items-center gap-1.5">
                <span className={cn("inline-flex items-center justify-center w-6 h-4 rounded text-[10px] font-semibold", heat.bg, heat.text)}>
                  {heat.label}
                </span>
                <span className="text-[10px] text-[var(--medos-gray-500)] capitalize">{level === "none" ? "No usage" : level}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function McpServersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("servers");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Server className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">MCP Servers</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Model Context Protocol server management, tool inventory, and usage analytics
          </p>
        </div>
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
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all",
                  isActive
                    ? "border-[var(--medos-primary)] text-[var(--medos-primary)]"
                    : "border-transparent text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)] hover:border-[var(--medos-gray-300)]"
                )}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "servers" && <ServerOverviewTab />}
      {activeTab === "tools" && <ToolInventoryTab />}
      {activeTab === "gateway" && <GatewayConfigTab />}
      {activeTab === "analytics" && <UsageAnalyticsTab />}
    </div>
  );
}
