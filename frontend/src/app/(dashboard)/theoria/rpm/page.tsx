"use client";

import { useState } from "react";
import {
  Smartphone,
  Activity,
  DollarSign,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  Watch,
  Heart,
  Droplets,
  Scale,
  Gauge,
  TrendingUp,
  BarChart3,
  Users,
  Zap,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =============================================
   TYPES
   ============================================= */

type TabKey = "devices" | "cpt" | "revenue";
type DeviceStatus = "active" | "inactive" | "pending-setup";
type CptStatus = "earned" | "in-progress" | "not-applicable";

type DeviceType =
  | "Oura Ring"
  | "Apple Watch"
  | "Dexcom G7"
  | "Withings Scale"
  | "Omron BP Monitor";

type CptCode = "99453" | "99454" | "99457" | "99458";

interface RPMDevice {
  id: string;
  patientName: string;
  device: DeviceType;
  setupDate: string;
  monitoringDays: number;
  transmissions: number;
  lastReading: { value: string; timestamp: string };
  status: DeviceStatus;
  payer: "Medicare" | "Empassion ACO REACH" | "Commercial";
  cptStatus: Record<CptCode, CptStatus>;
  clinicalMinutes: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

/* =============================================
   MOCK DATA
   ============================================= */

const CPT_RATES: Record<CptCode, { label: string; rate: number; description: string }> = {
  "99453": { label: "Initial Setup", rate: 19, description: "One-time device setup & education" },
  "99454": { label: "Device Supply", rate: 55, description: "Monthly device supply & data transmission" },
  "99457": { label: "Clinical Time (20m)", rate: 51, description: "First 20 min clinical monitoring" },
  "99458": { label: "Addl Clinical (20m)", rate: 41, description: "Additional 20 min clinical monitoring" },
};

const DEVICE_ICONS: Record<DeviceType, typeof Watch> = {
  "Oura Ring": Heart,
  "Apple Watch": Watch,
  "Dexcom G7": Droplets,
  "Withings Scale": Scale,
  "Omron BP Monitor": Gauge,
};

const DEVICES: RPMDevice[] = [
  {
    id: "rpm-001", patientName: "Margaret Thompson", device: "Oura Ring", setupDate: "2026-01-10",
    monitoringDays: 24, transmissions: 672, lastReading: { value: "SpO2 96%, HRV 32ms", timestamp: "2026-03-01 06:30" },
    status: "active", payer: "Medicare", clinicalMinutes: 28,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "not-applicable" },
  },
  {
    id: "rpm-002", patientName: "Robert Williams", device: "Omron BP Monitor", setupDate: "2026-01-15",
    monitoringDays: 22, transmissions: 44, lastReading: { value: "138/88 mmHg", timestamp: "2026-03-01 07:15" },
    status: "active", payer: "Medicare", clinicalMinutes: 22,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "not-applicable" },
  },
  {
    id: "rpm-003", patientName: "Dorothy Garcia", device: "Dexcom G7", setupDate: "2026-02-01",
    monitoringDays: 28, transmissions: 4032, lastReading: { value: "Glucose 186 mg/dL", timestamp: "2026-03-01 08:00" },
    status: "active", payer: "Empassion ACO REACH", clinicalMinutes: 35,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "in-progress" },
  },
  {
    id: "rpm-004", patientName: "James Mitchell", device: "Omron BP Monitor", setupDate: "2026-02-05",
    monitoringDays: 18, transmissions: 36, lastReading: { value: "142/90 mmHg", timestamp: "2026-03-01 06:45" },
    status: "active", payer: "Medicare", clinicalMinutes: 15,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "in-progress", "99458": "not-applicable" },
  },
  {
    id: "rpm-005", patientName: "Helen Anderson", device: "Withings Scale", setupDate: "2026-01-20",
    monitoringDays: 25, transmissions: 50, lastReading: { value: "168.4 lbs, 32% BF", timestamp: "2026-03-01 07:00" },
    status: "active", payer: "Medicare", clinicalMinutes: 42,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "earned" },
  },
  {
    id: "rpm-006", patientName: "William Brown", device: "Apple Watch", setupDate: "2026-02-10",
    monitoringDays: 12, transmissions: 288, lastReading: { value: "HR 82 bpm, Steps 1,204", timestamp: "2026-03-01 09:30" },
    status: "active", payer: "Empassion ACO REACH", clinicalMinutes: 10,
    cptStatus: { "99453": "earned", "99454": "in-progress", "99457": "in-progress", "99458": "not-applicable" },
  },
  {
    id: "rpm-007", patientName: "Patricia Davis", device: "Dexcom G7", setupDate: "2026-01-05",
    monitoringDays: 28, transmissions: 4032, lastReading: { value: "Glucose 124 mg/dL", timestamp: "2026-03-01 08:15" },
    status: "active", payer: "Medicare", clinicalMinutes: 38,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "in-progress" },
  },
  {
    id: "rpm-008", patientName: "Richard Wilson", device: "Oura Ring", setupDate: "2026-02-15",
    monitoringDays: 8, transmissions: 192, lastReading: { value: "SpO2 91%, HRV 18ms", timestamp: "2026-03-01 06:00" },
    status: "active", payer: "Medicare", clinicalMinutes: 8,
    cptStatus: { "99453": "earned", "99454": "in-progress", "99457": "not-applicable", "99458": "not-applicable" },
  },
  {
    id: "rpm-009", patientName: "Barbara Martinez", device: "Withings Scale", setupDate: "2026-01-25",
    monitoringDays: 20, transmissions: 40, lastReading: { value: "154.2 lbs, 28% BF", timestamp: "2026-02-28 07:30" },
    status: "active", payer: "Empassion ACO REACH", clinicalMinutes: 25,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "not-applicable" },
  },
  {
    id: "rpm-010", patientName: "Charles Taylor", device: "Omron BP Monitor", setupDate: "2026-02-20",
    monitoringDays: 6, transmissions: 12, lastReading: { value: "148/92 mmHg", timestamp: "2026-02-28 08:00" },
    status: "active", payer: "Medicare", clinicalMinutes: 6,
    cptStatus: { "99453": "earned", "99454": "in-progress", "99457": "not-applicable", "99458": "not-applicable" },
  },
  {
    id: "rpm-011", patientName: "Susan Clark", device: "Apple Watch", setupDate: "2026-01-08",
    monitoringDays: 26, transmissions: 624, lastReading: { value: "HR 74 bpm, Fall: None", timestamp: "2026-03-01 10:00" },
    status: "active", payer: "Medicare", clinicalMinutes: 30,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "in-progress" },
  },
  {
    id: "rpm-012", patientName: "Thomas Rodriguez", device: "Dexcom G7", setupDate: "2026-03-01",
    monitoringDays: 0, transmissions: 0, lastReading: { value: "Pending setup", timestamp: "N/A" },
    status: "pending-setup", payer: "Empassion ACO REACH", clinicalMinutes: 0,
    cptStatus: { "99453": "in-progress", "99454": "not-applicable", "99457": "not-applicable", "99458": "not-applicable" },
  },
  {
    id: "rpm-013", patientName: "Karen Lewis", device: "Oura Ring", setupDate: "2026-02-01",
    monitoringDays: 21, transmissions: 504, lastReading: { value: "SpO2 97%, HRV 41ms", timestamp: "2026-03-01 05:45" },
    status: "active", payer: "Commercial", clinicalMinutes: 22,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "not-applicable" },
  },
  {
    id: "rpm-014", patientName: "Daniel Walker", device: "Apple Watch", setupDate: "2026-01-28",
    monitoringDays: 19, transmissions: 456, lastReading: { value: "HR 68 bpm, Steps 3,450", timestamp: "2026-03-01 11:00" },
    status: "active", payer: "Commercial", clinicalMinutes: 20,
    cptStatus: { "99453": "earned", "99454": "earned", "99457": "earned", "99458": "not-applicable" },
  },
  {
    id: "rpm-015", patientName: "Nancy Hall", device: "Withings Scale", setupDate: "2026-02-12",
    monitoringDays: 14, transmissions: 28, lastReading: { value: "182.1 lbs, 35% BF", timestamp: "2026-02-27 06:30" },
    status: "inactive", payer: "Medicare", clinicalMinutes: 12,
    cptStatus: { "99453": "earned", "99454": "in-progress", "99457": "in-progress", "99458": "not-applicable" },
  },
];

