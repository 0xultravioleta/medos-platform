"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Cog,
  Database,
  RefreshCw,
  Radio,
  ShieldCheck,
  Zap,
  HardDrive,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Trash2,
  RotateCcw,
  Cpu,
  Activity,
  Server,
} from "lucide-react";

// --- Types ---

type TabKey = "cache" | "freshness" | "eventbus" | "ratelimit";
type PriorityLevel = "critical" | "high" | "medium" | "low";

interface CacheLayer {
  name: string;
  backend: string;
  capacityCap: string;
  capacityUsed: string;
  usedPct: number;
  hitRate: number;
  ttl: string;
  eviction: string;
  icon: typeof Zap;
  iconBg: string;
  iconColor: string;
}

interface ContextFreshness {
  contextType: string;
  threshold: number;
  autoRefreshPolicy: string;
  ttlHot: string;
  ttlWarm: string;
  priority: PriorityLevel;
}

interface EventStream {
  pattern: string;
  consumerGroups: number;
  messages24h: number;
  failed: number;
  dlqCount: number;
  dlqEntries: { messageId: string; error: string; timestamp: string }[];
}

interface RateLimitRow {
  category: string;
  burstLimit: number;
  sustainedLimit: string;
  window: string;
  perTenantOverride: string;
}

// --- Mock Data ---

