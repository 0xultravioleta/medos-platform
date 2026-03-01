"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bot,
  FolderOpen,
  Settings,
  FileText,
  ClipboardList,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
  Cpu,
  Shield,
  Zap,
  Tag,
  FileCode,
} from "lucide-react";

// --- Types ---

type TabKey = "directory" | "config" | "prompts" | "audit";
type AgentStatus = "active" | "planned";
type DecisionType = "auto-approved" | "flagged" | "pending" | "escalated";
type PromptStatus = "active" | "draft" | "archived";

interface AgentCard {
  name: string;
  status: AgentStatus;
  tasks24h: number;
  confidence: number;
  humanReviewPct: number;
  avgDuration: number;
  statusColor: string;
  description: string;
  icon: typeof Cpu;
}

interface AgentParam {
  name: string;
  value: string;
  description: string;
}

interface AgentConfig {
  agentName: string;
  params: AgentParam[];
}

interface PromptEntry {
  name: string;
  agent: string;
  version: string;
  status: PromptStatus;
  lastUpdated: string;
  avgTokens: number;
  templatePreview: string;
}

interface AuditEntry {
  timestamp: string;
  agent: string;
  taskId: string;
  confidence: number;
  duration: string;
  decision: DecisionType;
  reviewer: string | null;
}

// --- Mock Data ---

const MOCK_AGENTS: AgentCard[] = [
  {
    name: "Clinical Scribe",
    status: "active",
    tasks24h: 47,
    confidence: 0.91,
    humanReviewPct: 12,
    avgDuration: 8.2,
    statusColor: "emerald",
    description: "Transcribes encounters, generates SOAP notes, and suggests ICD-10/CPT codes with confidence scoring.",
    icon: Cpu,
  },
  {
    name: "Prior Authorization",
    status: "active",
    tasks24h: 13,
    confidence: 0.88,
    humanReviewPct: 23,
    avgDuration: 14.5,
    statusColor: "emerald",
    description: "Automates prior auth submissions by extracting clinical evidence and generating PA request packages.",
    icon: Shield,
  },
  {
    name: "Denial Management",
    status: "active",
    tasks24h: 8,
    confidence: 0.85,
    humanReviewPct: 31,
    avgDuration: 22.1,
    statusColor: "amber",
    description: "Analyzes claim denials, identifies root causes, and generates appeal letters with supporting evidence.",
    icon: AlertTriangle,
  },
  {
    name: "Billing Agent",
    status: "planned",
    tasks24h: 0,
    confidence: 0,
    humanReviewPct: 0,
    avgDuration: 0,
    statusColor: "gray",
    description: "End-to-end billing automation including charge capture, claim generation, and follow-up workflows.",
    icon: Zap,
  },
  {
    name: "Scheduling Agent",
    status: "planned",
    tasks24h: 0,
    confidence: 0,
    humanReviewPct: 0,
    avgDuration: 0,
    statusColor: "gray",
    description: "Intelligent appointment scheduling with provider preference matching and waitlist optimization.",
    icon: Clock,
  },
];