const MONTHLY_TREND: MonthlyRevenue[] = [
  { month: "Oct", revenue: 1420 },
  { month: "Nov", revenue: 1780 },
  { month: "Dec", revenue: 2150 },
  { month: "Jan", revenue: 2680 },
  { month: "Feb", revenue: 3120 },
  { month: "Mar", revenue: 0 }, // computed below
];

/* =============================================
   HELPERS
   ============================================= */

function dayColor(days: number) {
  if (days >= 16) return "bg-emerald-500";
  if (days >= 10) return "bg-amber-500";
  return "bg-red-500";
}

function dayTextColor(days: number) {
  if (days >= 16) return "text-emerald-700";
  if (days >= 10) return "text-amber-700";
  return "text-red-700";
}

const statusBadge: Record<DeviceStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  inactive: { bg: "bg-red-50", text: "text-red-700", label: "Inactive" },
  "pending-setup": { bg: "bg-blue-50", text: "text-blue-700", label: "Pending Setup" },
};

const cptStatusCell: Record<CptStatus, { icon: string; color: string }> = {
  earned: { icon: "check", color: "text-emerald-600 bg-emerald-50" },
  "in-progress": { icon: "clock", color: "text-amber-600 bg-amber-50" },
  "not-applicable": { icon: "dash", color: "text-[var(--medos-gray-400)] bg-[var(--medos-gray-50)]" },
};

