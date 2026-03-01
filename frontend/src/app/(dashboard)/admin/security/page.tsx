"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Eye,
  ChevronDown,
  ChevronRight,
  Download,
  Shield,
  Key,
  RefreshCw,
  Activity,
  XCircle,
  UserCheck,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type SecurityTabKey = "compliance" | "audit" | "encryption" | "events" | "risk";
type ComplianceStatus = "pass" | "warn";
type AuditAction = "read" | "create" | "update" | "delete" | "search" | "login" | "export";
type AuditOutcome = "success" | "failure";
type EventSeverity = "critical" | "high" | "warning" | "info";
type RiskSeverity = "critical" | "high" | "medium";
type RiskLikelihood = "high" | "medium" | "low";
type ResidualRisk = "very-low" | "low" | "medium";

interface ComplianceCategory {
  name: string;
  score: number;
  status: ComplianceStatus;
  note?: string;
  checks: { item: string; passed: boolean }[];
}

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  initials: string;
  role: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  outcome: AuditOutcome;
  breakGlass?: boolean;
}

interface EncryptionRow {
  layer: string;
  mechanism: string;
  status: string;
  rotation: string;
  details: string;
}

interface TenantEncryption {
  tenant: string;
  kmsStatus: string;
  fields: string[];
  unencrypted: number;
  keyAge: number;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  event: string;
  severity: EventSeverity;
  source: string;
  details: string;
}

interface RiskEntry {
  id: string;
  description: string;
  severity: RiskSeverity;
  likelihood: RiskLikelihood;
  controls: string;
  residualRisk: ResidualRisk;
  reviewDate: string;
  reviewed: boolean;
}

// --- Mock Data ---

const COMPLIANCE_CATEGORIES: ComplianceCategory[] = [
  {
    name: "Access Controls",
    score: 98,
    status: "pass",
    checks: [
      { item: "RBAC enforced on all endpoints", passed: true },
      { item: "MFA enabled for admin users", passed: true },
      { item: "Session timeout < 15 minutes", passed: true },
      { item: "Break-the-glass procedure documented", passed: true },
      { item: "Service account rotation", passed: false },
    ],
  },
  {
    name: "Audit Logging",
    score: 100,
    status: "pass",
    checks: [
      { item: "All PHI access logged as FHIR AuditEvent", passed: true },
      { item: "Tamper-proof log storage (S3 Object Lock)", passed: true },
      { item: "Log retention >= 6 years", passed: true },
      { item: "Real-time log forwarding to SIEM", passed: true },
    ],
  },
  {
    name: "Encryption at Rest",
    score: 95,
    status: "pass",
    checks: [
      { item: "Database TDE via KMS", passed: true },
      { item: "S3 SSE-KMS enabled", passed: true },
      { item: "Field-level encryption for PII", passed: true },
      { item: "Key rotation schedule enforced", passed: true },
      { item: "Backup encryption verified", passed: false },
    ],
  },
  {
    name: "Encryption in Transit",
    score: 100,
    status: "pass",
    checks: [
      { item: "TLS 1.3 on all endpoints", passed: true },
      { item: "HSTS enabled", passed: true },
      { item: "Certificate auto-renewal", passed: true },
      { item: "Internal service mesh mTLS", passed: true },
    ],
  },
  {
    name: "Backup & Recovery",
    score: 90,
    status: "pass",
    checks: [
      { item: "Daily automated RDS snapshots", passed: true },
      { item: "Cross-region S3 replication", passed: true },
      { item: "RPO < 15 minutes verified", passed: true },
      { item: "RTO < 1 hour verified", passed: true },
      { item: "Monthly restore test", passed: false },
    ],
  },
  {
    name: "Breach Notification",
    score: 85,
    status: "warn",
    note: "Tabletop exercise due",
    checks: [
      { item: "Incident response playbook", passed: true },
      { item: "72-hour notification process", passed: true },
      { item: "OCR breach reporting template", passed: true },
      { item: "Tabletop exercise completed", passed: false },
    ],
  },
  {
    name: "BAAs",
    score: 100,
    status: "pass",
    checks: [
      { item: "AWS BAA executed", passed: true },
      { item: "Anthropic BAA executed", passed: true },
      { item: "Change Healthcare BAA executed", passed: true },
      { item: "Auth0 BAA executed", passed: true },
    ],
  },
  {
    name: "Risk Assessment",
    score: 80,
    status: "warn",
    note: "Next due: 2026-05-28",
    checks: [
      { item: "Initial risk assessment completed", passed: true },
      { item: "Risk register maintained", passed: true },
      { item: "Vulnerability scanning", passed: true },
      { item: "Annual reassessment scheduled", passed: false },
    ],
  },
  {
    name: "Workforce Training",
    score: 70,
    status: "warn",
    note: "3 users pending",
    checks: [
      { item: "HIPAA training module deployed", passed: true },
      { item: "All providers completed training", passed: false },
      { item: "Annual refresher scheduled", passed: true },
      { item: "Phishing simulation conducted", passed: false },
    ],
  },
];

