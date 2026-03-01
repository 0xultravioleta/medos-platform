"use client";

import { useState } from "react";
import {
  Receipt,
  FileText,
  Building2,
  Plug,
  ShieldAlert,
  Code2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Upload,
  Plus,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  DollarSign,
  Calendar,
  Clock,
  Hash,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =============================================
   TYPES
   ============================================= */

type TabKey = "payers" | "fees" | "clearinghouse" | "scrubbing" | "coding";
type ConnectionStatus = "connected" | "disconnected" | "pending";
type RuleSeverity = "error" | "warning";

interface PayerContract {
  id: string;
  payerName: string;
  payerId: string;
  status: "active" | "inactive";
  effectiveDate: string;
  terminationDate: string;
  timelyFilingDays: number;
  paCptCodes: string[];
  clearinghouse: string;
  feeSnippet: { cpt: string; description: string; allowed: number }[];
}

interface FeeScheduleRow {
  cpt: string;
  description: string;
  medicare: number;
  uhc: number;
  aetna: number;
  bcbs: number;
  selfPay: number;
}

interface ClearinghouseConnection {
  id: string;
  name: string;
  transaction: string;
  transactionCode: string;
  clearinghouse: string;
  protocol: string;
  status: ConnectionStatus;
  lastSuccess: string;
}

interface ScrubbingRule {
  id: string;
  name: string;
  category: string;
  severity: RuleSeverity;
  active: boolean;
  description: string;
}

interface CodingSetting {
  id: string;
  setting: string;
  value: string;
  scope: string;
  type: "text" | "toggle" | "slider";
}

/* =============================================
   MOCK DATA
   ============================================= */

const PAYER_CONTRACTS: PayerContract[] = [
  {
    id: "PAY-001",
    payerName: "UnitedHealthcare",
    payerId: "87726",
    status: "active",
    effectiveDate: "2025-01-01",
    terminationDate: "2026-12-31",
    timelyFilingDays: 180,
    paCptCodes: ["27447", "27130", "29881"],
    clearinghouse: "Change Healthcare",
    feeSnippet: [
      { cpt: "99213", description: "Office Visit (Est, Moderate)", allowed: 112.50 },
      { cpt: "27447", description: "Total Knee Replacement", allowed: 1842.00 },
      { cpt: "29881", description: "Knee Arthroscopy", allowed: 985.00 },
    ],
  },
  {
    id: "PAY-002",
    payerName: "Aetna",
    payerId: "60054",
    status: "active",
    effectiveDate: "2025-03-01",
    terminationDate: "2027-02-28",
    timelyFilingDays: 120,
    paCptCodes: ["27447", "27130", "22633"],
    clearinghouse: "Availity",
    feeSnippet: [
      { cpt: "99213", description: "Office Visit (Est, Moderate)", allowed: 108.75 },
      { cpt: "27447", description: "Total Knee Replacement", allowed: 1780.00 },
      { cpt: "22633", description: "Lumbar Fusion", allowed: 2150.00 },
    ],
  },
  {
    id: "PAY-003",
    payerName: "Medicare Part B",
    payerId: "00882",
    status: "active",
    effectiveDate: "2026-01-01",
    terminationDate: "2026-12-31",
    timelyFilingDays: 365,
    paCptCodes: [],
    clearinghouse: "Change Healthcare",
    feeSnippet: [
      { cpt: "99213", description: "Office Visit (Est, Moderate)", allowed: 99.42 },
      { cpt: "27447", description: "Total Knee Replacement", allowed: 1654.32 },
      { cpt: "20610", description: "Joint Injection (Major)", allowed: 78.90 },
    ],
  },
];

const FEE_SCHEDULE: FeeScheduleRow[] = [
  { cpt: "99213", description: "Office Visit (Est, Moderate)", medicare: 99.42, uhc: 112.50, aetna: 108.75, bcbs: 105.00, selfPay: 175.00 },
  { cpt: "99214", description: "Office Visit (Est, High)", medicare: 147.68, uhc: 165.00, aetna: 158.25, bcbs: 155.00, selfPay: 250.00 },
  { cpt: "99203", description: "Office Visit (New, Low)", medicare: 112.85, uhc: 128.00, aetna: 124.50, bcbs: 120.00, selfPay: 200.00 },
  { cpt: "20610", description: "Joint Injection (Major)", medicare: 78.90, uhc: 92.00, aetna: 88.50, bcbs: 85.00, selfPay: 150.00 },
  { cpt: "27447", description: "Total Knee Replacement", medicare: 1654.32, uhc: 1842.00, aetna: 1780.00, bcbs: 1720.00, selfPay: 2800.00 },
  { cpt: "29881", description: "Knee Arthroscopy", medicare: 892.45, uhc: 985.00, aetna: 960.00, bcbs: 940.00, selfPay: 1500.00 },
  { cpt: "27130", description: "Total Hip Replacement", medicare: 1587.20, uhc: 1790.00, aetna: 1740.00, bcbs: 1680.00, selfPay: 2750.00 },
  { cpt: "22633", description: "Lumbar Fusion", medicare: 1845.00, uhc: 2100.00, aetna: 2150.00, bcbs: 2050.00, selfPay: 3200.00 },
];

const CLEARINGHOUSE_CONNECTIONS: ClearinghouseConnection[] = [
  { id: "CH-001", name: "Claims 837P", transaction: "Professional Claims", transactionCode: "837P", clearinghouse: "Change Healthcare", protocol: "SFTP / AS2", status: "connected", lastSuccess: "2026-03-01T09:30:00Z" },
  { id: "CH-002", name: "Eligibility 270/271", transaction: "Eligibility Inquiry", transactionCode: "270/271", clearinghouse: "Change Healthcare", protocol: "REST API", status: "connected", lastSuccess: "2026-03-01T10:15:00Z" },
  { id: "CH-003", name: "Remittance 835", transaction: "ERA/Remittance", transactionCode: "835", clearinghouse: "Change Healthcare", protocol: "SFTP", status: "connected", lastSuccess: "2026-03-01T06:00:00Z" },
  { id: "CH-004", name: "Prior Auth 278", transaction: "Prior Authorization", transactionCode: "278", clearinghouse: "Availity", protocol: "REST API", status: "connected", lastSuccess: "2026-02-28T16:45:00Z" },
];

const SCRUBBING_RULES: ScrubbingRule[] = [
  { id: "SCR-001", name: "Missing NPI", category: "Provider", severity: "error", active: true, description: "Reject claims without valid rendering provider NPI" },
  { id: "SCR-002", name: "Missing Diagnosis Pointer", category: "Coding", severity: "error", active: true, description: "Ensure all service lines have at least one ICD-10 diagnosis pointer" },
  { id: "SCR-003", name: "Invalid Place of Service", category: "Claim", severity: "error", active: true, description: "Validate POS code matches service type and CPT requirements" },
  { id: "SCR-004", name: "Gender-Diagnosis Mismatch", category: "Coding", severity: "warning", active: true, description: "Flag gender-specific ICD-10 codes that conflict with patient demographics" },
  { id: "SCR-005", name: "Duplicate Claim", category: "Claim", severity: "warning", active: true, description: "Detect identical claims within 30-day window (same patient, DOS, CPT)" },
  { id: "SCR-006", name: "Timely Filing Risk", category: "Claim", severity: "warning", active: true, description: "Alert when claim is within 30 days of payer timely filing deadline" },
  { id: "SCR-007", name: "Modifier Required", category: "Coding", severity: "error", active: true, description: "Flag CPT codes that require modifiers per payer-specific rules (e.g., 59, 25, LT/RT)" },
];

const CODING_SETTINGS: CodingSetting[] = [
  { id: "CS-001", setting: "Default ICD-10 Favorites", value: "M17.11, M17.12, M54.5, M79.3, G89.29", scope: "Practice-wide", type: "text" },
  { id: "CS-002", setting: "Default CPT Favorites", value: "99213, 99214, 20610, 27447, 29881", scope: "Practice-wide", type: "text" },
  { id: "CS-003", setting: "Default Modifiers", value: "25, 59, LT, RT, 76", scope: "Practice-wide", type: "text" },
  { id: "CS-004", setting: "AI Coding Confidence Threshold", value: "0.85", scope: "All agents", type: "slider" },
  { id: "CS-005", setting: "Auto-suggest Codes", value: "true", scope: "Clinical Scribe", type: "toggle" },
  { id: "CS-006", setting: "Coding Audit Frequency", value: "Weekly", scope: "Compliance", type: "text" },
];

/* =============================================
   HELPERS
   ============================================= */

const TABS = [
  { key: "payers" as const, label: "Payer Contracts", icon: Building2 },
  { key: "fees" as const, label: "Fee Schedules", icon: DollarSign },
  { key: "clearinghouse" as const, label: "Clearinghouse", icon: Plug },
  { key: "scrubbing" as const, label: "Scrubbing Rules", icon: ShieldAlert },
  { key: "coding" as const, label: "Coding", icon: Code2 },
];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

/* =============================================
   TAB COMPONENTS
   ============================================= */

function PayerContractsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">{PAYER_CONTRACTS.length} active contracts</p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Add Payer
        </button>
      </div>

      <div className="space-y-3">
        {PAYER_CONTRACTS.map((payer) => (
          <div key={payer.id} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
            {/* Main Row */}
            <button
              onClick={() => toggle(payer.id)}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--medos-gray-50)] transition-all text-left"
            >
              <div className={cn("transition-transform", expanded === payer.id && "rotate-90")}>
                <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-4 items-center">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">{payer.payerName}</p>
                  <p className="text-xs text-[var(--medos-gray-500)]">ID: {payer.payerId}</p>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[var(--medos-gray-500)]">Effective</p>
                  <p className="text-sm text-[var(--medos-gray-700)]">{formatDate(payer.effectiveDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--medos-gray-500)]">Termination</p>
                  <p className="text-sm text-[var(--medos-gray-700)]">{formatDate(payer.terminationDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--medos-gray-500)]">Timely Filing</p>
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">{payer.timelyFilingDays} days</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--medos-gray-500)]">Clearinghouse</p>
                  <p className="text-sm text-[var(--medos-gray-700)]">{payer.clearinghouse}</p>
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            {expanded === payer.id && (
              <div className="border-t border-[var(--medos-gray-100)] px-6 py-4 bg-[var(--medos-gray-50)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PA Required CPTs */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Prior Auth Required CPTs</h4>
                    {payer.paCptCodes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {payer.paCptCodes.map((cpt) => (
                          <span key={cpt} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-mono font-medium border border-amber-200">
                            {cpt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--medos-gray-500)]">No PA requirements configured</p>
                    )}
                  </div>

                  {/* Fee Schedule Snippet */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Fee Schedule (Sample)</h4>
                    <div className="space-y-1.5">
                      {payer.feeSnippet.map((row) => (
                        <div key={row.cpt} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-[var(--medos-primary)]">{row.cpt}</code>
                            <span className="text-[var(--medos-gray-600)]">{row.description}</span>
                          </div>
                          <span className="font-semibold text-[var(--medos-navy)] tabular-nums">{formatCurrency(row.allowed)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeeScheduleTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">{FEE_SCHEDULE.length} CPT codes configured</p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--medos-gray-300)] text-[var(--medos-gray-700)] text-sm font-medium hover:bg-[var(--medos-gray-50)] transition-all">
          <Upload className="w-4 h-4" />
          Import CSV/Excel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">CPT</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Description</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Medicare</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">UHC</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Aetna</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">BCBS</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3">Self-Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {FEE_SCHEDULE.map((row) => (
                <tr key={row.cpt} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-3">
                    <code className="text-sm font-mono font-semibold text-[var(--medos-primary)]">{row.cpt}</code>
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)]">{row.description}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-[var(--medos-gray-700)]">{formatCurrency(row.medicare)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-[var(--medos-gray-700)]">{formatCurrency(row.uhc)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-[var(--medos-gray-700)]">{formatCurrency(row.aetna)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-[var(--medos-gray-700)]">{formatCurrency(row.bcbs)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono tabular-nums font-semibold text-[var(--medos-navy)]">{formatCurrency(row.selfPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClearinghouseTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">X12 EDI clearinghouse connections for claims processing</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CLEARINGHOUSE_CONNECTIONS.map((conn) => {
          const isConnected = conn.status === "connected";
          return (
            <div
              key={conn.id}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-medos-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg",
                    isConnected ? "bg-emerald-50" : "bg-red-50"
                  )}>
                    {isConnected ? (
                      <Wifi className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{conn.name}</p>
                    <p className="text-xs text-[var(--medos-gray-500)]">{conn.transaction}</p>
                  </div>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-red-500")} />
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Clearinghouse</span>
                  <span className="text-sm text-[var(--medos-gray-700)]">{conn.clearinghouse}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Protocol</span>
                  <span className="text-sm font-mono text-[var(--medos-gray-700)]">{conn.protocol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Transaction</span>
                  <code className="text-sm font-mono text-[var(--medos-primary)]">{conn.transactionCode}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--medos-gray-500)]">Last Successful</span>
                  <span className="text-sm text-[var(--medos-gray-700)]">{formatTimestamp(conn.lastSuccess)}</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--medos-gray-300)] text-[var(--medos-gray-700)] text-sm font-medium hover:bg-[var(--medos-gray-50)] transition-all">
                <RefreshCw className="w-4 h-4" />
                Test Connection
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScrubbingRulesTab() {
  const [rules, setRules] = useState(SCRUBBING_RULES);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {rules.filter((r) => r.active).length} of {rules.length} rules active
        </p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Add Custom Rule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Rule Name</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Category</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Severity</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-3">
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{rule.name}</p>
                    <p className="text-[10px] text-[var(--medos-gray-400)]">{rule.id}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--medos-primary-light)] text-[var(--medos-primary)] text-xs font-medium">
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {rule.severity === "error" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                        <XCircle className="w-3 h-3" />
                        Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Warning
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleRule(rule.id)} className="inline-flex items-center gap-1.5">
                      {rule.active ? (
                        <>
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-700">Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-6 h-6 text-[var(--medos-gray-400)]" />
                          <span className="text-xs font-medium text-[var(--medos-gray-500)]">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)] max-w-xs">{rule.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CodingTab() {
  const [settings, setSettings] = useState(CODING_SETTINGS);
  const [sliderValue, setSliderValue] = useState(0.85);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, value: s.value === "true" ? "false" : "true" } : s
      )
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">Clinical coding preferences and AI-assisted coding configuration</p>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3 w-64">Setting</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Value</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3 w-36">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {settings.map((setting) => (
                <tr key={setting.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-3">
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{setting.setting}</p>
                  </td>
                  <td className="px-6 py-3">
                    {setting.type === "toggle" ? (
                      <button
                        onClick={() => toggleSetting(setting.id)}
                        className="inline-flex items-center gap-1.5"
                      >
                        {setting.value === "true" ? (
                          <>
                            <ToggleRight className="w-6 h-6 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700">Enabled</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-6 h-6 text-[var(--medos-gray-400)]" />
                            <span className="text-xs font-medium text-[var(--medos-gray-500)]">Disabled</span>
                          </>
                        )}
                      </button>
                    ) : setting.type === "slider" ? (
                      <div className="flex items-center gap-3 max-w-xs">
                        <input
                          type="range"
                          min="0.80"
                          max="1.00"
                          step="0.01"
                          value={sliderValue}
                          onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                          className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-[var(--medos-primary)]"
                          style={{ background: `linear-gradient(to right, var(--medos-primary) ${(sliderValue - 0.80) / 0.20 * 100}%, var(--medos-gray-200) ${(sliderValue - 0.80) / 0.20 * 100}%)` }}
                        />
                        <span className="text-sm font-mono font-semibold text-[var(--medos-navy)] w-10 text-right tabular-nums">
                          {sliderValue.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {setting.value.split(", ").map((v) => (
                          <code key={v} className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--medos-gray-100)] text-xs font-mono text-[var(--medos-gray-700)]">
                            {v}
                          </code>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-[var(--medos-gray-500)]">{setting.scope}</span>
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

/* =============================================
   MAIN PAGE
   ============================================= */

export default function BillingAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("payers");

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <Receipt className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Billing Administration</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              Payer contracts, fee schedules, clearinghouse connections, and coding configuration
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{PAYER_CONTRACTS.length}</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Active Payers</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-emerald-600">{FEE_SCHEDULE.length}</p>
          <p className="text-xs text-[var(--medos-gray-500)]">CPT Codes</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-emerald-600">4/4</p>
          <p className="text-xs text-[var(--medos-gray-500)]">EDI Connected</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-[var(--medos-primary)]">{SCRUBBING_RULES.length}</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Scrubbing Rules</p>
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

      {/* Tab content */}
      {activeTab === "payers" && <PayerContractsTab />}
      {activeTab === "fees" && <FeeScheduleTab />}
      {activeTab === "clearinghouse" && <ClearinghouseTab />}
      {activeTab === "scrubbing" && <ScrubbingRulesTab />}
      {activeTab === "coding" && <CodingTab />}
    </div>
  );
}