function patientRevenue(d: RPMDevice): number {
  let rev = 0;
  Object.entries(d.cptStatus).forEach(([code, status]) => {
    if (status === "earned") rev += CPT_RATES[code as CptCode].rate;
  });
  return rev;
}

function totalMonthlyRevenue(): number {
  return DEVICES.reduce((s, d) => s + patientRevenue(d), 0);
}

/* =============================================
   TABS
   ============================================= */

const TABS: { key: TabKey; label: string; icon: typeof Smartphone }[] = [
  { key: "devices", label: "Device Billing", icon: Activity },
  { key: "cpt", label: "CPT Tracking", icon: CheckCircle2 },
  { key: "revenue", label: "Monthly Revenue", icon: DollarSign },
];

/* =============================================
   DEVICE BILLING TAB
   ============================================= */

function DeviceBillingTab() {
  const activeDevices = DEVICES.filter((d) => d.status === "active");
  const meetingThreshold = DEVICES.filter((d) => d.monitoringDays >= 16);
  const avgTransmissions = Math.round(
    activeDevices.reduce((s, d) => s + d.transmissions, 0) /
    Math.max(activeDevices.reduce((s, d) => s + d.monitoringDays, 0), 1)
  );

  const kpis = [
    { label: "Total Devices", value: DEVICES.length, icon: Smartphone, color: "text-[var(--medos-primary)]" },
    { label: "Active", value: `${Math.round((activeDevices.length / DEVICES.length) * 100)}%`, icon: Wifi, color: "text-emerald-600" },
    { label: "Avg Tx/Day", value: avgTransmissions, icon: Zap, color: "text-blue-600" },
    { label: "16-Day Threshold", value: `${meetingThreshold.length}/${DEVICES.length}`, icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={cn("w-4 h-4", k.color)} />
              <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Active Device Enrollments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Patient", "Device", "Setup Date", "Days Monitored", "Transmissions", "Last Reading", "Status"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {DEVICES.map((d) => {
                const DevIcon = DEVICE_ICONS[d.device];
                const badge = statusBadge[d.status];
                return (
                  <tr key={d.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-navy)]">{d.patientName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <DevIcon className="w-3.5 h-3.5 text-[var(--medos-gray-500)]" />
                        <span className="text-xs text-[var(--medos-gray-600)]">{d.device}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{d.setupDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", dayColor(d.monitoringDays))}
                            style={{ width: `${Math.min((d.monitoringDays / 16) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={cn("text-xs font-semibold", dayTextColor(d.monitoringDays))}>
                          {d.monitoringDays}d
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{d.transmissions.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-[var(--medos-navy)]">{d.lastReading.value}</p>
                        <p className="text-[10px] text-[var(--medos-gray-400)]">{d.lastReading.timestamp}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", badge.bg, badge.text)}>
                        {badge.label}
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

/* =============================================
   CPT TRACKING TAB
   ============================================= */

function CptTrackingTab() {
  const cptCodes: CptCode[] = ["99453", "99454", "99457", "99458"];

  const aggregates = cptCodes.reduce((acc, code) => {
    acc[code] = { earned: 0, inProgress: 0, total: 0 };
    DEVICES.forEach((d) => {
      if (d.cptStatus[code] === "earned") { acc[code].earned++; acc[code].total += CPT_RATES[code].rate; }
      if (d.cptStatus[code] === "in-progress") acc[code].inProgress++;
    });
    return acc;
  }, {} as Record<CptCode, { earned: number; inProgress: number; total: number }>);

  return (
    <div className="space-y-6">
      {/* CPT Code Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cptCodes.map((code) => (
          <div key={code} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[var(--medos-navy)]">CPT {code}</span>
              <span className="text-[10px] font-medium text-[var(--medos-gray-500)]">${CPT_RATES[code].rate}</span>
            </div>
            <p className="text-[10px] text-[var(--medos-gray-500)] mb-2">{CPT_RATES[code].description}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-700 font-medium">{aggregates[code].earned} earned</span>
              <span className="text-xs text-amber-700 font-medium">{aggregates[code].inProgress} pending</span>
            </div>
            <p className="text-sm font-bold text-emerald-700 mt-1">${aggregates[code].total.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <CheckCircle2 className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">CPT Code Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Patient</th>
                {cptCodes.map((code) => (
                  <th key={code} className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">
                    {code}<br /><span className="font-normal">${CPT_RATES[code].rate}</span>
                  </th>
                ))}
                <th className="text-right text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {DEVICES.map((d) => {
                const rev = patientRevenue(d);
                return (
                  <tr key={d.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[var(--medos-navy)]">{d.patientName}</p>
                      <p className="text-[10px] text-[var(--medos-gray-400)]">{d.device}</p>
                    </td>
                    {cptCodes.map((code) => {
                      const st = d.cptStatus[code];
                      const cell = cptStatusCell[st];
                      return (
                        <td key={code} className="px-4 py-3 text-center">
                          <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium", cell.color)}>
                            {st === "earned" ? "\u2713" : st === "in-progress" ? "\u25CB" : "\u2014"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-emerald-700">${rev}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--medos-gray-200)] bg-[var(--medos-gray-50)]">
                <td className="px-4 py-3 text-xs font-semibold text-[var(--medos-navy)]">Totals</td>
                {cptCodes.map((code) => (
                  <td key={code} className="px-4 py-3 text-center text-xs font-bold text-[var(--medos-navy)]">
                    {aggregates[code].earned}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                  ${totalMonthlyRevenue().toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium text-emerald-600 bg-emerald-50">{"\u2713"}</span>
          <span className="text-xs text-[var(--medos-gray-600)]">Earned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium text-amber-600 bg-amber-50">{"\u25CB"}</span>
          <span className="text-xs text-[var(--medos-gray-600)]">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium text-[var(--medos-gray-400)] bg-[var(--medos-gray-50)]">{"\u2014"}</span>
          <span className="text-xs text-[var(--medos-gray-600)]">N/A</span>
        </div>
      </div>
    </div>
  );
}

/* =============================================
   MONTHLY REVENUE TAB
   ============================================= */

function MonthlyRevenueTab() {
  const currentRevenue = totalMonthlyRevenue();
  const trend = [...MONTHLY_TREND];
  trend[trend.length - 1].revenue = currentRevenue;
  const maxRevenue = Math.max(...trend.map((t) => t.revenue));

  // Breakdown by CPT
  const byCpt: Record<CptCode, number> = { "99453": 0, "99454": 0, "99457": 0, "99458": 0 };
  DEVICES.forEach((d) => {
    (Object.keys(d.cptStatus) as CptCode[]).forEach((code) => {
      if (d.cptStatus[code] === "earned") byCpt[code] += CPT_RATES[code].rate;
    });
  });
  const totalCpt = Object.values(byCpt).reduce((a, b) => a + b, 0);

  // Breakdown by payer
  const byPayer: Record<string, number> = {};
  DEVICES.forEach((d) => {
    const rev = patientRevenue(d);
    byPayer[d.payer] = (byPayer[d.payer] || 0) + rev;
  });

  const payerColors: Record<string, string> = {
    Medicare: "bg-blue-500",
    "Empassion ACO REACH": "bg-purple-500",
    Commercial: "bg-teal-500",
  };

  const avgPerPatient = Math.round(currentRevenue / DEVICES.filter((d) => patientRevenue(d) > 0).length);
  const projectedAnnual = currentRevenue * 12;
  const lastMonth = trend[trend.length - 2].revenue;
  const growthPct = Math.round(((currentRevenue - lastMonth) / lastMonth) * 100);

  const cptColors: Record<CptCode, string> = {
    "99453": "bg-indigo-500",
    "99454": "bg-blue-500",
    "99457": "bg-emerald-500",
    "99458": "bg-amber-500",
  };

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="bg-gradient-to-r from-[var(--medos-primary)] to-[var(--medos-navy)] rounded-xl p-6 text-white">
        <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Total RPM Revenue — March 2026</p>
        <div className="flex items-end gap-4">
          <p className="text-4xl font-bold">${currentRevenue.toLocaleString()}</p>
          <div className={cn("flex items-center gap-1 text-sm font-medium", growthPct >= 0 ? "text-emerald-300" : "text-red-300")}>
            {growthPct >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(growthPct)}% vs Feb
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-[10px] text-white/60 uppercase">Avg / Patient</p>
            <p className="text-lg font-bold">${avgPerPatient}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/60 uppercase">Projected Annual</p>
            <p className="text-lg font-bold">${projectedAnnual.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/60 uppercase">Active Patients</p>
            <p className="text-lg font-bold">{DEVICES.filter((d) => d.status === "active").length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by CPT */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Revenue by CPT Code</h3>
          </div>
          {/* Stacked bar */}
          <div className="w-full h-6 bg-[var(--medos-gray-100)] rounded-full overflow-hidden flex mb-4">
            {(Object.keys(byCpt) as CptCode[]).map((code) => (
              byCpt[code] > 0 && (
                <div
                  key={code}
                  className={cn("h-full", cptColors[code])}
                  style={{ width: `${(byCpt[code] / totalCpt) * 100}%` }}
                  title={`CPT ${code}: $${byCpt[code]}`}
                />
              )
            ))}
          </div>
          <div className="space-y-2">
            {(Object.keys(byCpt) as CptCode[]).map((code) => (
              <div key={code} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", cptColors[code])} />
                  <span className="text-xs text-[var(--medos-gray-600)]">CPT {code} — {CPT_RATES[code].label}</span>
                </div>
                <span className="text-xs font-semibold text-[var(--medos-navy)]">${byCpt[code]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by payer */}
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Revenue by Payer</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(byPayer).sort(([, a], [, b]) => b - a).map(([payer, rev]) => (
              <div key={payer}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--medos-gray-600)]">{payer}</span>
                  <span className="text-xs font-semibold text-[var(--medos-navy)]">${rev} ({Math.round((rev / currentRevenue) * 100)}%)</span>
                </div>
                <div className="w-full h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", payerColors[payer] || "bg-gray-500")}
                    style={{ width: `${(rev / currentRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">6-Month Revenue Trend</h3>
        </div>
        <div className="flex items-end gap-3 h-40">
          {trend.map((m, i) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-[var(--medos-navy)]">${m.revenue.toLocaleString()}</span>
              <div className="w-full flex items-end" style={{ height: "120px" }}>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    i === trend.length - 1 ? "bg-[var(--medos-primary)]" : "bg-[var(--medos-primary)]/30"
                  )}
                  style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-[var(--medos-gray-500)]">{m.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =============================================
   MAIN PAGE
   ============================================= */

export default function RPMRevenuePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("devices");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Smartphone className="w-6 h-6 text-[var(--medos-primary)]" />
          <h1 className="text-xl font-bold text-[var(--medos-navy)]">RPM Revenue</h1>
        </div>
        <p className="text-sm text-[var(--medos-gray-500)] ml-9">
          Remote Patient Monitoring billing — CPT 99453-99458 auto-capture
        </p>
      </div>

      {/* Tab bar */}
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

      {/* Tab content */}
      {activeTab === "devices" && <DeviceBillingTab />}
      {activeTab === "cpt" && <CptTrackingTab />}
      {activeTab === "revenue" && <MonthlyRevenueTab />}
    </div>
  );
}
