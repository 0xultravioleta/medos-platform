"use client";

import { useState } from "react";
import {
  HeartPulse,
  Bell,
  Smartphone,
  Watch,
  Heart,
  Activity,
  Droplets,
  Moon,
  Footprints,
  Weight,
  Wind,
  Clock,
  Shield,
  ChevronDown,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Battery,
  Bluetooth,
  BluetoothOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "monitoring" | "alerts" | "devices";
type RiskLevel = "high" | "medium" | "low";
type AlertPriority = "P1" | "P2" | "P3";
type AlertAction = "acknowledge" | "escalate" | "dismiss";
type DeviceStatus = "active" | "low-battery" | "disconnected";
type DeviceType = "oura" | "apple-watch" | "dexcom" | "withings-scale";

interface MetricReading {
  label: string;
  value: string;
  unit: string;
  delta?: string;
  severity: "normal" | "warning" | "critical";
  icon: typeof Heart;
}

interface MonitoredPatient {
  id: string;
  name: string;
  facility: string;
  room: string;
  primaryDx: string;
  riskScore: number;
  devices: DeviceType[];
  lastUpdated: string;
  metrics: MetricReading[];
}

interface GuardianAlert {
  id: string;
  priority: AlertPriority;
  timestamp: string;
  patient: string;
  facility: string;
  deviceSource: DeviceType;
  currentReading: string;
  threshold: string;
  description: string;
  recommendedAction: string;
  agentConfidence: number;
  acknowledged: boolean;
}

interface ConnectedDevice {
  id: string;
  type: DeviceType;
  model: string;
  patient: string;
  facility: string;
  battery: number;
  lastSync: string;
  dataPointsToday: number;
  status: DeviceStatus;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof HeartPulse }[] = [
  { key: "monitoring", label: "Live Monitoring", icon: Activity },
  { key: "alerts", label: "Alert Queue", icon: Bell },
  { key: "devices", label: "Device Feeds", icon: Smartphone },
];

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; border: string; dot: string }> = {
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-400" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" },
  low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-400" },
};

const ALERT_STYLES: Record<AlertPriority, { bg: string; text: string; border: string }> = {
  P1: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  P2: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  P3: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
};

const DEVICE_STATUS_STYLES: Record<DeviceStatus, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700" },
  "low-battery": { bg: "bg-amber-50", text: "text-amber-700" },
  disconnected: { bg: "bg-red-50", text: "text-red-700" },
};

const DEVICE_LABELS: Record<DeviceType, { label: string; icon: typeof Watch }> = {
  oura: { label: "Oura Ring", icon: Heart },
  "apple-watch": { label: "Apple Watch", icon: Watch },
  dexcom: { label: "Dexcom G7", icon: Droplets },
  "withings-scale": { label: "Withings Scale", icon: Weight },
};

