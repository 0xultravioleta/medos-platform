"use client";

import { useState } from "react";
import {
  Database,
  Upload,
  Download,
  HardDrive,
  GitBranch,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RefreshCw,
  Shield,
  Archive,
  Server,
  ChevronDown,
  ChevronRight,
  Pencil,
  Globe,
  Stethoscope,
  Receipt,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type DataTabKey = "import" | "export" | "backup" | "migrations" | "retention";
type ImportStatus = "complete" | "in-progress" | "failed";
type BackupHealth = "healthy" | "warning";
type MigrationStatus = "up-to-date" | "pending";
type RetentionPurge = "manual" | "auto-archive" | "auto-purge" | "auto-evict";

interface ImportType {
  name: string;
  format: string;
  description: string;
  icon: typeof FileText;
  status: string;
}

interface RecentImport {
  id: string;
  date: string;
  type: string;
  totalRecords: number;
  created: number;
  matched: number;
  duplicates: number;
  errors: number;
  status: ImportStatus;
}

interface ExportType {
  name: string;
  format: string;
  scope: string;
  schedule: string;
  lastExport: string;
}

interface BackupInfo {
  name: string;
  frequency: string;
  lastBackup: string;
  detail: string;
  retention: string;
  health: BackupHealth;
  icon: typeof Server;
}

interface TenantMigration {
  tenant: string;
  currentVersion: string;
  latestVersion: string;
  pending: number;
  status: MigrationStatus;
  history: { version: string; date: string; description: string }[];
}

interface RetentionPolicy {
  category: string;
  period: string;
  regulation: string;
  autoPurge: RetentionPurge;
  status: string;
}

// --- Mock Data ---

const IMPORT_TYPES: ImportType[] = [
  { name: "Patient Demographics", format: "CSV", description: "Bulk import patient demographics from spreadsheet", icon: FileSpreadsheet, status: "Ready" },
  { name: "Patient HL7v2 ADT", format: "HL7v2", description: "Import ADT messages from legacy EHR systems", icon: Stethoscope, status: "Ready" },
  { name: "Patient EHR Bridge", format: "FHIR R4", description: "Sync patients via FHIR API from connected EHR", icon: Globe, status: "Ready" },
  { name: "Fee Schedule", format: "CSV", description: "Import CPT/HCPCS codes with allowed amounts", icon: Receipt, status: "Ready" },
  { name: "Payer Directory", format: "CMS NPPES", description: "Sync payer and provider directory from NPPES", icon: Building2, status: "Ready" },
];

const IMPORT_WIZARD_STEPS = [
  "Select Source",
  "Upload File",
  "Map Fields",
  "Validate",
  "Review Matches",
  "Confirm",
  "Complete",
];

const RECENT_IMPORTS: RecentImport[] = [
  { id: "IMP-001", date: "2026-02-28 14:30", type: "Patient CSV", totalRecords: 1247, created: 1189, matched: 42, duplicates: 12, errors: 4, status: "complete" },
  { id: "IMP-002", date: "2026-02-27 09:15", type: "HL7v2 ADT", totalRecords: 83, created: 78, matched: 3, duplicates: 1, errors: 1, status: "complete" },
  { id: "IMP-003", date: "2026-02-25 16:00", type: "Fee Schedule", totalRecords: 342, created: 342, matched: 0, duplicates: 0, errors: 0, status: "complete" },
];

const EXPORT_TYPES: ExportType[] = [
  { name: "FHIR Bulk Export", format: "NDJSON", scope: "All FHIR resources", schedule: "On-demand", lastExport: "2026-02-28 11:00" },
  { name: "Audit Logs", format: "CSV / JSON", scope: "All audit events", schedule: "On-demand", lastExport: "2026-03-01 14:08" },
  { name: "Claims Data", format: "CSV", scope: "All claims with line items", schedule: "On-demand", lastExport: "2026-02-27 16:30" },
  { name: "Analytics Report", format: "PDF", scope: "Revenue cycle metrics", schedule: "Weekly (Mon 8:00)", lastExport: "2026-02-24 08:00" },
  { name: "Full Backup", format: "pg_dump", scope: "Complete database snapshot", schedule: "Daily (02:00)", lastExport: "2026-03-01 02:00" },
];

const BACKUP_INFO: BackupInfo[] = [
  { name: "RDS Snapshot", frequency: "Daily", lastBackup: "2026-03-01 02:00", detail: "Test restore completed 03:30", retention: "35 days", health: "healthy", icon: Database },
  { name: "S3 Cross-Region", frequency: "Continuous", lastBackup: "2026-03-01 14:30", detail: "us-east-1 to us-west-2 replication", retention: "365 days", health: "healthy", icon: Globe },
  { name: "Redis Snapshot", frequency: "Every 6h", lastBackup: "2026-03-01 12:00", detail: "ElastiCache automatic backup", retention: "7 days", health: "healthy", icon: Server },
  { name: "Audit Log Archive", frequency: "Monthly", lastBackup: "2026-02-28 00:00", detail: "Compressed and moved to S3 Glacier", retention: "6 years (HIPAA)", health: "healthy", icon: Archive },
];

const TENANT_MIGRATIONS: TenantMigration[] = [
  {
    tenant: "Sunshine Orthopedics",
    currentVersion: "v42",
    latestVersion: "v42",
    pending: 0,
    status: "up-to-date",
    history: [
      { version: "v42", date: "2026-02-28", description: "Add device_readings index" },
      { version: "v41", date: "2026-02-21", description: "Add field_encryption columns" },
      { version: "v40", date: "2026-02-14", description: "Create context_cache table" },
    ],
  },
  {
    tenant: "Palm Beach Dermatology",
    currentVersion: "v42",
    latestVersion: "v42",
    pending: 0,
    status: "up-to-date",
    history: [
      { version: "v42", date: "2026-02-28", description: "Add device_readings index" },
      { version: "v41", date: "2026-02-21", description: "Add field_encryption columns" },
    ],
  },
  {
    tenant: "Miami Spine Center",
    currentVersion: "v41",
    latestVersion: "v42",
    pending: 1,
    status: "pending",
    history: [
      { version: "v41", date: "2026-02-21", description: "Add field_encryption columns" },
      { version: "v40", date: "2026-02-14", description: "Create context_cache table" },
    ],
  },
];

const RETENTION_POLICIES: RetentionPolicy[] = [
  { category: "Clinical Records", period: "10 years", regulation: "FL State Law", autoPurge: "manual", status: "Active" },
  { category: "Audit Logs", period: "6 years", regulation: "HIPAA", autoPurge: "auto-archive", status: "Active" },
  { category: "Session Logs", period: "90 days", regulation: "Internal Policy", autoPurge: "auto-purge", status: "Active" },
  { category: "Device Readings", period: "2 years", regulation: "Internal Policy", autoPurge: "auto-archive", status: "Active" },
  { category: "Cache Data", period: "TTL-based", regulation: "N/A", autoPurge: "auto-evict", status: "Active" },
  { category: "LLM Traces", period: "1 year", regulation: "Internal Policy", autoPurge: "auto-purge", status: "Active" },
];

// --- Helpers ---

const TABS = [
  { key: "import" as const, label: "Import", icon: Upload },
  { key: "export" as const, label: "Export", icon: Download },
  { key: "backup" as const, label: "Backup & Recovery", icon: HardDrive },
  { key: "migrations" as const, label: "Schema Migrations", icon: GitBranch },
  { key: "retention" as const, label: "Data Retention", icon: Trash2 },
];

const IMPORT_STATUS_STYLES: Record<ImportStatus, { bg: string; text: string; label: string }> = {
  complete: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Complete" },
  "in-progress": { bg: "bg-amber-50", text: "text-amber-700", label: "In Progress" },
  failed: { bg: "bg-red-50", text: "text-red-700", label: "Failed" },
};

const PURGE_LABELS: Record<RetentionPurge, { label: string; style: string }> = {
  manual: { label: "Manual", style: "bg-gray-50 text-gray-700" },
  "auto-archive": { label: "Auto-archive", style: "bg-blue-50 text-blue-700" },
  "auto-purge": { label: "Auto-purge", style: "bg-red-50 text-red-700" },
  "auto-evict": { label: "Auto-evict", style: "bg-amber-50 text-amber-700" },
};

// --- Tab Components ---

function ImportTab() {
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep] = useState(0);

  return (
    <div className="space-y-6">
      {/* Import Types Grid */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-3">Import Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {IMPORT_TYPES.map((imp) => {
            const ImpIcon = imp.icon;
            return (
              <div
                key={imp.name}
                className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-medos-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--medos-primary-light)]">
                    <ImpIcon className="w-4.5 h-4.5 text-[var(--medos-primary)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{imp.name}</p>
                    <p className="text-[10px] text-[var(--medos-gray-500)] mt-0.5">{imp.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--medos-gray-50)] text-[var(--medos-gray-700)]">
                      {imp.format}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      {imp.status}
                    </span>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
                    <Upload className="w-3 h-3" />
                    Start Import
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Import Wizard Preview */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <button
          onClick={() => setShowWizard(!showWizard)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--medos-gray-50)] transition-all"
        >
          <div className="flex items-center gap-3">
            {showWizard ? (
              <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
            )}
            <span className="text-sm font-semibold text-[var(--medos-navy)]">Import Wizard Preview</span>
            <span className="text-xs text-[var(--medos-gray-500)]">7-step guided import process</span>
          </div>
        </button>
        {showWizard && (
          <div className="px-5 pb-5 border-t border-[var(--medos-gray-100)] pt-4">
            <div className="flex items-center justify-between">
              {IMPORT_WIZARD_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-0 flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                        i === wizardStep
                          ? "bg-[var(--medos-primary)] text-white border-[var(--medos-primary)]"
                          : i < wizardStep
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-white text-[var(--medos-gray-400)] border-[var(--medos-gray-300)]"
                      )}
                    >
                      {i < wizardStep ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--medos-gray-500)] mt-1.5 text-center whitespace-nowrap">
                      {step}
                    </span>
                  </div>
                  {i < IMPORT_WIZARD_STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2 mt-[-16px]",
                      i < wizardStep ? "bg-emerald-500" : "bg-[var(--medos-gray-200)]"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Imports */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-3">Recent Imports</h3>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--medos-gray-100)]">
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Date</th>
                  <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Type</th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Records</th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Created</th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Matched</th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Dups</th>
                  <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Errors</th>
                  <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--medos-gray-100)]">
                {RECENT_IMPORTS.map((imp) => {
                  const statusInfo = IMPORT_STATUS_STYLES[imp.status];
                  return (
                    <tr key={imp.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                      <td className="px-5 py-3 text-xs font-mono text-[var(--medos-gray-600)]">{imp.date}</td>
                      <td className="px-5 py-3 text-sm font-medium text-[var(--medos-navy)]">{imp.type}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-[var(--medos-gray-900)] text-right tabular-nums">{imp.totalRecords.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-emerald-600 text-right tabular-nums">{imp.created.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-blue-600 text-right tabular-nums">{imp.matched}</td>
                      <td className="px-5 py-3 text-sm text-amber-600 text-right tabular-nums">{imp.duplicates}</td>
                      <td className="px-5 py-3 text-sm text-right tabular-nums">
                        <span className={imp.errors > 0 ? "text-red-600 font-semibold" : "text-[var(--medos-gray-400)]"}>
                          {imp.errors}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          statusInfo.bg, statusInfo.text
                        )}>
                          {statusInfo.label}
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
    </div>
  );
}

function ExportTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Export Types</h3>
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Export Type</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Format</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Scope</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Schedule</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Last Export</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {EXPORT_TYPES.map((exp) => (
                <tr key={exp.name} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-5 py-3 text-sm font-medium text-[var(--medos-navy)]">{exp.name}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--medos-gray-50)] text-[var(--medos-gray-700)]">
                      {exp.format}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--medos-gray-600)]">{exp.scope}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                      exp.schedule === "On-demand"
                        ? "bg-gray-50 text-gray-700"
                        : "bg-blue-50 text-blue-700"
                    )}>
                      {exp.schedule.startsWith("Weekly") || exp.schedule.startsWith("Daily") ? (
                        <Clock className="w-3 h-3 mr-1" />
                      ) : null}
                      {exp.schedule}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-[var(--medos-gray-600)]">{exp.lastExport}</td>
                  <td className="px-5 py-3 text-center">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
                      <Download className="w-3 h-3" />
                      Export Now
                    </button>
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

function BackupTab() {
  return (
    <div className="space-y-6">
      {/* Backup Cards */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-3">Backup Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BACKUP_INFO.map((backup) => {
            const BackupIcon = backup.icon;
            return (
              <div
                key={backup.name}
                className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-medos-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--medos-primary-light)]">
                      <BackupIcon className="w-4.5 h-4.5 text-[var(--medos-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--medos-navy)]">{backup.name}</p>
                      <p className="text-[10px] text-[var(--medos-gray-500)]">{backup.detail}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Healthy
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Frequency</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] mt-0.5">{backup.frequency}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Last Backup</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] mt-0.5">{backup.lastBackup}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Retention</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)] mt-0.5">{backup.retention}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RPO / RTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-emerald-200 shadow-medos-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Recovery Point Objective (RPO)</p>
              <p className="text-2xl font-bold text-[var(--medos-navy)] mt-1">15 minutes</p>
              <p className="text-xs text-emerald-600 mt-1">Within target</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 shadow-medos-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Recovery Time Objective (RTO)</p>
              <p className="text-2xl font-bold text-[var(--medos-navy)] mt-1">1 hour</p>
              <p className="text-xs text-emerald-600 mt-1">Within target</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all shadow-medos-sm">
          <HardDrive className="w-4 h-4" />
          Trigger Manual Backup
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--medos-gray-300)] text-sm font-semibold text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all">
          <RefreshCw className="w-4 h-4" />
          Test Restore
        </button>
      </div>
    </div>
  );
}