const AUDIT_ENTRIES: AuditEntry[] = [
  { id: "AE-001", timestamp: "2026-03-01 14:32:18", actor: "Dr. Sarah Chen", initials: "SC", role: "Provider", action: "read", resourceType: "Patient", resourceId: "P-00234", ipAddress: "10.0.1.42", outcome: "success" },
  { id: "AE-002", timestamp: "2026-03-01 14:31:05", actor: "Dr. Sarah Chen", initials: "SC", role: "Provider", action: "read", resourceType: "Observation", resourceId: "OBS-1847", ipAddress: "10.0.1.42", outcome: "success" },
  { id: "AE-003", timestamp: "2026-03-01 14:28:44", actor: "Maria Rodriguez", initials: "MR", role: "Billing Specialist", action: "search", resourceType: "Claim", resourceId: "query:status=active", ipAddress: "10.0.1.55", outcome: "success" },
  { id: "AE-004", timestamp: "2026-03-01 14:25:12", actor: "System", initials: "SY", role: "System", action: "create", resourceType: "AuditEvent", resourceId: "AE-auto-8847", ipAddress: "10.0.0.1", outcome: "success" },
  { id: "AE-005", timestamp: "2026-03-01 14:22:33", actor: "Nurse Amy Park", initials: "AP", role: "Nurse", action: "read", resourceType: "Observation", resourceId: "OBS-1842", ipAddress: "10.0.1.60", outcome: "success" },
  { id: "AE-006", timestamp: "2026-03-01 14:18:07", actor: "unknown@external.net", initials: "??", role: "Unknown", action: "login", resourceType: "Session", resourceId: "N/A", ipAddress: "203.0.113.42", outcome: "failure" },
  { id: "AE-007", timestamp: "2026-03-01 14:15:55", actor: "unknown@external.net", initials: "??", role: "Unknown", action: "login", resourceType: "Session", resourceId: "N/A", ipAddress: "203.0.113.42", outcome: "failure" },
  { id: "AE-008", timestamp: "2026-03-01 14:12:41", actor: "Dr. James Wilson", initials: "JW", role: "Provider", action: "read", resourceType: "Patient", resourceId: "P-00189", ipAddress: "10.0.1.48", outcome: "success", breakGlass: true },
  { id: "AE-009", timestamp: "2026-03-01 14:10:22", actor: "Admin", initials: "AD", role: "Administrator", action: "export", resourceType: "AuditEvent", resourceId: "batch:2026-02-28", ipAddress: "10.0.1.10", outcome: "success" },
  { id: "AE-010", timestamp: "2026-03-01 14:08:15", actor: "Dr. Sarah Chen", initials: "SC", role: "Provider", action: "update", resourceType: "Encounter", resourceId: "E-2847", ipAddress: "10.0.1.42", outcome: "success" },
  { id: "AE-011", timestamp: "2026-03-01 14:05:30", actor: "Clinical Scribe Agent", initials: "CS", role: "AI Agent", action: "create", resourceType: "DocumentReference", resourceId: "DOC-4421", ipAddress: "10.0.0.1", outcome: "success" },
  { id: "AE-012", timestamp: "2026-03-01 14:02:18", actor: "Maria Rodriguez", initials: "MR", role: "Billing Specialist", action: "create", resourceType: "Claim", resourceId: "CLM-3892", ipAddress: "10.0.1.55", outcome: "success" },
  { id: "AE-013", timestamp: "2026-03-01 13:58:44", actor: "Nurse Amy Park", initials: "AP", role: "Nurse", action: "read", resourceType: "MedicationRequest", resourceId: "MED-0822", ipAddress: "10.0.1.60", outcome: "success" },
  { id: "AE-014", timestamp: "2026-03-01 13:55:10", actor: "Prior Auth Agent", initials: "PA", role: "AI Agent", action: "search", resourceType: "Coverage", resourceId: "query:patient=P-00234", ipAddress: "10.0.0.1", outcome: "success" },
  { id: "AE-015", timestamp: "2026-03-01 13:52:00", actor: "Admin", initials: "AD", role: "Administrator", action: "delete", resourceType: "Session", resourceId: "expired-batch", ipAddress: "10.0.1.10", outcome: "success" },
];

