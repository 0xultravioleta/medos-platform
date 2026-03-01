"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Watch,
  Smartphone,
  Activity,
  Heart,
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Pause,
  Play,
  Trash2,
  Filter,
} from "lucide-react";

// --- Types ---

type DeviceStatus = "active" | "paused";
type AlertSeverity = "warning" | "critical";
type ReadingStatus = "normal" | "warning" | "critical";

interface RegisteredDevice {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  patientId: string;
  patientName: string;
  status: DeviceStatus;
  lastSync: string;
  metrics: string[];
}

interface DeviceReading {
  id: string;
  patientName: string;
  patientId: string;
  deviceName: string;
  deviceType: string;
  metric: string;
  value: number;
  unit: string;
  loinc: string;
  timestamp: string;
  status: ReadingStatus;
}

interface DeviceAlert {
  id: string;
  severity: AlertSeverity;
  patientName: string;
  patientId: string;
  deviceName: string;
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  direction: "above" | "below";
  timestamp: string;
  acknowledged: boolean;
}

// --- Mock Data ---

const MOCK_DEVICES: RegisteredDevice[] = [
  {
    id: "DEV-001",
    name: "Oura Ring Gen 4",
    type: "wearable_ring",
    manufacturer: "Oura Health",
    model: "Gen 4",
    patientId: "p-001",
    patientName: "Maria Santos",
    status: "active",
    lastSync: "2026-02-28T08:15:00Z",
    metrics: ["heart_rate", "hrv", "spo2", "temperature", "steps"],
  },
  {
    id: "DEV-002",
    name: "Apple Watch Ultra 3",
    type: "smartwatch",
    manufacturer: "Apple",
    model: "Ultra 3",
    patientId: "p-001",
    patientName: "Maria Santos",
    status: "active",
    lastSync: "2026-02-28T09:00:00Z",
    metrics: ["heart_rate", "hrv", "spo2", "steps"],
  },
  {
    id: "DEV-003",
    name: "Dexcom G8 CGM",
    type: "cgm",
    manufacturer: "Dexcom",
    model: "G8",
    patientId: "p-002",
    patientName: "James Wilson",
    status: "active",
    lastSync: "2026-02-28T09:30:00Z",
    metrics: ["glucose"],
  },
];

const LOINC_MAP: Record<string, string> = {
  heart_rate: "8867-4",
  hrv: "80404-7",
  spo2: "2708-6",
  temperature: "8310-5",
  glucose: "2345-7",
  steps: "41950-7",
};

const METRIC_LABELS: Record<string, string> = {
  heart_rate: "Heart Rate",
  hrv: "Heart Rate Variability",
  spo2: "SpO2",
  temperature: "Body Temperature",
  glucose: "Blood Glucose",
  steps: "Steps",
};

const METRIC_UNITS: Record<string, string> = {
  heart_rate: "bpm",
  hrv: "ms",
  spo2: "%",
  temperature: "C",
  glucose: "mg/dL",
  steps: "steps",
};

// Thresholds: { low?, high? }
const THRESHOLDS: Record<string, { low?: number; high?: number }> = {
  heart_rate: { low: 45, high: 120 },
  spo2: { low: 92 },
  glucose: { low: 70, high: 180 },
  temperature: { low: 35.0, high: 38.0 },
  hrv: { low: 20 },
};

function classifyReading(metric: string, value: number): ReadingStatus {
  const t = THRESHOLDS[metric];
  if (!t) return "normal";
  if (t.low !== undefined && value < t.low) return value < t.low * 0.9 ? "critical" : "warning";
  if (t.high !== undefined && value > t.high) return value > t.high * 1.1 ? "critical" : "warning";
  return "normal";
}