function MigrationsTab() {
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  const toggleTenant = (name: string) => {
    setExpandedTenants((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Per-Tenant Migration Status</h3>
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Tenant</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Current</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Latest</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Pending</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Status</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {TENANT_MIGRATIONS.map((tenant) => {
                const isExpanded = expandedTenants.has(tenant.tenant);
                return (
                  <>
                    <tr key={tenant.tenant} className="hover:bg-[var(--medos-gray-50)] transition-all">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleTenant(tenant.tenant)}
                          className="flex items-center gap-2"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                          )}
                          <span className="text-sm font-medium text-[var(--medos-navy)]">{tenant.tenant}</span>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center text-sm font-mono text-[var(--medos-gray-700)]">{tenant.currentVersion}</td>
                      <td className="px-5 py-3 text-center text-sm font-mono text-[var(--medos-gray-700)]">{tenant.latestVersion}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          tenant.pending > 0 ? "text-amber-600" : "text-[var(--medos-gray-400)]"
                        )}>
                          {tenant.pending}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          tenant.status === "up-to-date"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        )}>
                          {tenant.status === "up-to-date" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {tenant.status === "up-to-date" ? "Up to date" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {tenant.pending > 0 && (
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
                            <Play className="w-3 h-3" />
                            Run Migration
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${tenant.tenant}-history`}>
                        <td colSpan={6} className="px-5 pb-4 pt-1 bg-[var(--medos-gray-50)]">
                          <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-2 ml-6">
                            Migration History
                          </p>
                          <div className="ml-6 space-y-1.5">
                            {tenant.history.map((h) => (
                              <div key={h.version} className="flex items-center gap-3">
                                <span className="text-xs font-mono font-semibold text-[var(--medos-primary)] w-8">{h.version}</span>
                                <span className="text-xs font-mono text-[var(--medos-gray-400)] w-24">{h.date}</span>
                                <span className="text-xs text-[var(--medos-gray-600)]">{h.description}</span>
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

function RetentionTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Data Retention Policies</h3>
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Data Category</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Retention Period</th>
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Regulation</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Auto-Purge</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Status</th>
                <th className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {RETENTION_POLICIES.map((policy) => {
                const purgeInfo = PURGE_LABELS[policy.autoPurge];
                return (
                  <tr key={policy.category} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-5 py-3 text-sm font-medium text-[var(--medos-navy)]">{policy.category}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-[var(--medos-gray-900)]">{policy.period}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                        policy.regulation === "HIPAA"
                          ? "bg-red-50 text-red-700"
                          : policy.regulation === "FL State Law"
                            ? "bg-violet-50 text-violet-700"
                            : policy.regulation === "N/A"
                              ? "bg-gray-50 text-gray-500"
                              : "bg-blue-50 text-blue-700"
                      )}>
                        {policy.regulation === "HIPAA" && <Shield className="w-3 h-3 mr-1" />}
                        {policy.regulation}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                        purgeInfo.style
                      )}>
                        {purgeInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {policy.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all">
                        <Pencil className="w-3 h-3" />
                        Edit Policy
                      </button>
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

export default function AdminDataPage() {
  const [activeTab, setActiveTab] = useState<DataTabKey>("import");

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Database className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Data Management</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Import, export, backup, migrations, and retention policies
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
      {activeTab === "import" && <ImportTab />}
      {activeTab === "export" && <ExportTab />}
      {activeTab === "backup" && <BackupTab />}
      {activeTab === "migrations" && <MigrationsTab />}
      {activeTab === "retention" && <RetentionTab />}
    </div>
  );
}