const ENCRYPTION_ROWS: EncryptionRow[] = [
  { layer: "Database TDE", mechanism: "PostgreSQL + KMS", status: "Active", rotation: "90 days", details: "AES-256 via AWS KMS CMK, automatic rotation" },
  { layer: "S3 Storage", mechanism: "SSE-KMS", status: "Active", rotation: "365 days", details: "All buckets, including backups and audit logs" },
  { layer: "Field: SSN", mechanism: "Fernet deterministic", status: "Active", rotation: "180 days", details: "2,340 records encrypted" },
  { layer: "Field: MRN", mechanism: "Fernet deterministic", status: "Active", rotation: "180 days", details: "2,340 records encrypted" },
  { layer: "Field: DOB", mechanism: "Fernet randomized", status: "Active", rotation: "180 days", details: "2,340 records encrypted" },
  { layer: "Field: Subscriber ID", mechanism: "Fernet deterministic", status: "Active", rotation: "180 days", details: "1,847 records encrypted" },
  { layer: "Transport", mechanism: "TLS 1.3", status: "Active", rotation: "Auto-renew", details: "Certificate expires 2027-02-15" },
];

const TENANT_ENCRYPTION: TenantEncryption[] = [
  { tenant: "Sunshine Orthopedics", kmsStatus: "Enabled", fields: ["SSN", "MRN", "DOB", "Subscriber ID"], unencrypted: 0, keyAge: 28 },
  { tenant: "Palm Beach Dermatology", kmsStatus: "Enabled", fields: ["SSN", "MRN", "DOB", "Subscriber ID"], unencrypted: 0, keyAge: 14 },
  { tenant: "Miami Spine Center", kmsStatus: "Enabled", fields: ["SSN", "MRN", "DOB"], unencrypted: 2, keyAge: 7 },
];

const SECURITY_EVENTS: SecurityEvent[] = [
  { id: "SE-001", timestamp: "2026-03-01 14:30:12", event: "Rate limit exceeded", severity: "warning", source: "API Gateway", details: "IP 198.51.100.14 hit 1000 req/min limit on /api/v1/patients" },
  { id: "SE-002", timestamp: "2026-03-01 14:18:07", event: "Failed login attempts", severity: "high", source: "Auth Service", details: "5 failed attempts from 203.0.113.42 -- account locked" },
  { id: "SE-003", timestamp: "2026-03-01 13:45:33", event: "Off-hours PHI access", severity: "warning", source: "Audit Service", details: "Dr. Wilson accessed patient P-00189 at 01:45 EST via break-the-glass" },
  { id: "SE-004", timestamp: "2026-03-01 13:22:18", event: "SQL injection blocked", severity: "critical", source: "WAF", details: "Blocked: SELECT * FROM users; DROP TABLE -- from 192.0.2.100" },
  { id: "SE-005", timestamp: "2026-03-01 12:55:44", event: "XSS attempt blocked", severity: "critical", source: "InputValidator", details: "Stripped <script> tag from patient notes field, IP 198.51.100.22" },
  { id: "SE-006", timestamp: "2026-03-01 12:30:10", event: "Password changed", severity: "info", source: "Auth Service", details: "User maria.rodriguez@sunshine.med updated password" },
  { id: "SE-007", timestamp: "2026-03-01 11:15:22", event: "MFA enrollment completed", severity: "info", source: "Auth Service", details: "Nurse Amy Park enrolled TOTP authenticator" },
  { id: "SE-008", timestamp: "2026-03-01 10:00:00", event: "TLS certificate renewed", severity: "info", source: "ACM", details: "*.medos-platform.com renewed, valid through 2027-02-15" },
  { id: "SE-009", timestamp: "2026-03-01 09:22:15", event: "Unusual data export", severity: "high", source: "DLP Monitor", details: "Admin exported 847 audit records -- within policy but flagged for volume" },
  { id: "SE-010", timestamp: "2026-03-01 08:45:33", event: "Geo-anomaly login", severity: "high", source: "Auth Service", details: "Dr. Chen login from Miami FL after login from NYC 2h ago -- MFA verified" },
];