const MOCK_READINGS: DeviceReading[] = [
  { id: "R-001", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "heart_rate", value: 72, unit: "bpm", loinc: "8867-4", timestamp: "2026-02-28T08:15:00Z", status: "normal" },
  { id: "R-002", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "hrv", value: 45, unit: "ms", loinc: "80404-7", timestamp: "2026-02-28T08:15:00Z", status: "normal" },
  { id: "R-003", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "spo2", value: 98, unit: "%", loinc: "2708-6", timestamp: "2026-02-28T08:10:00Z", status: "normal" },
  { id: "R-004", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "temperature", value: 36.8, unit: "C", loinc: "8310-5", timestamp: "2026-02-28T08:00:00Z", status: "normal" },
  { id: "R-005", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "steps", value: 3420, unit: "steps", loinc: "41950-7", timestamp: "2026-02-28T08:15:00Z", status: "normal" },
  { id: "R-006", patientName: "Maria Santos", patientId: "p-001", deviceName: "Apple Watch Ultra 3", deviceType: "smartwatch", metric: "heart_rate", value: 125, unit: "bpm", loinc: "8867-4", timestamp: "2026-02-28T09:00:00Z", status: "warning" },
  { id: "R-007", patientName: "Maria Santos", patientId: "p-001", deviceName: "Apple Watch Ultra 3", deviceType: "smartwatch", metric: "hrv", value: 32, unit: "ms", loinc: "80404-7", timestamp: "2026-02-28T09:00:00Z", status: "normal" },
  { id: "R-008", patientName: "Maria Santos", patientId: "p-001", deviceName: "Apple Watch Ultra 3", deviceType: "smartwatch", metric: "spo2", value: 91, unit: "%", loinc: "2708-6", timestamp: "2026-02-28T08:55:00Z", status: "critical" },
  { id: "R-009", patientName: "Maria Santos", patientId: "p-001", deviceName: "Apple Watch Ultra 3", deviceType: "smartwatch", metric: "steps", value: 5210, unit: "steps", loinc: "41950-7", timestamp: "2026-02-28T09:00:00Z", status: "normal" },
  { id: "R-010", patientName: "James Wilson", patientId: "p-002", deviceName: "Dexcom G8 CGM", deviceType: "cgm", metric: "glucose", value: 142, unit: "mg/dL", loinc: "2345-7", timestamp: "2026-02-28T09:30:00Z", status: "normal" },
  { id: "R-011", patientName: "James Wilson", patientId: "p-002", deviceName: "Dexcom G8 CGM", deviceType: "cgm", metric: "glucose", value: 195, unit: "mg/dL", loinc: "2345-7", timestamp: "2026-02-28T09:15:00Z", status: "critical" },
  { id: "R-012", patientName: "James Wilson", patientId: "p-002", deviceName: "Dexcom G8 CGM", deviceType: "cgm", metric: "glucose", value: 165, unit: "mg/dL", loinc: "2345-7", timestamp: "2026-02-28T09:00:00Z", status: "normal" },
  { id: "R-013", patientName: "James Wilson", patientId: "p-002", deviceName: "Dexcom G8 CGM", deviceType: "cgm", metric: "glucose", value: 110, unit: "mg/dL", loinc: "2345-7", timestamp: "2026-02-28T08:45:00Z", status: "normal" },
  { id: "R-014", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "temperature", value: 38.2, unit: "C", loinc: "8310-5", timestamp: "2026-02-28T09:10:00Z", status: "warning" },
  { id: "R-015", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "heart_rate", value: 68, unit: "bpm", loinc: "8867-4", timestamp: "2026-02-28T07:30:00Z", status: "normal" },
  { id: "R-016", patientName: "Maria Santos", patientId: "p-001", deviceName: "Apple Watch Ultra 3", deviceType: "smartwatch", metric: "heart_rate", value: 82, unit: "bpm", loinc: "8867-4", timestamp: "2026-02-28T08:30:00Z", status: "normal" },
  { id: "R-017", patientName: "James Wilson", patientId: "p-002", deviceName: "Dexcom G8 CGM", deviceType: "cgm", metric: "glucose", value: 88, unit: "mg/dL", loinc: "2345-7", timestamp: "2026-02-28T08:30:00Z", status: "normal" },
  { id: "R-018", patientName: "Maria Santos", patientId: "p-001", deviceName: "Oura Ring Gen 4", deviceType: "wearable_ring", metric: "hrv", value: 18, unit: "ms", loinc: "80404-7", timestamp: "2026-02-28T07:00:00Z", status: "warning" },
];

const MOCK_ALERTS: DeviceAlert[] = [
  {
    id: "ALT-001",
    severity: "warning",
    patientName: "Maria Santos",
    patientId: "p-001",
    deviceName: "Apple Watch Ultra 3",
    metric: "heart_rate",
    value: 125,
    unit: "bpm",
    threshold: 120,
    direction: "above",
    timestamp: "2026-02-28T09:00:00Z",
    acknowledged: false,
  },
  {
    id: "ALT-002",
    severity: "critical",
    patientName: "James Wilson",
    patientId: "p-002",
    deviceName: "Dexcom G8 CGM",
    metric: "glucose",
    value: 195,
    unit: "mg/dL",
    threshold: 180,
    direction: "above",
    timestamp: "2026-02-28T09:15:00Z",
    acknowledged: false,
  },
  {
    id: "ALT-003",
    severity: "critical",
    patientName: "Maria Santos",
    patientId: "p-001",
    deviceName: "Apple Watch Ultra 3",
    metric: "spo2",
    value: 91,
    unit: "%",
    threshold: 92,
    direction: "below",
    timestamp: "2026-02-28T08:55:00Z",
    acknowledged: false,
  },
  {
    id: "ALT-004",
    severity: "warning",
    patientName: "Maria Santos",
    patientId: "p-001",
    deviceName: "Oura Ring Gen 4",
    metric: "temperature",
    value: 38.2,
    unit: "C",
    threshold: 38.0,
    direction: "above",
    timestamp: "2026-02-28T09:10:00Z",
    acknowledged: false,
  },
];

