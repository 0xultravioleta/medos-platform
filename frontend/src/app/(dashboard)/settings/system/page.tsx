"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Wrench,
  Bot,
  Zap,
  RefreshCw,
  Server,
  Database,
  Shield,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Timer,
  Cpu,
  HardDrive,
} from "lucide-react";

// --- Types ---

type TabKey = "overview" | "mcp" | "agents" | "cache";
type HealthStatus = "healthy" | "degraded" | "down";
type PhiLevel = "full" | "limited" | "none";

interface McpTool {
  name: string;
  description: string;
  phiLevel: PhiLevel;
  approvalRequired: boolean;
}

interface McpServer {
  name: string;
  toolCount: number;
  status: HealthStatus;
  tools: McpTool[];
}

interface AgentMetrics {
  name: string;
  tasksCompleted: number;
  avgConfidence: number;
  humanReviewRate: number;
  avgDuration: number;
  confidenceDist: { low: number; mid: number; high: number };
}

interface CacheEvent {
  id: string;
  eventType: string;
  source: string;
  latency: string;
  timestamp: string;
  status: "success" | "failed";
}

// --- Mock Data ---

const MOCK_MCP_SERVERS: McpServer[] = [
  {
    name: "FHIR MCP Server",
    toolCount: 12,
    status: "healthy",
    tools: [
      { name: "fhir_search", description: "Search FHIR resources", phiLevel: "full", approvalRequired: true },
      { name: "fhir_read", description: "Read single FHIR resource", phiLevel: "full", approvalRequired: false },
      { name: "fhir_create", description: "Create FHIR resource", phiLevel: "full", approvalRequired: true },
      { name: "fhir_update", description: "Update FHIR resource", phiLevel: "full", approvalRequired: true },
      { name: "fhir_delete", description: "Delete FHIR resource", phiLevel: "full", approvalRequired: true },
      { name: "fhir_patient_summary", description: "Get patient summary", phiLevel: "full", approvalRequired: false },
      { name: "fhir_encounter_list", description: "List encounters", phiLevel: "full", approvalRequired: false },
      { name: "fhir_condition_list", description: "List conditions", phiLevel: "limited", approvalRequired: false },
      { name: "fhir_medication_list", description: "List medications", phiLevel: "limited", approvalRequired: false },
      { name: "fhir_observation_search", description: "Search observations", phiLevel: "limited", approvalRequired: false },
      { name: "fhir_allergy_list", description: "List allergies", phiLevel: "limited", approvalRequired: false },
      { name: "fhir_audit_log", description: "Query audit events", phiLevel: "none", approvalRequired: false },
    ],
  },
  {
    name: "Scribe MCP Server",
    toolCount: 6,
    status: "healthy",
    tools: [
      { name: "scribe_start_session", description: "Start transcription session", phiLevel: "full", approvalRequired: true },
      { name: "scribe_stop_session", description: "Stop transcription session", phiLevel: "full", approvalRequired: false },
      { name: "scribe_get_transcript", description: "Get session transcript", phiLevel: "full", approvalRequired: false },
      { name: "scribe_generate_note", description: "Generate clinical note", phiLevel: "full", approvalRequired: true },
      { name: "scribe_get_codes", description: "Get suggested ICD/CPT codes", phiLevel: "limited", approvalRequired: false },
      { name: "scribe_review_note", description: "Review and approve note", phiLevel: "full", approvalRequired: true },
    ],
  },
  {
    name: "Billing MCP Server",
    toolCount: 8,
    status: "healthy",
    tools: [
      { name: "billing_generate_837p", description: "Generate X12 837P claim", phiLevel: "limited", approvalRequired: true },
      { name: "billing_scrub_claim", description: "Validate claim before submission", phiLevel: "limited", approvalRequired: false },
      { name: "billing_parse_835", description: "Parse X12 835 remittance", phiLevel: "limited", approvalRequired: false },
      { name: "billing_post_payment", description: "Post ERA payment", phiLevel: "limited", approvalRequired: true },
      { name: "billing_detect_underpayment", description: "Check for underpayments", phiLevel: "limited", approvalRequired: false },
      { name: "billing_claim_status", description: "Get claim status", phiLevel: "limited", approvalRequired: false },
      { name: "billing_eligibility_check", description: "Check patient eligibility (270/271)", phiLevel: "limited", approvalRequired: false },
      { name: "billing_ar_aging", description: "Get accounts receivable aging", phiLevel: "none", approvalRequired: false },
    ],
  },
  {
    name: "Scheduling MCP Server",
    toolCount: 6,
    status: "healthy",
    tools: [
      { name: "scheduling_find_slots", description: "Find available appointment slots", phiLevel: "none", approvalRequired: false },
      { name: "scheduling_book", description: "Book appointment", phiLevel: "limited", approvalRequired: true },
      { name: "scheduling_cancel", description: "Cancel appointment", phiLevel: "limited", approvalRequired: true },
      { name: "scheduling_reschedule", description: "Reschedule appointment", phiLevel: "limited", approvalRequired: true },
      { name: "scheduling_waitlist_add", description: "Add to waitlist", phiLevel: "limited", approvalRequired: false },
      { name: "scheduling_provider_availability", description: "Get provider availability", phiLevel: "none", approvalRequired: false },
    ],
  },
  {
    name: "Device MCP Server",
    toolCount: 8,
    status: "healthy",
    tools: [
      { name: "device_register", description: "Register wearable device", phiLevel: "limited", approvalRequired: true },
      { name: "device_list", description: "List registered devices", phiLevel: "limited", approvalRequired: false },
      { name: "device_ingest_reading", description: "Ingest health reading", phiLevel: "limited", approvalRequired: true },
      { name: "device_batch_ingest", description: "Batch ingest readings", phiLevel: "limited", approvalRequired: true },
      { name: "device_get_readings", description: "Get filtered readings", phiLevel: "limited", approvalRequired: false },
      { name: "device_get_summary", description: "Get metric summaries", phiLevel: "limited", approvalRequired: false },
      { name: "device_check_alerts", description: "Check alert thresholds", phiLevel: "none", approvalRequired: false },
      { name: "device_deregister", description: "Remove device", phiLevel: "limited", approvalRequired: true },
    ],
  },
  {
    name: "Context MCP Server",
    toolCount: 4,
    status: "healthy",
    tools: [
      { name: "context_freshness", description: "Check context freshness", phiLevel: "none", approvalRequired: false },
      { name: "context_force_refresh", description: "Force refresh context", phiLevel: "none", approvalRequired: true },
      { name: "context_dependency_graph", description: "Query dependency graph", phiLevel: "none", approvalRequired: false },
      { name: "context_staleness_report", description: "Get staleness report", phiLevel: "none", approvalRequired: false },
    ],
  },
];