const RISK_REGISTER: RiskEntry[] = [
  { id: "R-001", description: "Unauthorized PHI access by authenticated user", severity: "high", likelihood: "medium", controls: "RLS + ABAC + Audit Trail + Break-the-Glass logging", residualRisk: "low", reviewDate: "2026-05-28", reviewed: true },
  { id: "R-002", description: "PHI leakage in error messages or logs", severity: "high", likelihood: "low", controls: "PHISafeErrorHandler + log scrubbing + output validation", residualRisk: "very-low", reviewDate: "2026-05-28", reviewed: true },
  { id: "R-003", description: "Cross-tenant data leakage", severity: "critical", likelihood: "low", controls: "Schema-per-tenant + RLS + per-tenant KMS + integration tests", residualRisk: "very-low", reviewDate: "2026-05-28", reviewed: true },
  { id: "R-004", description: "LLM hallucination in clinical documentation", severity: "high", likelihood: "medium", controls: "Confidence scoring (< 0.85 = review) + human approval + audit", residualRisk: "medium", reviewDate: "2026-04-15", reviewed: true },
  { id: "R-005", description: "Clearinghouse credential compromise", severity: "high", likelihood: "low", controls: "AWS Secrets Manager + 90-day rotation + access logging", residualRisk: "low", reviewDate: "2026-05-28", reviewed: true },
];

// --- Helpers ---

const TABS = [
  { key: "compliance" as const, label: "HIPAA Compliance", icon: ShieldCheck },
  { key: "audit" as const, label: "Audit Log", icon: Eye },
  { key: "encryption" as const, label: "Encryption", icon: Lock },
  { key: "events" as const, label: "Security Events", icon: Activity },
  { key: "risk" as const, label: "Risk Register", icon: FileText },
];

const ACTION_STYLES: Record<AuditAction, string> = {
  read: "bg-blue-50 text-blue-700 border-blue-200",
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-amber-50 text-amber-700 border-amber-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  search: "bg-violet-50 text-violet-700 border-violet-200",
  login: "bg-gray-50 text-gray-700 border-gray-200",
  export: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const SEVERITY_STYLES: Record<EventSeverity, { bg: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  info: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
};

const RISK_SEVERITY_STYLES: Record<RiskSeverity, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
};

const RESIDUAL_STYLES: Record<ResidualRisk, string> = {
  "very-low": "bg-emerald-50 text-emerald-700",
  low: "bg-blue-50 text-blue-700",
  medium: "bg-amber-50 text-amber-700",
};

// --- Tab Components ---