// --- Helpers ---

const TABS = [
  { key: "devices", label: "Registered Devices", icon: Watch },
  { key: "readings", label: "Readings", icon: Activity },
  { key: "alerts", label: "Alerts", icon: AlertTriangle },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const DEVICE_STATUS_MAP: Record<DeviceStatus, { label: string; style: string }> = {
  active: { label: "Active", style: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  paused: { label: "Paused", style: "bg-amber-50 text-amber-700 border border-amber-200" },
};

const ALERT_SEVERITY_MAP: Record<AlertSeverity, { label: string; style: string }> = {
  warning: { label: "Warning", style: "bg-amber-50 text-amber-700 border border-amber-200" },
  critical: { label: "Critical", style: "bg-red-50 text-red-700 border border-red-200" },
};

const READING_STATUS_STYLES: Record<ReadingStatus, string> = {
  normal: "bg-emerald-50",
  warning: "bg-amber-50",
  critical: "bg-red-50",
};

const METRIC_ICONS: Record<string, typeof Heart> = {
  heart_rate: Heart,
  hrv: Activity,
  spo2: Droplets,
  temperature: Thermometer,
  glucose: Droplets,
  steps: Activity,
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// --- Components ---

function RegisteredDevicesTab() {
  const [devices, setDevices] = useState(MOCK_DEVICES);

  const toggleStatus = (id: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: d.status === "active" ? "paused" as DeviceStatus : "active" as DeviceStatus } : d
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {devices.filter((d) => d.status === "active").length} active devices
        </p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Register Device
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {devices.map((device) => {
          const statusInfo = DEVICE_STATUS_MAP[device.status];
          const DeviceIcon = device.type === "smartwatch" ? Watch : device.type === "cgm" ? Activity : Smartphone;
          return (
            <div
              key={device.id}
              className="group bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md hover:border-[var(--medos-primary)] hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--medos-primary-light)] text-[var(--medos-primary)] group-hover:bg-[var(--medos-primary)] group-hover:text-white transition-colors">
                    <DeviceIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--medos-navy)]">{device.name}</p>
                    <p className="text-xs text-[var(--medos-gray-500)]">{device.id}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.style}`}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 ml-12 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider w-20">Patient</span>
                  <span className="text-sm text-[var(--medos-gray-700)]">{device.patientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider w-20">Manufacturer</span>
                  <span className="text-sm text-[var(--medos-gray-700)]">{device.manufacturer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider w-20">Model</span>
                  <span className="text-sm text-[var(--medos-gray-700)]">{device.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider w-20">Last Sync</span>
                  <span className="text-sm text-[var(--medos-gray-700)]">{formatTimestamp(device.lastSync)}</span>
                </div>
              </div>

              {/* Metrics badges */}
              <div className="ml-12 mb-4">
                <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-1.5">Supported Metrics</p>
                <div className="flex flex-wrap gap-1.5">
                  {device.metrics.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--medos-primary-light)] text-[var(--medos-primary)] text-[10px] font-medium"
                    >
                      {METRIC_LABELS[m] || m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-12">
                <button
                  onClick={() => toggleStatus(device.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    device.status === "active"
                      ? "border border-amber-200 text-amber-700 hover:bg-amber-50"
                      : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {device.status === "active" ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </>
                  )}
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                  Deregister
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadingsTab() {
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [metricFilter, setMetricFilter] = useState<string>("all");

  const deviceTypes = useMemo(() => {
    const types = new Set(MOCK_READINGS.map((r) => r.deviceType));
    return Array.from(types);
  }, []);

  const metricTypes = useMemo(() => {
    const types = new Set(MOCK_READINGS.map((r) => r.metric));
    return Array.from(types);
  }, []);

  const filtered = useMemo(() => {
    return MOCK_READINGS.filter((r) => {
      if (deviceFilter !== "all" && r.deviceType !== deviceFilter) return false;
      if (metricFilter !== "all" && r.metric !== metricFilter) return false;
      return true;
    });
  }, [deviceFilter, metricFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--medos-gray-400)]" />
          <span className="text-sm text-[var(--medos-gray-500)]">Filters:</span>
        </div>
        <div className="relative">
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="all">All Devices</option>
            {deviceTypes.map((dt) => (
              <option key={dt} value={dt}>
                {dt === "wearable_ring" ? "Wearable Ring" : dt === "smartwatch" ? "Smartwatch" : dt === "cgm" ? "CGM" : dt}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <select
            value={metricFilter}
            onChange={(e) => setMetricFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="all">All Metrics</option>
            {metricTypes.map((mt) => (
              <option key={mt} value={mt}>
                {METRIC_LABELS[mt] || mt}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-[var(--medos-gray-500)] ml-auto">
          {filtered.length} of {MOCK_READINGS.length} readings
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Patient</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Device</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Metric</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Value</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Unit</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">LOINC</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((reading) => {
                const MetricIcon = METRIC_ICONS[reading.metric] || Activity;
                const rowBg = READING_STATUS_STYLES[reading.status];
                return (
                  <tr key={reading.id} className={`${rowBg} hover:opacity-90 transition-all`}>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-[var(--medos-gray-900)]">{reading.patientName}</p>
                      <p className="text-xs text-[var(--medos-gray-500)]">{reading.patientId}</p>
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)]">{reading.deviceName}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <MetricIcon className="w-3.5 h-3.5 text-[var(--medos-gray-500)]" />
                        <span className="text-sm text-[var(--medos-gray-700)]">{METRIC_LABELS[reading.metric] || reading.metric}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-[var(--medos-gray-900)] text-right tabular-nums">
                      {reading.value}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)]">{reading.unit}</td>
                    <td className="px-6 py-3 text-sm font-mono text-[var(--medos-primary)]">{reading.loinc}</td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)]">{formatTimestamp(reading.timestamp)}</td>
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

function AlertsTab() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  const acknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            <XCircle className="w-3 h-3" />
            {alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length} Critical
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            {alerts.filter((a) => a.severity === "warning" && !a.acknowledged).length} Warning
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {acknowledgedAlerts.length} Acknowledged
          </span>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Active Alerts</h3>
          {activeAlerts.map((alert) => {
            const severityInfo = ALERT_SEVERITY_MAP[alert.severity];
            const MetricIcon = METRIC_ICONS[alert.metric] || Activity;
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border shadow-medos-sm p-5 transition-all ${
                  alert.severity === "critical"
                    ? "border-red-200"
                    : "border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                      alert.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      <AlertTriangle className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityInfo.style}`}>
                          {severityInfo.label}
                        </span>
                        <span className="text-xs text-[var(--medos-gray-500)]">{alert.id}</span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--medos-navy)]">
                        {alert.patientName}
                        <span className="text-[var(--medos-gray-400)] font-normal mx-1.5">--</span>
                        <span className="font-normal text-[var(--medos-gray-700)]">{alert.deviceName}</span>
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <MetricIcon className="w-3.5 h-3.5 text-[var(--medos-gray-500)]" />
                          <span className="text-[var(--medos-gray-700)]">{METRIC_LABELS[alert.metric] || alert.metric}</span>
                        </div>
                        <span className="font-semibold text-[var(--medos-gray-900)] tabular-nums">
                          {alert.value} {alert.unit}
                        </span>
                        <span className="text-[var(--medos-gray-500)]">
                          {alert.direction === "above" ? ">" : "<"} {alert.threshold} {alert.unit} threshold
                        </span>
                      </div>
                      <p className="text-xs text-[var(--medos-gray-500)]">{formatTimestamp(alert.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => acknowledge(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-medium transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledge
                    </button>
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] text-xs font-medium transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--medos-gray-500)]">Acknowledged</h3>
          {acknowledgedAlerts.map((alert) => {
            const severityInfo = ALERT_SEVERITY_MAP[alert.severity];
            return (
              <div
                key={alert.id}
                className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 opacity-60 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${severityInfo.style}`}>
                          {severityInfo.label}
                        </span>
                        <span className="text-sm text-[var(--medos-gray-700)]">
                          {alert.patientName} -- {METRIC_LABELS[alert.metric]} {alert.value} {alert.unit}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--medos-gray-500)]">{formatShortTime(alert.timestamp)} -- {alert.deviceName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismiss(alert.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[var(--medos-gray-500)] hover:text-red-700 hover:bg-red-50 text-xs transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--medos-navy)]">No Active Alerts</p>
          <p className="text-sm text-[var(--medos-gray-500)] mt-1">All device readings are within normal thresholds.</p>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function DeviceManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("devices");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--medos-gray-200)] text-[var(--medos-gray-500)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-700)] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <Watch className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Device Management</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              Register and monitor patient wearable devices, readings, and alerts
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Register Device
        </button>
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
                {tab.key === "alerts" && MOCK_ALERTS.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {MOCK_ALERTS.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "devices" && <RegisteredDevicesTab />}
      {activeTab === "readings" && <ReadingsTab />}
      {activeTab === "alerts" && <AlertsTab />}
    </div>
  );
}