const MOCK_AGENTS: AgentMetrics[] = [
  {
    name: "Clinical Scribe",
    tasksCompleted: 847,
    avgConfidence: 0.91,
    humanReviewRate: 12,
    avgDuration: 3.2,
    confidenceDist: { low: 8, mid: 45, high: 47 },
  },
  {
    name: "Prior Authorization",
    tasksCompleted: 234,
    avgConfidence: 0.88,
    humanReviewRate: 18,
    avgDuration: 5.1,
    confidenceDist: { low: 15, mid: 52, high: 33 },
  },
  {
    name: "Denial Management",
    tasksCompleted: 156,
    avgConfidence: 0.86,
    humanReviewRate: 22,
    avgDuration: 4.7,
    confidenceDist: { low: 20, mid: 55, high: 25 },
  },
];

const MOCK_EVENTS: CacheEvent[] = [
  { id: "EVT-001", eventType: "patient.updated", source: "FHIR MCP", latency: "12ms", timestamp: "2026-02-28 14:32:01", status: "success" },
  { id: "EVT-002", eventType: "payer.rules_changed", source: "Billing MCP", latency: "45ms", timestamp: "2026-02-28 14:31:45", status: "success" },
  { id: "EVT-003", eventType: "patient.encounter_created", source: "FHIR MCP", latency: "8ms", timestamp: "2026-02-28 14:30:22", status: "success" },
  { id: "EVT-004", eventType: "system.cache_eviction", source: "Context MCP", latency: "3ms", timestamp: "2026-02-28 14:29:58", status: "success" },
  { id: "EVT-005", eventType: "device.reading_ingested", source: "Device MCP", latency: "15ms", timestamp: "2026-02-28 14:28:30", status: "success" },
  { id: "EVT-006", eventType: "agent.task_completed", source: "Clinical Scribe", latency: "2ms", timestamp: "2026-02-28 14:27:11", status: "success" },
  { id: "EVT-007", eventType: "patient.medication_updated", source: "FHIR MCP", latency: "22ms", timestamp: "2026-02-28 14:26:05", status: "success" },
  { id: "EVT-008", eventType: "compliance.audit_logged", source: "FHIR MCP", latency: "5ms", timestamp: "2026-02-28 14:25:33", status: "success" },
  { id: "EVT-009", eventType: "scheduling.slot_booked", source: "Scheduling MCP", latency: "18ms", timestamp: "2026-02-28 14:24:19", status: "success" },
  { id: "EVT-010", eventType: "patient.condition_added", source: "FHIR MCP", latency: "120ms", timestamp: "2026-02-28 14:23:02", status: "failed" },
];