function ComplianceTab() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const overallScore = 94;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (overallScore / 100) * circumference;

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Score + Export */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-8">
          {/* Circular Progress */}
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--medos-gray-100)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="var(--medos-primary)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[var(--medos-navy)]">{overallScore}</span>
              <span className="text-xs text-[var(--medos-gray-500)]">/ 100</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-[var(--medos-navy)]">HIPAA Compliance Score</h3>
            <p className="text-sm text-[var(--medos-gray-500)] mt-1">
              {COMPLIANCE_CATEGORIES.filter((c) => c.status === "pass").length} of{" "}
              {COMPLIANCE_CATEGORIES.length} categories passing
            </p>
            <p className="text-xs text-[var(--medos-gray-400)] mt-0.5">
              Last assessed: 2026-02-28
            </p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all shadow-medos-sm">
          <Download className="w-4 h-4" />
          Export Compliance Report
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {COMPLIANCE_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const isPass = category.status === "pass";
          return (
            <div
              key={category.name}
              className={cn(
                "bg-white rounded-xl border shadow-medos-sm overflow-hidden transition-all",
                isPass ? "border-[var(--medos-gray-200)]" : "border-amber-200"
              )}
            >
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--medos-gray-50)] transition-all"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{category.name}</p>
                    {category.note && (
                      <p className="text-[10px] text-amber-600 mt-0.5">{category.note}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      category.score >= 90 ? "text-emerald-600" : "text-amber-600"
                    )}
                  >
                    {category.score}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      isPass
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {isPass ? "Pass" : "Warn"}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pt-1 border-t border-[var(--medos-gray-100)]">
                  <div className="space-y-2 mt-3">
                    {category.checks.map((check) => (
                      <div key={check.item} className="flex items-center gap-2">
                        {check.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                        <span className="text-xs text-[var(--medos-gray-700)]">{check.item}</span>
                      </div>
                    ))}
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

function AuditLogTab() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");

  const filtered = AUDIT_ENTRIES.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (outcomeFilter !== "all" && e.outcome !== outcomeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--medos-gray-400)]" />
          <span className="text-sm text-[var(--medos-gray-500)]">Filters:</span>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 pl-3 pr-8 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent appearance-none cursor-pointer"
        >
          <option value="all">All Actions</option>
          <option value="read">Read</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="search">Search</option>
          <option value="login">Login</option>
          <option value="export">Export</option>
        </select>
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="h-9 pl-3 pr-8 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent appearance-none cursor-pointer"
        >
          <option value="all">All Outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
        <p className="text-sm text-[var(--medos-gray-500)] ml-auto tabular-nums">
          {filtered.length} of {AUDIT_ENTRIES.length} entries
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Timestamp</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Actor</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Role</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Action</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Resource</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Resource ID</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">IP Address</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    "hover:bg-[var(--medos-gray-50)] transition-all",
                    entry.breakGlass && "bg-amber-50/60 border-l-2 border-l-amber-400",
                    entry.outcome === "failure" && "bg-red-50/40"
                  )}
                >
                  <td className="px-4 py-2.5 text-xs font-mono text-[var(--medos-gray-600)] whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold flex-shrink-0",
                        entry.role === "System" || entry.role === "AI Agent"
                          ? "bg-violet-100 text-violet-700"
                          : entry.outcome === "failure"
                            ? "bg-red-100 text-red-700"
                            : "bg-[var(--medos-primary-light)] text-[var(--medos-primary)]"
                      )}>
                        {entry.initials}
                      </div>
                      <span className="text-xs text-[var(--medos-gray-900)] font-medium truncate max-w-[140px]">
                        {entry.actor}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--medos-gray-600)]">{entry.role}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      ACTION_STYLES[entry.action]
                    )}>
                      {entry.action}
                    </span>
                    {entry.breakGlass && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        BTG
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--medos-gray-700)]">{entry.resourceType}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-[var(--medos-gray-600)]">{entry.resourceId}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-[var(--medos-gray-600)]">{entry.ipAddress}</td>
                  <td className="px-4 py-2.5">
                    {entry.outcome === "success" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700">
                        <XCircle className="w-3 h-3" />
                        Failure
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--medos-gray-100)]">
          <p className="text-xs text-[var(--medos-gray-500)]">
            Showing 1-15 of 12,705 entries
          </p>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs text-[var(--medos-gray-400)] cursor-not-allowed">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-semibold">
              1
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)]">
              2
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)]">
              3
            </button>
            <span className="px-2 text-xs text-[var(--medos-gray-400)]">...</span>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)]">
              847
            </button>
            <button className="px-2.5 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)]">
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EncryptionTab() {
  return (
    <div className="space-y-6">
      {/* Database / Field Encryption */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-3">Encryption Layers</h3>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--medos-gray-100)]">
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Layer</th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Mechanism</th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Status</th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Key Rotation</th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--medos-gray-100)]">
                {ENCRYPTION_ROWS.map((row) => (
                  <tr key={row.layer} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-5 py-3 text-sm font-medium text-[var(--medos-navy)]">{row.layer}</td>
                    <td className="px-5 py-3 text-xs font-mono text-[var(--medos-gray-700)]">{row.mechanism}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--medos-gray-600)]">{row.rotation}</td>
                    <td className="px-5 py-3 text-xs text-[var(--medos-gray-600)]">{row.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Per-Tenant Encryption */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-3">Per-Tenant Encryption</h3>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--medos-gray-100)]">
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Tenant</th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">KMS Key</th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Encrypted Fields</th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Unencrypted</th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Key Age</th>
                  <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--medos-gray-100)]">
                {TENANT_ENCRYPTION.map((tenant) => (
                  <tr key={tenant.tenant} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-5 py-3 text-sm font-medium text-[var(--medos-navy)]">{tenant.tenant}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        <Key className="w-3 h-3" />
                        {tenant.kmsStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tenant.fields.map((field) => (
                          <span
                            key={field}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--medos-primary-light)] text-[var(--medos-primary)]"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          tenant.unencrypted > 0 ? "text-amber-600" : "text-emerald-600"
                        )}
                      >
                        {tenant.unencrypted}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-[var(--medos-gray-700)] tabular-nums">
                      {tenant.keyAge} days
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all">
                        <RefreshCw className="w-3 h-3" />
                        Rotate Key
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityEventsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          Real-time security event feed
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">Live</span>
        </div>
      </div>

      <div className="space-y-2">
        {SECURITY_EVENTS.map((event) => {
          const sev = SEVERITY_STYLES[event.severity];
          return (
            <div
              key={event.id}
              className={cn(
                "bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm px-5 py-4 hover:shadow-medos-md transition-all",
                event.severity === "critical" && "border-l-4 border-l-red-500",
                event.severity === "high" && "border-l-4 border-l-orange-500"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", sev.dot)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                      sev.bg, sev.text
                    )}>
                      {event.severity}
                    </span>
                    <span className="text-sm font-semibold text-[var(--medos-navy)]">{event.event}</span>
                  </div>
                  <p className="text-xs text-[var(--medos-gray-600)]">{event.details}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-mono text-[var(--medos-gray-400)]">{event.timestamp}</span>
                    <span className="text-[10px] text-[var(--medos-gray-400)]">Source: {event.source}</span>
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

function RiskRegisterTab() {
  const [risks, setRisks] = useState(RISK_REGISTER);

  const markReviewed = (id: string) => {
    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, reviewed: true } : r))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {risks.length} identified risks -- {risks.filter((r) => r.reviewed).length} reviewed
        </p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all shadow-medos-sm">
          <Clock className="w-4 h-4" />
          Schedule Next Assessment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Risk ID</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Description</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Severity</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Likelihood</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Controls</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Residual</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Review</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {risks.map((risk) => (
                <tr key={risk.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-4 py-3 text-xs font-mono font-semibold text-[var(--medos-primary)]">
                    {risk.id}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-700)] max-w-[220px]">
                    {risk.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
                      RISK_SEVERITY_STYLES[risk.severity]
                    )}>
                      {risk.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium text-[var(--medos-gray-700)] capitalize">
                      {risk.likelihood}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)] max-w-[200px]">
                    {risk.controls}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                      RESIDUAL_STYLES[risk.residualRisk]
                    )}>
                      {risk.residualRisk === "very-low" ? "Very Low" : risk.residualRisk.charAt(0).toUpperCase() + risk.residualRisk.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{risk.reviewDate}</td>
                  <td className="px-4 py-3 text-center">
                    {risk.reviewed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reviewed
                      </span>
                    ) : (
                      <button
                        onClick={() => markReviewed(risk.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all"
                      >
                        <UserCheck className="w-3 h-3" />
                        Mark Reviewed
                      </button>
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

export default function AdminSecurityPage() {
  const [activeTab, setActiveTab] = useState<SecurityTabKey>("compliance");

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Shield className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Security & Compliance</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            HIPAA compliance, audit trail, encryption status, and risk management
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--medos-gray-200)]">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
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
      {activeTab === "compliance" && <ComplianceTab />}
      {activeTab === "audit" && <AuditLogTab />}
      {activeTab === "encryption" && <EncryptionTab />}
      {activeTab === "events" && <SecurityEventsTab />}
      {activeTab === "risk" && <RiskRegisterTab />}
    </div>
  );
}