function getRiskLevel(score: number): RiskLevel {
  if (score > 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

// --- Mock Data ---

const MONITORED_PATIENTS: MonitoredPatient[] = [
  {
    id: "mp-001",
    name: "Margaret Wilson",
    facility: "Sunrise Senior Living",
    room: "214-A",
    primaryDx: "CHF (Congestive Heart Failure)",
    riskScore: 82,
    devices: ["oura", "apple-watch", "withings-scale"],
    lastUpdated: "3m ago",
    metrics: [
      { label: "Weight", value: "168.2", unit: "lbs", delta: "+3.2", severity: "critical", icon: Weight },
      { label: "SpO2", value: "93", unit: "%", delta: "-2", severity: "warning", icon: Wind },
      { label: "HRV", value: "18", unit: "ms", delta: "-22%", severity: "critical", icon: Activity },
      { label: "Sleep", value: "62", unit: "/100", delta: "-8", severity: "warning", icon: Moon },
      { label: "HR Resting", value: "88", unit: "bpm", delta: "+12", severity: "warning", icon: Heart },
      { label: "Steps", value: "847", unit: "steps", delta: "", severity: "normal", icon: Footprints },
    ],
  },
  {
    id: "mp-002",
    name: "James Brown",
    facility: "Sunrise Senior Living",
    room: "108-B",
    primaryDx: "COPD Exacerbation",
    riskScore: 71,
    devices: ["apple-watch"],
    lastUpdated: "8m ago",
    metrics: [
      { label: "SpO2", value: "91", unit: "%", delta: "-4", severity: "critical", icon: Wind },
      { label: "HR Resting", value: "76", unit: "bpm", delta: "+4", severity: "normal", icon: Heart },
      { label: "HRV", value: "24", unit: "ms", delta: "-15%", severity: "warning", icon: Activity },
      { label: "Sleep", value: "58", unit: "/100", delta: "-12", severity: "warning", icon: Moon },
      { label: "Steps", value: "1,230", unit: "steps", delta: "", severity: "normal", icon: Footprints },
      { label: "Resp Rate", value: "22", unit: "/min", delta: "+4", severity: "warning", icon: Wind },
    ],
  },
  {
    id: "mp-003",
    name: "Susan Lee",
    facility: "Oakwood Manor",
    room: "305",
    primaryDx: "CHF with Acute Kidney Injury",
    riskScore: 89,
    devices: ["oura", "apple-watch"],
    lastUpdated: "5m ago",
    metrics: [
      { label: "SpO2", value: "90", unit: "%", delta: "-5", severity: "critical", icon: Wind },
      { label: "HRV", value: "14", unit: "ms", delta: "-28%", severity: "critical", icon: Activity },
      { label: "HR Resting", value: "96", unit: "bpm", delta: "+18", severity: "critical", icon: Heart },
      { label: "Sleep", value: "41", unit: "/100", delta: "-19", severity: "critical", icon: Moon },
      { label: "Steps", value: "312", unit: "steps", delta: "", severity: "warning", icon: Footprints },
      { label: "Temp", value: "99.1", unit: "F", delta: "+0.8", severity: "normal", icon: HeartPulse },
    ],
  },
  {
    id: "mp-004",
    name: "David Kim",
    facility: "Palm Gardens",
    room: "412-A",
    primaryDx: "Diabetes Type 2 (Uncontrolled)",
    riskScore: 64,
    devices: ["dexcom", "oura"],
    lastUpdated: "2m ago",
    metrics: [
      { label: "Glucose", value: "287", unit: "mg/dL", delta: "+92", severity: "critical", icon: Droplets },
      { label: "HRV", value: "32", unit: "ms", delta: "-8%", severity: "normal", icon: Activity },
      { label: "HR Resting", value: "80", unit: "bpm", delta: "+6", severity: "normal", icon: Heart },
      { label: "Sleep", value: "71", unit: "/100", delta: "-3", severity: "normal", icon: Moon },
      { label: "Steps", value: "2,450", unit: "steps", delta: "", severity: "normal", icon: Footprints },
      { label: "Temp", value: "98.6", unit: "F", delta: "", severity: "normal", icon: HeartPulse },
    ],
  },
  {
    id: "mp-005",
    name: "Dorothy Martinez",
    facility: "Willow Creek",
    room: "220",
    primaryDx: "CHF (Decompensated)",
    riskScore: 78,
    devices: ["oura", "apple-watch", "dexcom"],
    lastUpdated: "6m ago",
    metrics: [
      { label: "SpO2", value: "91", unit: "%", delta: "-3", severity: "critical", icon: Wind },
      { label: "HRV", value: "16", unit: "ms", delta: "-20%", severity: "critical", icon: Activity },
      { label: "HR Resting", value: "94", unit: "bpm", delta: "+16", severity: "warning", icon: Heart },
      { label: "Glucose", value: "198", unit: "mg/dL", delta: "+48", severity: "warning", icon: Droplets },
      { label: "Sleep", value: "52", unit: "/100", delta: "-11", severity: "warning", icon: Moon },
      { label: "Steps", value: "580", unit: "steps", delta: "", severity: "normal", icon: Footprints },
    ],
  },
  {
    id: "mp-006",
    name: "Patricia Moore",
    facility: "Willow Creek",
    room: "310",
    primaryDx: "COPD with Oxygen Dependence",
    riskScore: 45,
    devices: ["oura", "apple-watch"],
    lastUpdated: "12m ago",
    metrics: [
      { label: "SpO2", value: "93", unit: "%", delta: "-1", severity: "warning", icon: Wind },
      { label: "HRV", value: "28", unit: "ms", delta: "-5%", severity: "normal", icon: Activity },
      { label: "HR Resting", value: "78", unit: "bpm", delta: "+2", severity: "normal", icon: Heart },
      { label: "Sleep", value: "74", unit: "/100", delta: "+2", severity: "normal", icon: Moon },
      { label: "Steps", value: "1,890", unit: "steps", delta: "", severity: "normal", icon: Footprints },
      { label: "Resp Rate", value: "18", unit: "/min", delta: "+1", severity: "normal", icon: Wind },
    ],
  },
];

const GUARDIAN_ALERTS: GuardianAlert[] = [
  {
    id: "ga-001",
    priority: "P1",
    timestamp: "2:47 PM",
    patient: "Margaret Wilson",
    facility: "Sunrise Senior Living",
    deviceSource: "withings-scale",
    currentReading: "Weight: 168.2 lbs",
    threshold: "+3.2 lbs from baseline 165.0 lbs in 48h",
    description: "Rapid weight gain exceeding 3 lb threshold — high probability of fluid retention in CHF patient",
    recommendedAction: "Contact attending physician immediately for Lasix dose adjustment. Assess bilateral edema and lung sounds. Restrict fluid intake to 1.5L/day.",
    agentConfidence: 0.92,
    acknowledged: false,
  },
  {
    id: "ga-002",
    priority: "P2",
    timestamp: "1:23 PM",
    patient: "James Brown",
    facility: "Sunrise Senior Living",
    deviceSource: "apple-watch",
    currentReading: "SpO2: 91%",
    threshold: "Below 92% for >30 minutes",
    description: "Sustained SpO2 below safe threshold for COPD patient — intermittent desaturation episodes",
    recommendedAction: "Increase supplemental O2 from 2L to 3L NC. Monitor continuously for 2 hours. If no improvement, escalate to attending for nebulizer adjustment.",
    agentConfidence: 0.88,
    acknowledged: false,
  },
  {
    id: "ga-003",
    priority: "P2",
    timestamp: "12:15 PM",
    patient: "Susan Lee",
    facility: "Oakwood Manor",
    deviceSource: "oura",
    currentReading: "HRV: 14ms (decreased 28% overnight)",
    threshold: "HRV decrease >20% in 24h",
    description: "Significant HRV decline indicating autonomic stress — correlates with troponin rise and AKI in CHF patient",
    recommendedAction: "Alert cardiology to HRV trend data alongside troponin results. Consider continuous telemetry. Reassess hemodynamic status.",
    agentConfidence: 0.91,
    acknowledged: true,
  },
  {
    id: "ga-004",
    priority: "P3",
    timestamp: "11:42 AM",
    patient: "David Kim",
    facility: "Palm Gardens",
    deviceSource: "dexcom",
    currentReading: "Blood glucose: 287 mg/dL",
    threshold: "Above 250 mg/dL for >2 hours",
    description: "Persistent hyperglycemia exceeding target range — Dexcom G7 shows rising trend since 9 AM",
    recommendedAction: "Verify insulin sliding scale was administered correctly. Check for missed dose. Contact endocrine if glucose remains >250 after correction dose.",
    agentConfidence: 0.87,
    acknowledged: false,
  },
];

const CONNECTED_DEVICES: ConnectedDevice[] = [
  { id: "cd-001", type: "oura", model: "Oura Ring Gen 3", patient: "Margaret Wilson", facility: "Sunrise Senior Living", battery: 72, lastSync: "3m ago", dataPointsToday: 1284, status: "active" },
  { id: "cd-002", type: "apple-watch", model: "Apple Watch Ultra 2", patient: "Margaret Wilson", facility: "Sunrise Senior Living", battery: 45, lastSync: "3m ago", dataPointsToday: 2156, status: "active" },
  { id: "cd-003", type: "withings-scale", model: "Withings Body+", patient: "Margaret Wilson", facility: "Sunrise Senior Living", battery: 89, lastSync: "6h ago", dataPointsToday: 2, status: "active" },
  { id: "cd-004", type: "apple-watch", model: "Apple Watch Series 9", patient: "James Brown", facility: "Sunrise Senior Living", battery: 18, lastSync: "8m ago", dataPointsToday: 1890, status: "low-battery" },
  { id: "cd-005", type: "oura", model: "Oura Ring Gen 3", patient: "Susan Lee", facility: "Oakwood Manor", battery: 61, lastSync: "5m ago", dataPointsToday: 1156, status: "active" },
  { id: "cd-006", type: "apple-watch", model: "Apple Watch Series 9", patient: "Susan Lee", facility: "Oakwood Manor", battery: 53, lastSync: "5m ago", dataPointsToday: 2034, status: "active" },
  { id: "cd-007", type: "dexcom", model: "Dexcom G7", patient: "David Kim", facility: "Palm Gardens", battery: 67, lastSync: "2m ago", dataPointsToday: 288, status: "active" },
  { id: "cd-008", type: "oura", model: "Oura Ring Gen 3", patient: "David Kim", facility: "Palm Gardens", battery: 84, lastSync: "2m ago", dataPointsToday: 1098, status: "active" },
  { id: "cd-009", type: "oura", model: "Oura Ring Gen 3", patient: "Dorothy Martinez", facility: "Willow Creek", battery: 38, lastSync: "6m ago", dataPointsToday: 1045, status: "active" },
  { id: "cd-010", type: "apple-watch", model: "Apple Watch Ultra 2", patient: "Dorothy Martinez", facility: "Willow Creek", battery: 12, lastSync: "6m ago", dataPointsToday: 1978, status: "low-battery" },
  { id: "cd-011", type: "dexcom", model: "Dexcom G7", patient: "Dorothy Martinez", facility: "Willow Creek", battery: 54, lastSync: "6m ago", dataPointsToday: 276, status: "active" },
  { id: "cd-012", type: "oura", model: "Oura Ring Gen 3", patient: "Patricia Moore", facility: "Willow Creek", battery: 91, lastSync: "12m ago", dataPointsToday: 987, status: "active" },
  { id: "cd-013", type: "apple-watch", model: "Apple Watch Series 9", patient: "Patricia Moore", facility: "Willow Creek", battery: 0, lastSync: "2h ago", dataPointsToday: 1245, status: "disconnected" },
  { id: "cd-014", type: "apple-watch", model: "Apple Watch SE 2", patient: "Eleanor Thompson", facility: "Palm Gardens", battery: 62, lastSync: "10m ago", dataPointsToday: 1567, status: "active" },
  { id: "cd-015", type: "withings-scale", model: "Withings Body+", patient: "Susan Lee", facility: "Oakwood Manor", battery: 76, lastSync: "8h ago", dataPointsToday: 1, status: "active" },
];

// --- Tab Components ---

function LiveMonitoringTab() {
  const sortedPatients = [...MONITORED_PATIENTS].sort((a, b) => b.riskScore - a.riskScore);

  const METRIC_SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    normal: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedPatients.map((pt) => {
          const risk = getRiskLevel(pt.riskScore);
          const riskStyle = RISK_STYLES[risk];
          return (
            <div
              key={pt.id}
              className={cn(
                "bg-white rounded-xl border shadow-medos-sm p-5",
                riskStyle.border
              )}
            >
              {/* Patient Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", riskStyle.dot)} />
                    <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{pt.name}</h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        riskStyle.bg,
                        riskStyle.text
                      )}
                    >
                      Risk: {pt.riskScore}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] mt-0.5 ml-4">
                    {pt.facility} / Rm {pt.room}
                  </p>
                  <p className="text-[10px] text-[var(--medos-gray-400)] ml-4">{pt.primaryDx}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {pt.devices.map((d) => {
                    const DevIcon = DEVICE_LABELS[d].icon;
                    return (
                      <span
                        key={d}
                        title={DEVICE_LABELS[d].label}
                        className="w-5 h-5 rounded bg-[var(--medos-gray-100)] flex items-center justify-center"
                      >
                        <DevIcon className="w-3 h-3 text-[var(--medos-primary)]" />
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {pt.metrics.map((metric) => {
                  const mStyle = METRIC_SEVERITY_STYLES[metric.severity];
                  const MIcon = metric.icon;
                  return (
                    <div
                      key={metric.label}
                      className={cn("rounded-lg p-2.5 border", mStyle.bg, mStyle.border)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <MIcon className={cn("w-3 h-3", mStyle.text)} />
                        <span className="text-[9px] font-medium text-[var(--medos-gray-500)]">
                          {metric.label}
                        </span>
                      </div>
                      <p className={cn("text-sm font-bold", mStyle.text)}>
                        {metric.value}
                        <span className="text-[8px] font-normal ml-0.5">{metric.unit}</span>
                      </p>
                      {metric.delta && (
                        <p
                          className={cn(
                            "text-[9px] font-medium",
                            metric.severity === "normal" ? "text-emerald-500" : mStyle.text
                          )}
                        >
                          {metric.delta}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 pt-2 border-t border-[var(--medos-gray-100)]">
                <Clock className="w-3 h-3 text-[var(--medos-gray-400)]" />
                <span className="text-[10px] text-[var(--medos-gray-400)]">
                  Last updated: {pt.lastUpdated}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertQueueTab() {
  const [alerts, setAlerts] = useState(GUARDIAN_ALERTS);
  const activeCount = alerts.filter((a) => !a.acknowledged).length;
  const ackCount = alerts.filter((a) => a.acknowledged).length;

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-[var(--medos-navy)]">
              {activeCount} active alerts
            </span>
          </div>
          <span className="text-xs text-[var(--medos-gray-500)]">
            {ackCount} acknowledged
          </span>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const style = ALERT_STYLES[alert.priority];
          const DevIcon = DEVICE_LABELS[alert.deviceSource].icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "bg-white rounded-xl border shadow-medos-sm overflow-hidden",
                alert.acknowledged ? "border-[var(--medos-gray-200)] opacity-70" : style.border
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5",
                      style.bg,
                      style.text
                    )}
                  >
                    {alert.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[var(--medos-navy)]">
                        {alert.patient}
                      </span>
                      <span className="w-4 h-4 rounded bg-[var(--medos-gray-100)] flex items-center justify-center">
                        <DevIcon className="w-2.5 h-2.5 text-[var(--medos-primary)]" />
                      </span>
                      <span className="text-[10px] text-[var(--medos-gray-400)]">
                        {alert.facility}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3 text-[var(--medos-gray-400)]" />
                        <span className="text-[10px] text-[var(--medos-gray-400)]">
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--medos-gray-700)] mb-2">{alert.description}</p>

                    <div className="bg-[var(--medos-gray-50)] rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[var(--medos-gray-500)]">Reading: </span>
                          <span className="font-medium text-[var(--medos-navy)]">{alert.currentReading}</span>
                        </div>
                        <div>
                          <span className="text-[var(--medos-gray-500)]">Threshold: </span>
                          <span className="font-medium text-[var(--medos-navy)]">{alert.threshold}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 mb-3">
                      <Shield className="w-3.5 h-3.5 text-[var(--medos-primary)] shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium text-[var(--medos-gray-500)]">
                            AI Recommended Action
                          </span>
                          <span className="text-[9px] bg-[var(--medos-primary)] bg-opacity-10 text-[var(--medos-primary)] px-1.5 py-0.5 rounded-full font-medium">
                            {(alert.agentConfidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-[var(--medos-gray-600)]">
                          {alert.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!alert.acknowledged ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-medium bg-[var(--medos-primary)] text-white hover:opacity-90 transition-default"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Acknowledge
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-medium border border-red-200 text-red-700 hover:bg-red-50 transition-default">
                          <ArrowUpRight className="w-3 h-3" />
                          Escalate
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-medium border border-[var(--medos-gray-200)] text-[var(--medos-gray-500)] hover:bg-[var(--medos-gray-50)] transition-default">
                          <XCircle className="w-3 h-3" />
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-medium">Acknowledged</span>
                      </div>
                    )}
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

function DeviceFeedsTab() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = CONNECTED_DEVICES.filter((d) => {
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
          <span className="text-xs text-[var(--medos-gray-500)]">Type:</span>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-white border border-[var(--medos-gray-200)] rounded-md pl-3 pr-7 py-1.5 text-xs text-[var(--medos-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--medos-primary)]"
            >
              <option value="all">All Types</option>
              <option value="oura">Oura Ring</option>
              <option value="apple-watch">Apple Watch</option>
              <option value="dexcom">Dexcom G7</option>
              <option value="withings-scale">Withings Scale</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[var(--medos-gray-400)] pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--medos-gray-500)]">Status:</span>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-[var(--medos-gray-200)] rounded-md pl-3 pr-7 py-1.5 text-xs text-[var(--medos-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--medos-primary)]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="low-battery">Low Battery</option>
              <option value="disconnected">Disconnected</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[var(--medos-gray-400)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Smartphone className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Connected Devices ({filtered.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Device", "Patient", "Facility", "Battery", "Last Sync", "Data Points", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((dev) => {
                const DevIcon = DEVICE_LABELS[dev.type].icon;
                const statusStyle = DEVICE_STATUS_STYLES[dev.status];
                return (
                  <tr key={dev.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DevIcon className="w-3.5 h-3.5 text-[var(--medos-primary)]" />
                        <span className="text-xs font-medium text-[var(--medos-navy)]">{dev.model}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{dev.patient}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{dev.facility}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-24">
                        <div className="flex-1 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              dev.battery > 50
                                ? "bg-emerald-400"
                                : dev.battery > 20
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            )}
                            style={{ width: `${dev.battery}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--medos-gray-500)] w-7 text-right">
                          {dev.battery}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {dev.status === "disconnected" ? (
                          <WifiOff className="w-3 h-3 text-red-400" />
                        ) : (
                          <Wifi className="w-3 h-3 text-emerald-400" />
                        )}
                        <span className="text-xs text-[var(--medos-gray-500)]">{dev.lastSync}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">
                        {dev.dataPointsToday.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          statusStyle.bg,
                          statusStyle.text
                        )}
                      >
                        {dev.status}
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

// --- Main Export ---

export default function GuardianPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("monitoring");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Post-Acute Guardian</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Continuous wearable monitoring — powered by Guardian Agent + ADR-007
            </p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
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
      {activeTab === "monitoring" && <LiveMonitoringTab />}
      {activeTab === "alerts" && <AlertQueueTab />}
      {activeTab === "devices" && <DeviceFeedsTab />}
    </div>
  );
}