const MOCK_CONFIGS: AgentConfig[] = [
  {
    agentName: "Clinical Scribe",
    params: [
      { name: "confidence_auto_execute", value: "0.90", description: "Minimum confidence to auto-approve without human review" },
      { name: "confidence_flag_review", value: "0.75", description: "Confidence below this triggers mandatory human review" },
      { name: "confidence_escalate", value: "< 0.75", description: "Confidence below flag threshold triggers escalation to supervisor" },
      { name: "audio_quality_min", value: "10 dB SNR", description: "Minimum signal-to-noise ratio for audio input" },
      { name: "max_processing_time", value: "30s", description: "Maximum time before task is timed out" },
      { name: "model", value: "claude-sonnet-4-20250514", description: "LLM model used for generation" },
      { name: "prompt_version", value: "v2.3", description: "Active prompt template version" },
      { name: "icd10_confidence_threshold", value: "0.95", description: "Minimum confidence for ICD-10 code suggestions" },
      { name: "cpt_confidence_threshold", value: "0.95", description: "Minimum confidence for CPT code suggestions" },
      { name: "mcp_tools_allowed", value: "fhir_read, fhir_search, fhir_create, scribe_*", description: "MCP tools this agent is permitted to call" },
      { name: "fhir_scopes", value: "patient/*.read, patient/*.write, encounter/*.*", description: "FHIR SMART scopes granted to this agent" },
    ],
  },
  {
    agentName: "Prior Authorization",
    params: [
      { name: "confidence_auto_execute", value: "0.85", description: "Minimum confidence to auto-submit PA request" },
      { name: "confidence_flag_review", value: "0.70", description: "Confidence below this triggers human review" },
      { name: "max_processing_time", value: "60s", description: "Maximum time for PA package generation" },
      { name: "model", value: "claude-sonnet-4-20250514", description: "LLM model used for evidence extraction" },
      { name: "prompt_version", value: "v1.8", description: "Active prompt template version" },
      { name: "evidence_min_sources", value: "3", description: "Minimum clinical evidence sources required" },
      { name: "payer_rule_refresh", value: "24h", description: "How often payer rules cache is refreshed" },
      { name: "mcp_tools_allowed", value: "fhir_read, fhir_search, billing_check_eligibility, billing_submit_claim", description: "MCP tools this agent is permitted to call" },
      { name: "fhir_scopes", value: "patient/*.read, coverage/*.read", description: "FHIR SMART scopes granted to this agent" },
    ],
  },
  {
    agentName: "Denial Management",
    params: [
      { name: "confidence_auto_execute", value: "0.80", description: "Minimum confidence for auto-generated appeal" },
      { name: "confidence_flag_review", value: "0.65", description: "Confidence below this requires billing specialist review" },
      { name: "max_processing_time", value: "90s", description: "Maximum time for denial analysis and appeal generation" },
      { name: "model", value: "claude-sonnet-4-20250514", description: "LLM model used for denial analysis" },
      { name: "prompt_version", value: "v1.3", description: "Active prompt template version" },
      { name: "appeal_deadline_buffer", value: "5 days", description: "Days before filing deadline to escalate" },
      { name: "denial_category_threshold", value: "0.90", description: "Confidence needed for denial root cause classification" },
      { name: "mcp_tools_allowed", value: "fhir_read, fhir_search, billing_*, context_get_freshness", description: "MCP tools this agent is permitted to call" },
      { name: "fhir_scopes", value: "patient/*.read, claim/*.read, coverage/*.read", description: "FHIR SMART scopes granted to this agent" },
    ],
  },
];

const MOCK_PROMPTS: PromptEntry[] = [
  {
    name: "SOAP Note Generation",
    agent: "Clinical Scribe",
    version: "v2.3",
    status: "active",
    lastUpdated: "2026-02-28",
    avgTokens: 2840,
    templatePreview: `You are a medical scribe assistant. Given the following encounter transcript, generate a complete SOAP note.

## Input
- Transcript: {transcript}
- Patient context: {patient_summary}
- Previous encounters: {encounter_history}

## Output Format
**Subjective:** Chief complaint, HPI, ROS...
**Objective:** Vitals, physical exam findings...
**Assessment:** Diagnoses with ICD-10 codes (confidence >= 0.95)
**Plan:** Treatment plan, medications, follow-up...`,
  },
  {
    name: "ICD-10 Code Suggestion",
    agent: "Clinical Scribe",
    version: "v1.9",
    status: "active",
    lastUpdated: "2026-02-25",
    avgTokens: 1620,
    templatePreview: `Analyze the clinical documentation and suggest appropriate ICD-10-CM codes.

## Input
- Clinical note: {soap_note}
- Problem list: {problem_list}

## Requirements
- Only suggest codes with confidence >= 0.95
- Include specificity level (3-7 characters)
- Flag any codes requiring additional documentation`,
  },
  {
    name: "PA Evidence Summary",
    agent: "Prior Authorization",
    version: "v1.8",
    status: "active",
    lastUpdated: "2026-02-20",
    avgTokens: 3200,
    templatePreview: `Generate a clinical evidence summary for prior authorization submission.

## Input
- Requested service: {service}
- Payer requirements: {payer_rules}
- Patient records: {clinical_records}

## Output
- Medical necessity justification
- Supporting clinical evidence (min 3 sources)
- Relevant CPT/HCPCS codes
- Prior treatment history`,
  },
  {
    name: "Appeal Letter Generation",
    agent: "Denial Management",
    version: "v1.5",
    status: "draft",
    lastUpdated: "2026-02-18",
    avgTokens: 4100,
    templatePreview: `Draft an appeal letter for the denied claim.

## Input
- Denial reason: {denial_reason}
- CARC/RARC codes: {reason_codes}
- Original claim: {claim_data}
- Clinical evidence: {supporting_docs}

## Requirements
- Reference specific payer policy
- Cite clinical guidelines
- Include provider attestation section
- Professional medical terminology`,
  },
  {
    name: "Denial Root Cause Analysis",
    agent: "Denial Management",
    version: "v1.3",
    status: "archived",
    lastUpdated: "2026-02-10",
    avgTokens: 1890,
    templatePreview: `Analyze the denied claim and identify root cause category.

## Input
- Claim: {claim_data}
- Denial codes: {carc_rarc}
- Payer: {payer_name}

## Categories
- Documentation insufficiency
- Coding error
- Authorization missing
- Timely filing
- Medical necessity`,
  },
];