const MOCK_CACHE_LAYERS: CacheLayer[] = [
  {
    name: "Hot Cache",
    backend: "Redis 7.2",
    capacityCap: "2 GB",
    capacityUsed: "1.2 GB",
    usedPct: 60,
    hitRate: 87,
    ttl: "15 min",
    eviction: "LRU",
    icon: Zap,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    name: "Warm Cache",
    backend: "pgvector",
    capacityCap: "10 GB",
    capacityUsed: "4.8 GB",
    usedPct: 48,
    hitRate: 72,
    ttl: "24 h",
    eviction: "Cosine similarity decay",
    icon: Cpu,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    name: "Cold Store",
    backend: "PostgreSQL JSONB",
    capacityCap: "Unlimited",
    capacityUsed: "24.3 GB",
    usedPct: 0,
    hitRate: 0,
    ttl: "Permanent",
    eviction: "Golden source",
    icon: HardDrive,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
];

const MOCK_FRESHNESS: ContextFreshness[] = [
  { contextType: "Encounter", threshold: 0.75, autoRefreshPolicy: "Immediate", ttlHot: "5 min", ttlWarm: "1 h", priority: "critical" },
  { contextType: "Clinical Summary", threshold: 0.75, autoRefreshPolicy: "Immediate", ttlHot: "10 min", ttlWarm: "4 h", priority: "high" },
  { contextType: "Billing", threshold: 0.75, autoRefreshPolicy: "Soon (1 min)", ttlHot: "15 min", ttlWarm: "6 h", priority: "high" },
  { contextType: "Medication", threshold: 0.80, autoRefreshPolicy: "Immediate", ttlHot: "10 min", ttlWarm: "2 h", priority: "critical" },
  { contextType: "Analytics", threshold: 0.70, autoRefreshPolicy: "Batch (15 min)", ttlHot: "30 min", ttlWarm: "24 h", priority: "medium" },
  { contextType: "Care Plan", threshold: 0.75, autoRefreshPolicy: "Soon (1 min)", ttlHot: "15 min", ttlWarm: "12 h", priority: "medium" },
  { contextType: "Device Vitals", threshold: 0.80, autoRefreshPolicy: "Immediate", ttlHot: "5 min", ttlWarm: "1 h", priority: "critical" },
  { contextType: "Scheduling", threshold: 0.75, autoRefreshPolicy: "Immediate", ttlHot: "10 min", ttlWarm: "4 h", priority: "high" },
  { contextType: "Payer Rules", threshold: 0.70, autoRefreshPolicy: "Batch (15 min)", ttlHot: "1 h", ttlWarm: "7 d", priority: "medium" },
  { contextType: "Agent Config", threshold: 0.90, autoRefreshPolicy: "Immediate", ttlHot: "5 min", ttlWarm: "1 h", priority: "critical" },
  { contextType: "Clinical Protocols", threshold: 0.70, autoRefreshPolicy: "Batch (15 min)", ttlHot: "1 h", ttlWarm: "7 d", priority: "low" },
  { contextType: "Formulary", threshold: 0.70, autoRefreshPolicy: "Batch (15 min)", ttlHot: "4 h", ttlWarm: "30 d", priority: "low" },
  { contextType: "Compliance", threshold: 0.80, autoRefreshPolicy: "Immediate", ttlHot: "15 min", ttlWarm: "24 h", priority: "high" },
];

const MOCK_STREAMS: EventStream[] = [
  {
    pattern: "patient.*",
    consumerGroups: 4,
    messages24h: 2847,
    failed: 3,
    dlqCount: 0,
    dlqEntries: [],
  },
  {
    pattern: "encounter.*",
    consumerGroups: 3,
    messages24h: 1423,
    failed: 1,
    dlqCount: 0,
    dlqEntries: [],
  },
  {
    pattern: "claim.*",
    consumerGroups: 2,
    messages24h: 892,
    failed: 0,
    dlqCount: 0,
    dlqEntries: [],
  },
  {
    pattern: "device.*",
    consumerGroups: 3,
    messages24h: 5915,
    failed: 12,
    dlqCount: 2,
    dlqEntries: [
      { messageId: "DLQ-001", error: "device_ingest_reading: timeout after 30s -- Oura API unreachable", timestamp: "2026-03-01 08:42:11" },
      { messageId: "DLQ-002", error: "device_batch_readings: payload validation failed -- invalid metric_type", timestamp: "2026-03-01 07:15:33" },
    ],
  },
  {
    pattern: "agent.*",
    consumerGroups: 1,
    messages24h: 312,
    failed: 0,
    dlqCount: 0,
    dlqEntries: [],
  },
  {
    pattern: "payer.*",
    consumerGroups: 2,
    messages24h: 47,
    failed: 0,
    dlqCount: 0,
    dlqEntries: [],
  },
];

const MOCK_RATE_LIMITS: RateLimitRow[] = [
  { category: "Auth", burstLimit: 10, sustainedLimit: "10/min", window: "1 min", perTenantOverride: "No" },
  { category: "FHIR Search", burstLimit: 200, sustainedLimit: "100/min", window: "1 min", perTenantOverride: "Yes (Premium: 500)" },
  { category: "FHIR Write", burstLimit: 100, sustainedLimit: "50/min", window: "1 min", perTenantOverride: "Yes" },
  { category: "AI Pipeline", burstLimit: 20, sustainedLimit: "10/min", window: "1 min", perTenantOverride: "Yes (Enterprise: 50)" },
  { category: "MCP Gateway", burstLimit: 100, sustainedLimit: "50/min", window: "1 min", perTenantOverride: "No" },
  { category: "Webhook Ingest", burstLimit: 500, sustainedLimit: "200/min", window: "1 min", perTenantOverride: "No" },
  { category: "Admin API", burstLimit: 50, sustainedLimit: "20/min", window: "1 min", perTenantOverride: "No" },
];

// --- Helpers ---

const TABS = [
  { key: "cache" as const, label: "Cache", icon: Database },
  { key: "freshness" as const, label: "Context Freshness", icon: RefreshCw },
  { key: "eventbus" as const, label: "Event Bus", icon: Radio },
  { key: "ratelimit" as const, label: "Rate Limiting", icon: ShieldCheck },
];

const PRIORITY_MAP: Record<PriorityLevel, { label: string; style: string }> = {
  critical: { label: "Critical", style: "bg-red-50 text-red-700" },
  high: { label: "High", style: "bg-amber-50 text-amber-700" },
  medium: { label: "Medium", style: "bg-blue-50 text-blue-700" },
  low: { label: "Low", style: "bg-[var(--medos-gray-100)] text-[var(--medos-gray-500)]" },
};

// --- Tab Components ---

function CacheTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">3-tier caching architecture: Hot (Redis) &rarr; Warm (pgvector) &rarr; Cold (PostgreSQL JSONB)</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {MOCK_CACHE_LAYERS.map((layer) => {
          const LayerIcon = layer.icon;
          const isGoldenSource = layer.name === "Cold Store";
          return (
            <div key={layer.name} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", layer.iconBg)}>
                    <LayerIcon className={cn("w-5 h-5", layer.iconColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{layer.name}</p>
                    <p className="text-xs text-[var(--medos-gray-500)]">{layer.backend}</p>
                  </div>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Capacity</span>
                  <span className="text-xs text-[var(--medos-gray-600)] tabular-nums">{layer.capacityUsed} / {layer.capacityCap}</span>
                </div>
                {!isGoldenSource ? (
                  <div className="w-full h-2.5 rounded-full bg-[var(--medos-gray-100)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        layer.usedPct > 80 ? "bg-red-400" : layer.usedPct > 60 ? "bg-amber-400" : "bg-emerald-400"
                      )}
                      style={{ width: `${layer.usedPct}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-2.5 rounded-full bg-blue-100">
                    <div className="h-full w-full rounded-full bg-blue-300" />
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Hit Rate</p>
                  <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums">
                    {isGoldenSource ? "--" : `${layer.hitRate}%`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">TTL</p>
                  <p className="text-lg font-bold text-[var(--medos-navy)]">{layer.ttl}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Eviction Policy</p>
                <p className="text-sm text-[var(--medos-gray-700)]">{layer.eviction}</p>
              </div>

              {/* Flush button */}
              {!isGoldenSource && (
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                  Flush Cache
                </button>
              )}
              {!isGoldenSource && (
                <p className="text-[10px] text-red-500 mt-1.5 text-center">Warning: Flushing will temporarily increase latency</p>
              )}
              {isGoldenSource && (
                <div className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                  <HardDrive className="w-3.5 h-3.5" />
                  Golden Source of Truth
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContextFreshnessTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">
        {MOCK_FRESHNESS.length} context types &middot; System-wide freshness management
      </p>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Context Type</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Threshold</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Auto-Refresh</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">TTL Hot</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">TTL Warm</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {MOCK_FRESHNESS.map((ctx) => {
                const p = PRIORITY_MAP[ctx.priority];
                return (
                  <tr key={ctx.contextType} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                        <span className="text-sm font-medium text-[var(--medos-gray-900)]">{ctx.contextType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-mono font-semibold text-[var(--medos-navy)] tabular-nums">{ctx.threshold.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-600)]">{ctx.autoRefreshPolicy}</td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-center font-mono tabular-nums">{ctx.ttlHot}</td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-center font-mono tabular-nums">{ctx.ttlWarm}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", p.style)}>
                        {p.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EventBusTab() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (pattern: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(pattern) ? next.delete(pattern) : next.add(pattern);
      return next;
    });
  };

  const totalMessages = MOCK_STREAMS.reduce((s, st) => s + st.messages24h, 0);
  const totalFailed = MOCK_STREAMS.reduce((s, st) => s + st.failed, 0);
  const totalDlq = MOCK_STREAMS.reduce((s, st) => s + st.dlqCount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-6">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {MOCK_STREAMS.length} streams &middot; {totalMessages.toLocaleString()} messages (24h)
        </p>
        {totalFailed > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            {totalFailed} failed
          </span>
        )}
        {totalDlq > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            {totalDlq} in DLQ
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="w-8 px-4 py-3" />
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Stream Pattern</th>
              <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Consumer Groups</th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Messages (24h)</th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Failed</th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">DLQ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {MOCK_STREAMS.map((stream) => {
              const isExpanded = expanded.has(stream.pattern);
              const hasDlq = stream.dlqCount > 0;
              return (
                <>
                  <tr
                    key={stream.pattern}
                    className={cn("hover:bg-[var(--medos-gray-50)] transition-all", hasDlq && "cursor-pointer")}
                    onClick={() => hasDlq && toggle(stream.pattern)}
                  >
                    <td className="px-4 py-3">
                      {hasDlq && (
                        isExpanded
                          ? <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
                          : <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-[var(--medos-primary)]" />
                        <span className="text-sm font-mono font-medium text-[var(--medos-gray-900)]">{stream.pattern}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-center tabular-nums">{stream.consumerGroups}</td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono">{stream.messages24h.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("text-sm tabular-nums font-mono", stream.failed > 0 ? "text-amber-600 font-semibold" : "text-[var(--medos-gray-400)]")}>
                        {stream.failed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("text-sm tabular-nums font-mono", stream.dlqCount > 0 ? "text-red-600 font-semibold" : "text-[var(--medos-gray-400)]")}>
                        {stream.dlqCount}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && stream.dlqEntries.length > 0 && (
                    <tr key={`${stream.pattern}-dlq`}>
                      <td colSpan={6} className="px-6 py-4 bg-red-50/50">
                        <p className="text-[10px] font-medium text-red-600 uppercase tracking-wider mb-3">Dead Letter Queue Entries</p>
                        <div className="space-y-2">
                          {stream.dlqEntries.map((entry) => (
                            <div key={entry.messageId} className="flex items-start justify-between bg-white rounded-lg border border-red-200 p-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-red-700 font-semibold">{entry.messageId}</span>
                                  <span className="text-[10px] text-[var(--medos-gray-500)]">{entry.timestamp}</span>
                                </div>
                                <p className="text-xs text-[var(--medos-gray-700)]">{entry.error}</p>
                              </div>
                              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-medium transition-all flex-shrink-0">
                                <RotateCcw className="w-3 h-3" />
                                Retry
                              </button>
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
  );
}

function RateLimitingTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">
        {MOCK_RATE_LIMITS.length} endpoint categories with configurable rate limits
      </p>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Endpoint Category</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Burst Limit</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Sustained Limit</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Window</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Per-Tenant Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {MOCK_RATE_LIMITS.map((rl) => (
                <tr key={rl.category} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                      <span className="text-sm font-medium text-[var(--medos-gray-900)]">{rl.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono font-semibold">{rl.burstLimit}</td>
                  <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono">{rl.sustainedLimit}</td>
                  <td className="px-4 py-3 text-sm text-[var(--medos-gray-600)] text-center">{rl.window}</td>
                  <td className="px-4 py-3">
                    {rl.perTenantOverride === "No" ? (
                      <span className="text-xs text-[var(--medos-gray-400)]">No</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--medos-primary-light)] text-[var(--medos-primary)]">
                        {rl.perTenantOverride}
                      </span>
                    )}
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

// --- Main Page ---

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("cache");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Cog className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">System</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Cache management, context freshness policies, event bus, and rate limiting
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
      {activeTab === "cache" && <CacheTab />}
      {activeTab === "freshness" && <ContextFreshnessTab />}
      {activeTab === "eventbus" && <EventBusTab />}
      {activeTab === "ratelimit" && <RateLimitingTab />}
    </div>
  );
}
