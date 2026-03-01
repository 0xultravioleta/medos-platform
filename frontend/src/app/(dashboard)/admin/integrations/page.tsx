"use client";

import { useState } from "react";
import {
  Plug,
  Server,
  Watch,
  TestTube2,
  Pill,
  AppWindow,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Plus,
  Activity,
  Smartphone,
  Heart,
  Droplets,
  Clock,
  Shield,
  Eye,
  Edit,
  ExternalLink,
  Link2,
  Unlink,
  ToggleRight,
  ToggleLeft,
  Lock,
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

/* =============================================
   TYPES
   ============================================= */

type TabKey = "ehr" | "devices" | "lab" | "apps";
type ConnectionStatus = "connected" | "disconnected" | "pending";
type DeviceIntegrationStatus = "active" | "pending_setup";
type AppAccessTier = "read_only" | "read_write";
type AppApprovalStatus = "approved" | "pending_review";

interface EHRConnection {
  id: string;
  name: string;
  ehr: string;
  protocol: string;
  status: ConnectionStatus;
  lastSync: string;
  patientsSynced: number;
  conflicts: number;
  config: {
    fhirBaseUrl: string;
    clientId: string;
    syncSchedule: string;
    conflictResolution: string;
    resourceTypes: string[];
  };
}

interface DeviceIntegration {
  id: string;
  deviceType: string;
  api: string;
  status: DeviceIntegrationStatus;
  registered: number;
  readings24h: number;
  alerts24h: number;
  config: {
    alertThresholds: { metric: string; low?: number; high?: number }[];
    syncMode: string;
    dataRetention: string;
  };
}

interface LabPharmacy {
  id: string;
  name: string;
  protocol: string;
  transactionTypes: string;
  status: "not_configured";
  description: string;
}

interface ThirdPartyApp {
  id: string;
  name: string;
  developer: string;
  accessTier: AppAccessTier;
  toolsGranted: string[];
  approvalStatus: AppApprovalStatus;
  lastActivity: string;
}

/* =============================================
   MOCK DATA
   ============================================= */

const EHR_CONNECTIONS: EHRConnection[] = [
  {
    id: "EHR-001",
    name: "Epic Sandbox",
    ehr: "Epic",
    protocol: "SMART on FHIR R4",
    status: "connected",
    lastSync: "2026-03-01T09:45:00Z",
    patientsSynced: 847,
    conflicts: 3,
    config: {
      fhirBaseUrl: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
      clientId: "medos-epic-sandbox-v1",
      syncSchedule: "Every 15 minutes",
      conflictResolution: "EHR Wins (Default)",
      resourceTypes: ["Patient", "Encounter", "Condition", "Observation", "MedicationRequest", "AllergyIntolerance", "DiagnosticReport"],
    },
  },
  {
    id: "EHR-002",
    name: "Cerner Sandbox",
    ehr: "Cerner",
    protocol: "SMART on FHIR R4",
    status: "disconnected",
    lastSync: "2026-02-25T14:20:00Z",
    patientsSynced: 0,
    conflicts: 0,
    config: {
      fhirBaseUrl: "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
      clientId: "medos-cerner-sandbox-v1",
      syncSchedule: "Not configured",
      conflictResolution: "EHR Wins (Default)",
      resourceTypes: ["Patient", "Encounter", "Condition"],
    },
  },
];

const DEVICE_INTEGRATIONS: DeviceIntegration[] = [
  {
    id: "DEV-INT-001",
    deviceType: "Oura Ring Gen 4",
    api: "Oura Cloud API v2",
    status: "active",
    registered: 12,
    readings24h: 1847,
    alerts24h: 2,
    config: {
      alertThresholds: [
        { metric: "Heart Rate", low: 45, high: 120 },
        { metric: "HRV", low: 20 },
        { metric: "SpO2", low: 92 },
        { metric: "Temperature", high: 38.0 },
      ],
      syncMode: "Batch (every 5 min)",
      dataRetention: "90 days",
    },
  },
  {
    id: "DEV-INT-002",
    deviceType: "Apple Watch Ultra 3",
    api: "Apple HealthKit API",
    status: "active",
    registered: 8,
    readings24h: 3204,
    alerts24h: 1,
    config: {
      alertThresholds: [
        { metric: "Heart Rate", low: 40, high: 130 },
        { metric: "SpO2", low: 90 },
        { metric: "Blood Pressure Sys", high: 140 },
      ],
      syncMode: "Real-time (WebSocket)",
      dataRetention: "90 days",
    },
  },
  {
    id: "DEV-INT-003",
    deviceType: "Dexcom G8 CGM",
    api: "Dexcom Share API v3",
    status: "active",
    registered: 3,
    readings24h: 864,
    alerts24h: 4,
    config: {
      alertThresholds: [
        { metric: "Glucose", low: 70, high: 180 },
        { metric: "Glucose (Urgent Low)", low: 55 },
        { metric: "Glucose (Urgent High)", high: 250 },
      ],
      syncMode: "Real-time (5 min intervals)",
      dataRetention: "180 days",
    },
  },
  {
    id: "DEV-INT-004",
    deviceType: "Withings BPM Core",
    api: "Withings Health API v2",
    status: "pending_setup",
    registered: 0,
    readings24h: 0,
    alerts24h: 0,
    config: {
      alertThresholds: [
        { metric: "Systolic BP", high: 140 },
        { metric: "Diastolic BP", high: 90 },
        { metric: "Heart Rate", low: 45, high: 120 },
      ],
      syncMode: "Not configured",
      dataRetention: "90 days",
    },
  },
];

const LAB_PHARMACY: LabPharmacy[] = [
  {
    id: "LAB-001",
    name: "Quest Diagnostics",
    protocol: "HL7v2 ORU/ORM",
    transactionTypes: "Lab Orders (ORM) / Lab Results (ORU)",
    status: "not_configured",
    description: "Bi-directional lab order/result interface for comprehensive metabolic panels, CBC, and specialty labs",
  },
  {
    id: "PH-001",
    name: "Walgreens Pharmacy",
    protocol: "NCPDP SCRIPT",
    transactionTypes: "New Rx / Refill Request / Rx Change",
    status: "not_configured",
    description: "Electronic prescribing via NCPDP SCRIPT standard for medication orders and refill management",
  },
];

const THIRD_PARTY_APPS: ThirdPartyApp[] = [
  {
    id: "APP-001",
    name: "DermAI Image Analysis",
    developer: "DermAI Inc.",
    accessTier: "read_write",
    toolsGranted: ["fhir_read", "fhir_search", "observation_create", "diagnostic_report_create"],
    approvalStatus: "approved",
    lastActivity: "2026-03-01T08:30:00Z",
  },
  {
    id: "APP-002",
    name: "Coding Audit Pro",
    developer: "MedCode Solutions",
    accessTier: "read_only",
    toolsGranted: ["fhir_search", "encounter_read", "claim_read"],
    approvalStatus: "pending_review",
    lastActivity: "2026-02-28T16:45:00Z",
  },
];

/* =============================================
   HELPERS
   ============================================= */

const TABS = [
  { key: "ehr" as const, label: "EHR Connections", icon: Server },
  { key: "devices" as const, label: "Devices", icon: Watch },
  { key: "lab" as const, label: "Lab & Pharmacy", icon: TestTube2 },
  { key: "apps" as const, label: "Third-Party Apps", icon: AppWindow },
];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/* =============================================
   TAB COMPONENTS
   ============================================= */

function EHRConnectionsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">{EHR_CONNECTIONS.length} configured EHR connections</p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Add EHR
        </button>
      </div>

      <div className="space-y-3">
        {EHR_CONNECTIONS.map((ehr) => {
          const isConnected = ehr.status === "connected";
          const isExpanded = expanded === ehr.id;

          return (
            <div key={ehr.id} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
              {/* Main Row */}
              <button
                onClick={() => toggle(ehr.id)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--medos-gray-50)] transition-all text-left"
              >
                <div className={cn("transition-transform", isExpanded && "rotate-90")}>
                  <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
                </div>
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
                  isConnected ? "bg-emerald-50" : "bg-red-50"
                )}>
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{ehr.name}</p>
                    <p className="text-xs text-[var(--medos-gray-500)]">{ehr.ehr} -- {ehr.protocol}</p>
                  </div>
                  <div>
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
                  <div>
                    <p className="text-xs text-[var(--medos-gray-500)]">Last Sync</p>
                    <p className="text-sm text-[var(--medos-gray-700)]">{formatTimestamp(ehr.lastSync)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--medos-gray-500)]">Patients</p>
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{ehr.patientsSynced.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--medos-gray-500)]">Conflicts</p>
                    <p className={cn("text-sm font-semibold", ehr.conflicts > 0 ? "text-amber-600" : "text-emerald-600")}>
                      {ehr.conflicts}
                    </p>
                  </div>
                </div>
              </button>

              {/* Expanded Config */}
              {isExpanded && (
                <div className="border-t border-[var(--medos-gray-100)] px-6 py-5 bg-[var(--medos-gray-50)]">
                  <h4 className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-4">Connection Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">FHIR Base URL</label>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-[var(--medos-gray-200)] px-3 py-2">
                          <Link2 className="w-3.5 h-3.5 text-[var(--medos-gray-400)] flex-shrink-0" />
                          <code className="text-xs font-mono text-[var(--medos-gray-700)] break-all">{ehr.config.fhirBaseUrl}</code>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Client ID</label>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-[var(--medos-gray-200)] px-3 py-2">
                          <Lock className="w-3.5 h-3.5 text-[var(--medos-gray-400)] flex-shrink-0" />
                          <code className="text-xs font-mono text-[var(--medos-primary)]">{ehr.config.clientId}</code>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Sync Schedule</label>
                          <select className="w-full h-9 px-3 rounded-lg border border-[var(--medos-gray-300)] bg-white text-xs text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] appearance-none cursor-pointer">
                            <option>{ehr.config.syncSchedule}</option>
                            <option>Every 5 minutes</option>
                            <option>Every 30 minutes</option>
                            <option>Hourly</option>
                            <option>Manual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Conflict Resolution</label>
                          <select className="w-full h-9 px-3 rounded-lg border border-[var(--medos-gray-300)] bg-white text-xs text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] appearance-none cursor-pointer">
                            <option>{ehr.config.conflictResolution}</option>
                            <option>MedOS Wins</option>
                            <option>Manual Review</option>
                            <option>Most Recent Wins</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Resource Types */}
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Synced Resource Types</label>
                      <div className="bg-white rounded-lg border border-[var(--medos-gray-200)] p-3">
                        <div className="grid grid-cols-2 gap-2">
                          {["Patient", "Encounter", "Condition", "Observation", "MedicationRequest", "AllergyIntolerance", "DiagnosticReport", "Procedure", "Immunization", "CarePlan"].map((rt) => {
                            const isEnabled = ehr.config.resourceTypes.includes(rt);
                            return (
                              <label key={rt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  defaultChecked={isEnabled}
                                  className="w-3.5 h-3.5 rounded border-[var(--medos-gray-300)] text-[var(--medos-primary)] focus:ring-[var(--medos-primary)]"
                                />
                                <span className={cn("text-xs", isEnabled ? "text-[var(--medos-gray-700)]" : "text-[var(--medos-gray-400)]")}>
                                  {rt}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-medium hover:bg-[var(--medos-primary-hover)] transition-all">
                          <RefreshCw className="w-3 h-3" />
                          Sync Now
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-[var(--medos-gray-700)] text-xs font-medium hover:bg-[var(--medos-gray-50)] transition-all">
                          <RefreshCw className="w-3 h-3" />
                          Test Connection
                        </button>
                        {!isConnected && (
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-xs font-medium hover:bg-emerald-50 transition-all">
                            <Wifi className="w-3 h-3" />
                            Reconnect
                          </button>
                        )}
                      </div>
                    </div>
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

function DevicesTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">{DEVICE_INTEGRATIONS.length} device integrations configured</p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Add Device Type
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="w-8 px-3 py-3"></th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Device Type</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">API</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Registered</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Readings (24h)</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Alerts (24h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {DEVICE_INTEGRATIONS.map((device) => {
                const isActive = device.status === "active";
                const isExpanded = expanded === device.id;
                const DeviceIcon = device.deviceType.includes("Oura") ? Activity
                  : device.deviceType.includes("Apple") ? Watch
                  : device.deviceType.includes("Dexcom") ? Droplets
                  : Heart;

                return (
                  <React.Fragment key={device.id}>
                    <tr
                      className={cn("cursor-pointer transition-all", isExpanded ? "bg-[var(--medos-gray-50)]" : "hover:bg-[var(--medos-gray-50)]")}
                      onClick={() => toggle(device.id)}
                    >
                      <td className="px-3 py-3 text-center">
                        <div className={cn("transition-transform", isExpanded && "rotate-90")}>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg",
                            isActive ? "bg-[var(--medos-primary-light)]" : "bg-[var(--medos-gray-100)]"
                          )}>
                            <DeviceIcon className={cn("w-4 h-4", isActive ? "text-[var(--medos-primary)]" : "text-[var(--medos-gray-400)]")} />
                          </div>
                          <span className="text-sm font-semibold text-[var(--medos-navy)]">{device.deviceType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)]">{device.api}</td>
                      <td className="px-6 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending Setup
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-semibold tabular-nums text-[var(--medos-navy)]">{device.registered}</td>
                      <td className="px-6 py-3 text-sm text-right font-semibold tabular-nums text-[var(--medos-navy)]">{device.readings24h.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          device.alerts24h > 0 ? "text-amber-600" : "text-emerald-600"
                        )}>
                          {device.alerts24h}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded config row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-[var(--medos-gray-50)] border-t border-[var(--medos-gray-100)]">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Alert Thresholds */}
                            <div>
                              <h4 className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Alert Thresholds</h4>
                              <div className="space-y-1.5">
                                {device.config.alertThresholds.map((t) => (
                                  <div key={t.metric} className="flex items-center justify-between text-xs bg-white rounded-lg border border-[var(--medos-gray-200)] px-3 py-1.5">
                                    <span className="text-[var(--medos-gray-700)]">{t.metric}</span>
                                    <div className="flex items-center gap-2">
                                      {t.low !== undefined && (
                                        <span className="font-mono text-blue-600">Low: {t.low}</span>
                                      )}
                                      {t.high !== undefined && (
                                        <span className="font-mono text-red-600">High: {t.high}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Sync Mode */}
                            <div>
                              <h4 className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Sync Configuration</h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs bg-white rounded-lg border border-[var(--medos-gray-200)] px-3 py-2">
                                  <span className="text-[var(--medos-gray-500)]">Sync Mode</span>
                                  <span className="font-medium text-[var(--medos-gray-700)]">{device.config.syncMode}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs bg-white rounded-lg border border-[var(--medos-gray-200)] px-3 py-2">
                                  <span className="text-[var(--medos-gray-500)]">Data Retention</span>
                                  <span className="font-medium text-[var(--medos-gray-700)]">{device.config.dataRetention}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div>
                              <h4 className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Actions</h4>
                              <div className="flex flex-wrap gap-2">
                                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--medos-primary)] text-white text-xs font-medium hover:bg-[var(--medos-primary-hover)] transition-all">
                                  <RefreshCw className="w-3 h-3" />
                                  Force Sync
                                </button>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-[var(--medos-gray-700)] text-xs font-medium hover:bg-[var(--medos-gray-50)] transition-all">
                                  <Settings className="w-3 h-3" />
                                  Configure
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LabPharmacyTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--medos-gray-500)]">Lab and pharmacy integrations -- configure HL7v2 and NCPDP connections</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LAB_PHARMACY.map((item) => {
          const isLab = item.id.startsWith("LAB");
          return (
            <div key={item.id} className="bg-white rounded-xl border border-dashed border-[var(--medos-gray-300)] shadow-medos-sm p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--medos-gray-100)]">
                  {isLab ? (
                    <TestTube2 className="w-6 h-6 text-[var(--medos-gray-400)]" />
                  ) : (
                    <Pill className="w-6 h-6 text-[var(--medos-gray-400)]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{item.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-500)] border border-[var(--medos-gray-200)]">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-[var(--medos-gray-600)] mb-3">{item.description}</p>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[var(--medos-gray-500)]">Protocol:</span>
                      <code className="font-mono text-[var(--medos-primary)]">{item.protocol}</code>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[var(--medos-gray-500)]">Transactions:</span>
                      <span className="text-[var(--medos-gray-700)]">{item.transactionTypes}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[var(--medos-gray-500)]">Status:</span>
                      <span className="inline-flex items-center gap-1 text-[var(--medos-gray-500)]">
                        <Unlink className="w-3 h-3" />
                        Not Configured
                      </span>
                    </div>
                  </div>

                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--medos-gray-300)] text-[var(--medos-gray-400)] text-sm font-medium cursor-not-allowed bg-[var(--medos-gray-50)]"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThirdPartyAppsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">{THIRD_PARTY_APPS.length} registered applications</p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Register App
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">App Name</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Developer</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Access Tier</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Tools Granted</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {THIRD_PARTY_APPS.map((app) => (
                <tr key={app.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--medos-primary-light)]">
                        <AppWindow className="w-4 h-4 text-[var(--medos-primary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--medos-navy)]">{app.name}</p>
                        <p className="text-[10px] text-[var(--medos-gray-400)]">{app.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)]">{app.developer}</td>
                  <td className="px-6 py-3">
                    {app.accessTier === "read_write" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <Edit className="w-3 h-3" />
                        Read-Write
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                        <Eye className="w-3 h-3" />
                        Read-Only
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {app.toolsGranted.map((tool) => (
                        <span key={tool} className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--medos-gray-100)] text-[10px] font-mono text-[var(--medos-gray-600)]">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {app.approvalStatus === "approved" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        Pending Review
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)]">{formatTimestamp(app.lastActivity)}</td>
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

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ehr");

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <Plug className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Integrations</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              EHR connections, device APIs, lab interfaces, and third-party applications
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-emerald-600">{EHR_CONNECTIONS.filter((e) => e.status === "connected").length}/{EHR_CONNECTIONS.length}</p>
            <Wifi className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-[var(--medos-gray-500)]">EHR Connected</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{DEVICE_INTEGRATIONS.filter((d) => d.status === "active").length}</p>
            <Watch className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <p className="text-xs text-[var(--medos-gray-500)]">Active Device APIs</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-[var(--medos-gray-400)]">0</p>
            <TestTube2 className="w-5 h-5 text-[var(--medos-gray-300)]" />
          </div>
          <p className="text-xs text-[var(--medos-gray-500)]">Lab/Pharmacy</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-[var(--medos-primary)]">{THIRD_PARTY_APPS.length}</p>
            <AppWindow className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <p className="text-xs text-[var(--medos-gray-500)]">Third-Party Apps</p>
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
      {activeTab === "ehr" && <EHRConnectionsTab />}
      {activeTab === "devices" && <DevicesTab />}
      {activeTab === "lab" && <LabPharmacyTab />}
      {activeTab === "apps" && <ThirdPartyAppsTab />}
    </div>
  );
}