const MOCK_AUDIT: AuditEntry[] = [
  { timestamp: "2026-03-01 09:42:15", agent: "Clinical Scribe", taskId: "TSK-4821", confidence: 0.94, duration: "6.8s", decision: "auto-approved", reviewer: null },
  { timestamp: "2026-03-01 09:38:02", agent: "Prior Authorization", taskId: "TSK-4820", confidence: 0.82, duration: "18.2s", decision: "flagged", reviewer: "Dr. Martinez" },
  { timestamp: "2026-03-01 09:35:44", agent: "Clinical Scribe", taskId: "TSK-4819", confidence: 0.97, duration: "5.1s", decision: "auto-approved", reviewer: null },
  { timestamp: "2026-03-01 09:30:11", agent: "Denial Management", taskId: "TSK-4818", confidence: 0.72, duration: "28.4s", decision: "escalated", reviewer: "Sarah Chen (Billing Mgr)" },
  { timestamp: "2026-03-01 09:24:33", agent: "Clinical Scribe", taskId: "TSK-4817", confidence: 0.89, duration: "7.9s", decision: "auto-approved", reviewer: null },
  { timestamp: "2026-03-01 09:18:07", agent: "Denial Management", taskId: "TSK-4816", confidence: 0.86, duration: "19.7s", decision: "auto-approved", reviewer: null },
  { timestamp: "2026-03-01 09:12:55", agent: "Prior Authorization", taskId: "TSK-4815", confidence: 0.91, duration: "12.3s", decision: "auto-approved", reviewer: null },
  { timestamp: "2026-03-01 09:05:21", agent: "Clinical Scribe", taskId: "TSK-4814", confidence: 0.78, duration: "9.4s", decision: "flagged", reviewer: "Dr. Patel" },
  { timestamp: "2026-03-01 08:58:40", agent: "Clinical Scribe", taskId: "TSK-4813", confidence: 0.92, duration: "6.2s", decision: "auto-approved", reviewer: null },
  { timestamp: "2026-03-01 08:50:18", agent: "Prior Authorization", taskId: "TSK-4812", confidence: 0.76, duration: "22.8s", decision: "pending", reviewer: null },
];

// --- Helpers ---

const TABS = [
  { key: "directory" as const, label: "Directory", icon: FolderOpen },
  { key: "config" as const, label: "Configuration", icon: Settings },
  { key: "prompts" as const, label: "Prompts", icon: FileText },
  { key: "audit" as const, label: "Audit Trail", icon: ClipboardList },
];

const DECISION_MAP: Record<DecisionType, { label: string; style: string }> = {
  "auto-approved": { label: "Auto-approved", style: "bg-emerald-50 text-emerald-700" },
  flagged: { label: "Flagged", style: "bg-amber-50 text-amber-700" },
  pending: { label: "Pending", style: "bg-blue-50 text-blue-700" },
  escalated: { label: "Escalated", style: "bg-red-50 text-red-700" },
};

const PROMPT_STATUS_MAP: Record<PromptStatus, { label: string; style: string }> = {
  active: { label: "Active", style: "bg-emerald-50 text-emerald-700" },
  draft: { label: "Draft", style: "bg-amber-50 text-amber-700" },
  archived: { label: "Archived", style: "bg-[var(--medos-gray-100)] text-[var(--medos-gray-500)]" },
};

// --- Tab Components ---

function DirectoryTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">
        {MOCK_AGENTS.filter((a) => a.status === "active").length} active agents &middot; {MOCK_AGENTS.filter((a) => a.status === "planned").length} planned
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MOCK_AGENTS.map((agent) => {
          const AgentIcon = agent.icon;
          const isPlanned = agent.status === "planned";
          return (
            <div
              key={agent.name}
              className={cn(
                "bg-white rounded-xl border shadow-medos-sm p-5 transition-all duration-200",
                isPlanned
                  ? "border-[var(--medos-gray-200)] opacity-60"
                  : "border-[var(--medos-gray-200)] hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg",
                    isPlanned ? "bg-[var(--medos-gray-100)]" : "bg-[var(--medos-primary-light)]"
                  )}>
                    <AgentIcon className={cn("w-5 h-5", isPlanned ? "text-[var(--medos-gray-400)]" : "text-[var(--medos-primary)]")} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{agent.name}</p>
                    <p className="text-xs text-[var(--medos-gray-500)]">LangGraph Agent</p>
                  </div>
                </div>
                {isPlanned ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-500)]">
                    Coming Soon
                  </span>
                ) : (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                    agent.statusColor === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", agent.statusColor === "emerald" ? "bg-emerald-500" : "bg-amber-500")} />
                    Active
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-[var(--medos-gray-500)] mb-4 leading-relaxed">{agent.description}</p>

              {/* Metrics */}
              {!isPlanned && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--medos-gray-100)]">
                  <div>
                    <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Tasks / 24h</p>
                    <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums">{agent.tasks24h}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Confidence</p>
                    <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums">{agent.confidence.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Human Review</p>
                    <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums">{agent.humanReviewPct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Avg Duration</p>
                    <p className="text-lg font-bold text-[var(--medos-navy)] tabular-nums">{agent.avgDuration}s</p>
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

function ConfigurationTab() {
  const [selectedAgent, setSelectedAgent] = useState("Clinical Scribe");
  const config = MOCK_CONFIGS.find((c) => c.agentName === selectedAgent);

  return (
    <div className="space-y-4">
      {/* Agent selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--medos-gray-500)]">Select agent:</span>
        <div className="flex gap-2">
          {MOCK_CONFIGS.map((c) => (
            <button
              key={c.agentName}
              onClick={() => setSelectedAgent(c.agentName)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedAgent === c.agentName
                  ? "bg-[var(--medos-primary)] text-white"
                  : "bg-white border border-[var(--medos-gray-200)] text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-50)]"
              )}
            >
              {c.agentName}
            </button>
          ))}
        </div>
      </div>

      {/* Config table */}
      {config && (
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--medos-gray-100)]">
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{config.agentName} Configuration</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-2.5">Parameter</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Current Value</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {config.params.map((param) => {
                const isTags = param.name === "mcp_tools_allowed" || param.name === "fhir_scopes";
                return (
                  <tr key={param.name} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-6 py-3 text-sm font-mono text-[var(--medos-gray-900)]">{param.name}</td>
                    <td className="px-4 py-3">
                      {isTags ? (
                        <div className="flex flex-wrap gap-1">
                          {param.value.split(", ").map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--medos-primary-light)] text-[var(--medos-primary)] text-[10px] font-medium">
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-[var(--medos-navy)] tabular-nums">{param.value}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-500)]">{param.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PromptsTab() {
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
        {MOCK_PROMPTS.length} prompt templates &middot; {MOCK_PROMPTS.filter((p) => p.status === "active").length} active
      </p>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="w-8 px-4 py-3" />
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Prompt Name</th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Agent</th>
              <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Version</th>
              <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Last Updated</th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Avg Tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {MOCK_PROMPTS.map((prompt) => {
              const isExpanded = expanded.has(prompt.name);
              const statusInfo = PROMPT_STATUS_MAP[prompt.status];
              return (
                <>
                  <tr
                    key={prompt.name}
                    className="hover:bg-[var(--medos-gray-50)] transition-all cursor-pointer"
                    onClick={() => toggle(prompt.name)}
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-[var(--medos-primary)]" />
                        <span className="text-sm font-medium text-[var(--medos-gray-900)]">{prompt.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-600)]">{prompt.agent}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-mono text-[var(--medos-primary)] font-medium">{prompt.version}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusInfo.style)}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-600)]">{prompt.lastUpdated}</td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono">{prompt.avgTokens.toLocaleString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${prompt.name}-preview`}>
                      <td colSpan={7} className="px-6 py-4 bg-[var(--medos-gray-50)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-3.5 h-3.5 text-[var(--medos-gray-500)]" />
                          <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Template Preview</span>
                        </div>
                        <pre className="text-xs font-mono text-[var(--medos-gray-700)] bg-white border border-[var(--medos-gray-200)] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {prompt.templatePreview}
                        </pre>
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

function AuditTrailTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">
        Last {MOCK_AUDIT.length} agent decisions
      </p>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Timestamp</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Task ID</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Confidence</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Duration</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Decision</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Reviewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {MOCK_AUDIT.map((entry, i) => {
                const decision = DECISION_MAP[entry.decision];
                return (
                  <tr key={i} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-6 py-3 text-sm font-mono text-[var(--medos-gray-700)] tabular-nums">{entry.timestamp}</td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)]">{entry.agent}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[var(--medos-primary)]">{entry.taskId}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        entry.confidence >= 0.90 ? "text-emerald-600" : entry.confidence >= 0.80 ? "text-amber-600" : "text-red-600"
                      )}>
                        {entry.confidence.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-700)] text-right tabular-nums font-mono">{entry.duration}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", decision.style)}>
                        {decision.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--medos-gray-600)]">
                      {entry.reviewer || <span className="text-[var(--medos-gray-400)]">--</span>}
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

// --- Main Page ---

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("directory");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Bot className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">AI Agents</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            LangGraph agent directory, configuration, prompt management, and audit trail
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
      {activeTab === "directory" && <DirectoryTab />}
      {activeTab === "config" && <ConfigurationTab />}
      {activeTab === "prompts" && <PromptsTab />}
      {activeTab === "audit" && <AuditTrailTab />}
    </div>
  );
}