// Uptime bar data: 30 days, 1 = up, 0 = down
const MOCK_UPTIME_DAYS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

// --- Helpers ---

const TABS = [
  { key: "overview" as const, label: "Overview", icon: Activity },
  { key: "mcp" as const, label: "MCP Inventory", icon: Wrench },
  { key: "agents" as const, label: "Agent Performance", icon: Bot },
  { key: "cache" as const, label: "Cache & Events", icon: Database },
];

const PHI_LEVEL_MAP: Record<PhiLevel, { label: string; style: string }> = {
  full: { label: "Full PHI", style: "bg-red-50 text-red-700" },
  limited: { label: "Limited", style: "bg-amber-50 text-amber-700" },
  none: { label: "None", style: "bg-emerald-50 text-emerald-700" },
};

const STATUS_DOT_MAP: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

// --- Tab Components ---

function OverviewTab() {
  const totalTools = MOCK_MCP_SERVERS.reduce((sum, s) => sum + s.toolCount, 0);
  const allHealthy = MOCK_MCP_SERVERS.every((s) => s.status === "healthy");
  const uptimePercent = ((MOCK_UPTIME_DAYS.filter((d) => d === 1).length / MOCK_UPTIME_DAYS.length) * 100).toFixed(2);

  const kpis = [
    { label: "Total MCP Tools", value: totalTools.toString(), icon: Wrench, color: "text-[var(--medos-primary)]", bg: "bg-[var(--medos-primary-light)]" },
    { label: "Active Agents", value: "3", icon: Bot, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Cache Hit Rate", value: "87%", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "System Freshness", value: "0.82", icon: RefreshCw, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${kpi.bg}`}>
                  <KpiIcon className={`w-4.5 h-4.5 ${kpi.color}`} />
                </div>
                <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                  {kpi.label}
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--medos-navy)]">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Status Banner */}
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border ${
          allHealthy
            ? "bg-emerald-50 border-emerald-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        {allHealthy ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        )}
        <p
          className={`text-sm font-semibold ${
            allHealthy ? "text-emerald-800" : "text-amber-800"
          }`}
        >
          {allHealthy ? "All Systems Operational" : "Degraded Performance Detected"}
        </p>
        <p
          className={`text-xs ml-auto ${
            allHealthy ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          Last checked: 30s ago
        </p>
      </div>

      {/* Component Health List */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Component Health</h3>
        </div>
        <div className="divide-y divide-[var(--medos-gray-100)]">
          {MOCK_MCP_SERVERS.map((server) => (
            <div
              key={server.name}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-[var(--medos-gray-50)] transition-all"
            >
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-[var(--medos-gray-400)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--medos-gray-900)]">{server.name}</p>
                  <p className="text-xs text-[var(--medos-gray-500)]">{server.toolCount} tools</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT_MAP[server.status]}`} />
                <span className="text-xs font-medium text-[var(--medos-gray-600)] capitalize">
                  {server.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uptime */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Uptime — Last 30 Days</h3>
          <span className="text-sm font-bold text-emerald-600">{uptimePercent}%</span>
        </div>
        <div className="flex items-end gap-1">
          {MOCK_UPTIME_DAYS.map((day, i) => (
            <div
              key={i}
              className={`flex-1 h-8 rounded-sm ${day === 1 ? "bg-emerald-400" : "bg-red-400"}`}
              title={`Day ${i + 1}: ${day === 1 ? "Operational" : "Incident"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-[var(--medos-gray-500)]">30 days ago</span>
          <span className="text-[10px] text-[var(--medos-gray-500)]">Today</span>
        </div>
      </div>
    </div>
  );
}

function McpInventoryTab() {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const totalTools = MOCK_MCP_SERVERS.reduce((sum, s) => sum + s.toolCount, 0);

  const toggleServer = (name: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">
        {totalTools} tools across {MOCK_MCP_SERVERS.length} servers
      </p>

      <div className="space-y-3">
        {MOCK_MCP_SERVERS.map((server) => {
          const isExpanded = expandedServers.has(server.name);
          return (
            <div
              key={server.name}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden"
            >
              {/* Server Header */}
              <button
                onClick={() => toggleServer(server.name)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--medos-gray-50)] transition-all"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  )}
                  <Server className="w-4 h-4 text-[var(--medos-primary)]" />
                  <span className="text-sm font-semibold text-[var(--medos-navy)]">
                    {server.name}
                  </span>
                  <span className="text-xs text-[var(--medos-gray-500)]">
                    ({server.toolCount} tools)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT_MAP[server.status]}`} />
                  <span className="text-xs text-[var(--medos-gray-500)] capitalize">{server.status}</span>
                </div>
              </button>

              {/* Tools Table */}
              {isExpanded && (
                <div className="border-t border-[var(--medos-gray-100)]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--medos-gray-100)]">
                        <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-2.5">
                          Tool
                        </th>
                        <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-2.5">
                          Description
                        </th>
                        <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-2.5">
                          PHI Level
                        </th>
                        <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-2.5">
                          Approval
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--medos-gray-100)]">
                      {server.tools.map((tool) => {
                        const phiInfo = PHI_LEVEL_MAP[tool.phiLevel];
                        return (
                          <tr
                            key={tool.name}
                            className="hover:bg-[var(--medos-gray-50)] transition-all"
                          >
                            <td className="px-6 py-2.5 text-sm font-mono text-[var(--medos-gray-900)]">
                              {tool.name}
                            </td>
                            <td className="px-6 py-2.5 text-sm text-[var(--medos-gray-600)]">
                              {tool.description}
                            </td>
                            <td className="px-6 py-2.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${phiInfo.style}`}
                              >
                                {phiInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-2.5">
                              {tool.approvalRequired && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-red-300 text-red-700">
                                  Required
                                </span>
                              )}
                            </td>
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

      {/* Total */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <span className="text-sm font-semibold text-[var(--medos-navy)]">
          Total: {totalTools} tools across {MOCK_MCP_SERVERS.length} servers
        </span>
      </div>
    </div>
  );
}

function AgentPerformanceTab() {
  const agentIcons = [Cpu, Shield, AlertTriangle];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">
        {MOCK_AGENTS.length} LangGraph agents active
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {MOCK_AGENTS.map((agent, idx) => {
          const AgentIcon = agentIcons[idx];
          return (
            <div
              key={agent.name}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Agent Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--medos-primary-light)]">
                  <AgentIcon className="w-4.5 h-4.5 text-[var(--medos-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">{agent.name}</p>
                  <p className="text-xs text-[var(--medos-gray-500)]">LangGraph Agent</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Tasks Completed</span>
                  <span className="text-sm font-semibold text-[var(--medos-gray-900)] tabular-nums">
                    {agent.tasksCompleted.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Avg Confidence</span>
                  <span className="text-sm font-semibold text-[var(--medos-gray-900)] tabular-nums">
                    {agent.avgConfidence.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Human Review Rate</span>
                  <span className="text-sm font-semibold text-[var(--medos-gray-900)] tabular-nums">
                    {agent.humanReviewRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Avg Duration</span>
                  <span className="text-sm font-semibold text-[var(--medos-gray-900)] tabular-nums">
                    {agent.avgDuration}s
                  </span>
                </div>
              </div>

              {/* Confidence Distribution */}
              <div>
                <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                  Confidence Distribution
                </p>
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-red-400"
                    style={{ width: `${agent.confidenceDist.low}%` }}
                    title={`< 0.85: ${agent.confidenceDist.low}%`}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${agent.confidenceDist.mid}%` }}
                    title={`0.85-0.95: ${agent.confidenceDist.mid}%`}
                  />
                  <div
                    className="bg-emerald-400"
                    style={{ width: `${agent.confidenceDist.high}%` }}
                    title={`> 0.95: ${agent.confidenceDist.high}%`}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-[10px] text-[var(--medos-gray-500)]">&lt;0.85 ({agent.confidenceDist.low}%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[10px] text-[var(--medos-gray-500)]">0.85-0.95 ({agent.confidenceDist.mid}%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-[var(--medos-gray-500)]">&gt;0.95 ({agent.confidenceDist.high}%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CacheEventsTab() {
  return (
    <div className="space-y-6">
      {/* Cache + Events side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Cache Statistics */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Cache Statistics</h3>
          <div className="space-y-4">
            {/* Hot - Redis */}
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 flex-shrink-0">
                <Zap className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-[var(--medos-gray-900)]">Hot (Redis)</p>
                  <span className="text-xs font-semibold text-emerald-600">92.9% hit rate</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">Hits</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">156</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">Misses</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">12</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">Evictions</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">3</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warm - Vector */}
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 flex-shrink-0">
                <Cpu className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-[var(--medos-gray-900)]">Warm (Vector)</p>
                  <span className="text-xs font-semibold text-emerald-600">84.3% hit rate</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">Hits</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">43</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">Misses</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">8</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cold - PostgreSQL */}
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 flex-shrink-0">
                <HardDrive className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-[var(--medos-gray-900)]">Cold (PostgreSQL)</p>
                  <span className="text-xs font-semibold text-[var(--medos-gray-500)]">Golden source</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">Queries</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">21</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">Avg Latency</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">45ms</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Events */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--medos-gray-100)]">
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Recent Events</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--medos-gray-100)]">
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2">
                    Event
                  </th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2">
                    Source
                  </th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2">
                    Latency
                  </th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--medos-gray-100)]">
                {MOCK_EVENTS.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-[var(--medos-gray-50)] transition-all"
                  >
                    <td className="px-4 py-2">
                      <p className="text-xs font-mono text-[var(--medos-gray-900)]">{event.eventType}</p>
                      <p className="text-[10px] text-[var(--medos-gray-500)]">{event.timestamp}</p>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--medos-gray-600)]">
                      {event.source}
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--medos-gray-700)] text-right font-mono tabular-nums">
                      {event.latency}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {event.status === "success" ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700">
                          FAIL
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

      {/* Rehydration Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-3">Rehydration Metrics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Avg Latency */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-4 h-4 text-[var(--medos-primary)]" />
              <p className="text-sm font-medium text-[var(--medos-navy)]">Avg Latency</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">p50</p>
                <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums mt-1">12ms</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">p95</p>
                <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums mt-1">45ms</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">p99</p>
                <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums mt-1">120ms</p>
              </div>
            </div>
          </div>

          {/* Stale Contexts */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium text-[var(--medos-navy)]">Stale Contexts</p>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-[var(--medos-navy)]">4</p>
              <p className="text-sm text-[var(--medos-gray-500)] mb-0.5">of 52 (7.7%)</p>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--medos-gray-100)] mt-3">
              <div className="h-2 rounded-full bg-amber-400" style={{ width: "7.7%" }} />
            </div>
          </div>

          {/* Refresh Success Rate */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-medium text-[var(--medos-navy)]">Refresh Success Rate</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">98.2%</p>
            <p className="text-xs text-[var(--medos-gray-500)] mt-1">Last 24 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function SystemHealthPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--medos-gray-200)] text-[var(--medos-gray-500)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-700)] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Activity className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">System Health</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            MCP servers, agent performance, cache metrics, and system events
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
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? "border-[var(--medos-primary)] text-[var(--medos-primary)]"
                    : "border-transparent text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)] hover:border-[var(--medos-gray-300)]"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "mcp" && <McpInventoryTab />}
      {activeTab === "agents" && <AgentPerformanceTab />}
      {activeTab === "cache" && <CacheEventsTab />}
    </div>
  );
}
