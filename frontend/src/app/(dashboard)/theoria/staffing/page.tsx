"use client";

import { useState } from "react";
import {
  Users,
  Calendar,
  DollarSign,
  Building2,
  Stethoscope,
  Video,
  MapPin,
  Clock,
  AlertTriangle,
  Sun,
  Moon,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  UserCheck,
  Activity,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "schedule" | "census" | "cost";
type ProviderType = "MD" | "NP";
type ProviderMode = "on-site" | "telemedicine";
type AvailabilityStatus = "available" | "on-shift" | "off-duty" | "pto";
type AcuityLevel = "low" | "medium" | "high";
type ShiftType = "Day" | "Night" | "Off";

interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  mode: ProviderMode;
  homeState: string;
  assignedFacilities: string[];
  hoursThisWeek: number;
  patientsSeen: number;
  nextShift: string;
  status: AvailabilityStatus;
  todayAssignment: string;
  todayShift: ShiftType;
}

interface FacilityCensus {
  id: string;
  name: string;
  location: string;
  current: number;
  capacity: number;
  acuityDistribution: { low: number; medium: number; high: number };
  providersOnDuty: string[];
  providerToPatientRatio: string;
  dayShiftCoverage: number;
  nightShiftCoverage: number;
  weekendCoverage: number;
  forecastAdmissions7d: number;
  forecastDischarges7d: number;
}

interface OpenShift {
  id: string;
  facility: string;
  date: string;
  shift: ShiftType;
  role: ProviderType;
  severity: "critical" | "warning";
}

interface ProviderCost {
  providerId: string;
  name: string;
  type: ProviderType;
  mode: ProviderMode;
  hoursPerMonth: number;
  ratePerHour: number;
  monthlyCost: number;
  costPerPatient: number;
}

interface WeekSchedule {
  providerId: string;
  days: { facility: string; shift: ShiftType; mode: ProviderMode }[];
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "schedule", label: "Provider Schedule", icon: Calendar },
  { key: "census", label: "Facility Census", icon: Building2 },
  { key: "cost", label: "Cost Analysis", icon: DollarSign },
];

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; bg: string; text: string }> = {
  available: { label: "Available", bg: "bg-emerald-50", text: "text-emerald-700" },
  "on-shift": { label: "On Shift", bg: "bg-blue-50", text: "text-blue-700" },
  "off-duty": { label: "Off Duty", bg: "bg-[var(--medos-gray-100)]", text: "text-[var(--medos-gray-500)]" },
  pto: { label: "PTO", bg: "bg-amber-50", text: "text-amber-700" },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FACILITY_COLORS: Record<string, string> = {
  "Sunrise Senior Living": "bg-blue-100 text-blue-700",
  "Oakwood Manor": "bg-purple-100 text-purple-700",
  "Palm Gardens": "bg-emerald-100 text-emerald-700",
  "Willow Creek": "bg-amber-100 text-amber-700",
  "Off": "bg-[var(--medos-gray-100)] text-[var(--medos-gray-400)]",
};

// --- Mock Data ---

const PROVIDERS: Provider[] = [
  { id: "pv-001", name: "Dr. Sarah Martinez", type: "MD", mode: "telemedicine", homeState: "MI", assignedFacilities: ["Sunrise Senior Living", "Oakwood Manor"], hoursThisWeek: 38, patientsSeen: 42, nextShift: "Mon 8:00 AM", status: "on-shift", todayAssignment: "Sunrise Senior Living", todayShift: "Day" },
  { id: "pv-002", name: "Dr. Ahmed Khan", type: "MD", mode: "on-site", homeState: "MI", assignedFacilities: ["Sunrise Senior Living", "Oakwood Manor", "Palm Gardens"], hoursThisWeek: 44, patientsSeen: 56, nextShift: "Mon 7:00 AM", status: "on-shift", todayAssignment: "Oakwood Manor", todayShift: "Day" },
  { id: "pv-003", name: "Dr. Rachel Green", type: "MD", mode: "telemedicine", homeState: "FL", assignedFacilities: ["Palm Gardens", "Willow Creek"], hoursThisWeek: 36, patientsSeen: 38, nextShift: "Mon 9:00 AM", status: "available", todayAssignment: "Palm Gardens", todayShift: "Day" },
  { id: "pv-004", name: "NP Lisa Thompson", type: "NP", mode: "on-site", homeState: "MI", assignedFacilities: ["Sunrise Senior Living"], hoursThisWeek: 40, patientsSeen: 48, nextShift: "Mon 7:00 AM", status: "on-shift", todayAssignment: "Sunrise Senior Living", todayShift: "Day" },
  { id: "pv-005", name: "NP Carlos Rivera", type: "NP", mode: "on-site", homeState: "FL", assignedFacilities: ["Palm Gardens", "Willow Creek"], hoursThisWeek: 42, patientsSeen: 52, nextShift: "Mon 7:00 AM", status: "on-shift", todayAssignment: "Willow Creek", todayShift: "Day" },
  { id: "pv-006", name: "Dr. James Wilson", type: "MD", mode: "on-site", homeState: "FL", assignedFacilities: ["Willow Creek"], hoursThisWeek: 32, patientsSeen: 35, nextShift: "Tue 7:00 AM", status: "off-duty", todayAssignment: "-", todayShift: "Off" },
  { id: "pv-007", name: "NP Emily Chen", type: "NP", mode: "telemedicine", homeState: "MI", assignedFacilities: ["Oakwood Manor", "Palm Gardens"], hoursThisWeek: 34, patientsSeen: 40, nextShift: "Mon 10:00 AM", status: "available", todayAssignment: "Oakwood Manor", todayShift: "Day" },
  { id: "pv-008", name: "Dr. Michael Brown", type: "MD", mode: "on-site", homeState: "MI", assignedFacilities: ["Sunrise Senior Living", "Oakwood Manor"], hoursThisWeek: 0, patientsSeen: 0, nextShift: "Wed 7:00 AM", status: "pto", todayAssignment: "-", todayShift: "Off" },
];

const WEEK_SCHEDULES: WeekSchedule[] = [
  { providerId: "pv-001", days: [
    { facility: "Sunrise Senior Living", shift: "Day", mode: "telemedicine" },
    { facility: "Oakwood Manor", shift: "Day", mode: "telemedicine" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "telemedicine" },
    { facility: "Oakwood Manor", shift: "Day", mode: "telemedicine" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "telemedicine" },
    { facility: "Off", shift: "Off", mode: "telemedicine" },
    { facility: "Off", shift: "Off", mode: "telemedicine" },
  ]},
  { providerId: "pv-002", days: [
    { facility: "Oakwood Manor", shift: "Day", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Palm Gardens", shift: "Day", mode: "on-site" },
    { facility: "Oakwood Manor", shift: "Day", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Oakwood Manor", shift: "Day", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
  ]},
  { providerId: "pv-003", days: [
    { facility: "Palm Gardens", shift: "Day", mode: "telemedicine" },
    { facility: "Willow Creek", shift: "Day", mode: "telemedicine" },
    { facility: "Palm Gardens", shift: "Day", mode: "telemedicine" },
    { facility: "Willow Creek", shift: "Day", mode: "telemedicine" },
    { facility: "Palm Gardens", shift: "Day", mode: "telemedicine" },
    { facility: "Off", shift: "Off", mode: "telemedicine" },
    { facility: "Off", shift: "Off", mode: "telemedicine" },
  ]},
  { providerId: "pv-004", days: [
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
  ]},
  { providerId: "pv-005", days: [
    { facility: "Willow Creek", shift: "Day", mode: "on-site" },
    { facility: "Palm Gardens", shift: "Day", mode: "on-site" },
    { facility: "Willow Creek", shift: "Day", mode: "on-site" },
    { facility: "Palm Gardens", shift: "Day", mode: "on-site" },
    { facility: "Willow Creek", shift: "Day", mode: "on-site" },
    { facility: "Palm Gardens", shift: "Day", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
  ]},
  { providerId: "pv-006", days: [
    { facility: "Off", shift: "Off", mode: "on-site" },
    { facility: "Willow Creek", shift: "Day", mode: "on-site" },
    { facility: "Willow Creek", shift: "Day", mode: "on-site" },
    { facility: "Willow Creek", shift: "Day", mode: "on-site" },
    { facility: "Willow Creek", shift: "Night", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
  ]},
  { providerId: "pv-007", days: [
    { facility: "Oakwood Manor", shift: "Day", mode: "telemedicine" },
    { facility: "Palm Gardens", shift: "Day", mode: "telemedicine" },
    { facility: "Oakwood Manor", shift: "Day", mode: "telemedicine" },
    { facility: "Palm Gardens", shift: "Day", mode: "telemedicine" },
    { facility: "Off", shift: "Off", mode: "telemedicine" },
    { facility: "Oakwood Manor", shift: "Night", mode: "telemedicine" },
    { facility: "Off", shift: "Off", mode: "telemedicine" },
  ]},
  { providerId: "pv-008", days: [
    { facility: "Off", shift: "Off", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Oakwood Manor", shift: "Day", mode: "on-site" },
    { facility: "Sunrise Senior Living", shift: "Day", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
    { facility: "Off", shift: "Off", mode: "on-site" },
  ]},
];

const FACILITY_CENSUS: FacilityCensus[] = [
  { id: "fc-001", name: "Sunrise Senior Living", location: "Troy, MI", current: 94, capacity: 120, acuityDistribution: { low: 34, medium: 42, high: 18 }, providersOnDuty: ["Dr. Sarah Martinez", "NP Lisa Thompson", "Dr. Michael Brown"], providerToPatientRatio: "1:31", dayShiftCoverage: 95, nightShiftCoverage: 88, weekendCoverage: 82, forecastAdmissions7d: 6, forecastDischarges7d: 4 },
  { id: "fc-002", name: "Oakwood Manor", location: "Dearborn, MI", current: 78, capacity: 85, acuityDistribution: { low: 22, medium: 35, high: 21 }, providersOnDuty: ["Dr. Ahmed Khan", "NP Emily Chen"], providerToPatientRatio: "1:39", dayShiftCoverage: 90, nightShiftCoverage: 72, weekendCoverage: 68, forecastAdmissions7d: 5, forecastDischarges7d: 7 },
  { id: "fc-003", name: "Palm Gardens", location: "Boca Raton, FL", current: 132, capacity: 150, acuityDistribution: { low: 48, medium: 58, high: 26 }, providersOnDuty: ["Dr. Rachel Green", "NP Carlos Rivera", "Dr. Ahmed Khan"], providerToPatientRatio: "1:44", dayShiftCoverage: 98, nightShiftCoverage: 92, weekendCoverage: 90, forecastAdmissions7d: 8, forecastDischarges7d: 6 },
  { id: "fc-004", name: "Willow Creek", location: "Jacksonville, FL", current: 87, capacity: 100, acuityDistribution: { low: 28, medium: 38, high: 21 }, providersOnDuty: ["NP Carlos Rivera", "Dr. James Wilson"], providerToPatientRatio: "1:43", dayShiftCoverage: 92, nightShiftCoverage: 78, weekendCoverage: 75, forecastAdmissions7d: 4, forecastDischarges7d: 5 },
];

const OPEN_SHIFTS: OpenShift[] = [
  { id: "os-001", facility: "Oakwood Manor", date: "2026-03-03", shift: "Night", role: "MD", severity: "critical" },
  { id: "os-002", facility: "Willow Creek", date: "2026-03-04", shift: "Night", role: "NP", severity: "warning" },
  { id: "os-003", facility: "Oakwood Manor", date: "2026-03-05", shift: "Day", role: "NP", severity: "warning" },
];

const PROVIDER_COSTS: ProviderCost[] = [
  { providerId: "pv-001", name: "Dr. Sarah Martinez", type: "MD", mode: "telemedicine", hoursPerMonth: 160, ratePerHour: 150, monthlyCost: 24000, costPerPatient: 143 },
  { providerId: "pv-002", name: "Dr. Ahmed Khan", type: "MD", mode: "on-site", hoursPerMonth: 184, ratePerHour: 180, monthlyCost: 33120, costPerPatient: 148 },
  { providerId: "pv-003", name: "Dr. Rachel Green", type: "MD", mode: "telemedicine", hoursPerMonth: 152, ratePerHour: 150, monthlyCost: 22800, costPerPatient: 150 },
  { providerId: "pv-004", name: "NP Lisa Thompson", type: "NP", mode: "on-site", hoursPerMonth: 168, ratePerHour: 95, monthlyCost: 15960, costPerPatient: 83 },
  { providerId: "pv-005", name: "NP Carlos Rivera", type: "NP", mode: "on-site", hoursPerMonth: 176, ratePerHour: 95, monthlyCost: 16720, costPerPatient: 80 },
  { providerId: "pv-006", name: "Dr. James Wilson", type: "MD", mode: "on-site", hoursPerMonth: 140, ratePerHour: 180, monthlyCost: 25200, costPerPatient: 180 },
  { providerId: "pv-007", name: "NP Emily Chen", type: "NP", mode: "telemedicine", hoursPerMonth: 144, ratePerHour: 80, monthlyCost: 11520, costPerPatient: 72 },
  { providerId: "pv-008", name: "Dr. Michael Brown", type: "MD", mode: "on-site", hoursPerMonth: 128, ratePerHour: 180, monthlyCost: 23040, costPerPatient: 168 },
];

// --- Tab Components ---

function ProviderScheduleTab() {
  return (
    <div className="space-y-6">
      {/* Weekly Calendar Grid */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Calendar className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Weekly Schedule — Mar 3-9, 2026</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5 min-w-[160px]">Provider</th>
                {DAY_LABELS.map((d) => (
                  <th key={d} className="text-center text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-2 py-2.5 min-w-[110px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {WEEK_SCHEDULES.map((ws) => {
                const provider = PROVIDERS.find((p) => p.id === ws.providerId);
                if (!provider) return null;
                return (
                  <tr key={ws.providerId} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--medos-gray-100)] flex items-center justify-center shrink-0">
                          {provider.mode === "telemedicine" ? (
                            <Video className="w-3 h-3 text-blue-500" />
                          ) : (
                            <MapPin className="w-3 h-3 text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-[var(--medos-navy)]">{provider.name}</span>
                          <p className="text-[9px] text-[var(--medos-gray-400)]">{provider.type} / {provider.mode}</p>
                        </div>
                      </div>
                    </td>
                    {ws.days.map((day, i) => {
                      const facilityClass = FACILITY_COLORS[day.facility] || FACILITY_COLORS["Off"];
                      return (
                        <td key={i} className="px-2 py-3">
                          {day.shift === "Off" ? (
                            <div className="text-center">
                              <span className="text-[9px] text-[var(--medos-gray-400)]">Off</span>
                            </div>
                          ) : (
                            <div className={cn("rounded-md px-2 py-1.5 text-center", facilityClass)}>
                              <p className="text-[9px] font-medium truncate">{day.facility.split(" ")[0]}</p>
                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                {day.shift === "Day" ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                                <span className="text-[8px]">{day.shift}</span>
                                {day.mode === "telemedicine" && <Video className="w-2.5 h-2.5 ml-0.5" />}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provider List View */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Users className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Provider Details ({PROVIDERS.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Provider", "Type", "Mode", "Today", "Shift", "Hours/Week", "Patients/Week", "Status"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {PROVIDERS.map((pv) => {
                const statusCfg = STATUS_CONFIG[pv.status];
                return (
                  <tr key={pv.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">{pv.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", pv.type === "MD" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700")}>{pv.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {pv.mode === "telemedicine" ? <Video className="w-3 h-3 text-blue-500" /> : <MapPin className="w-3 h-3 text-emerald-500" />}
                        <span className="text-xs text-[var(--medos-gray-600)]">{pv.mode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{pv.todayAssignment}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{pv.todayShift}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">{pv.hoursThisWeek}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{pv.patientsSeen}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusCfg.bg, statusCfg.text)}>{statusCfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shifts Alert */}
      {OPEN_SHIFTS.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Open Shifts ({OPEN_SHIFTS.length})</h3>
          </div>
          <div className="divide-y divide-[var(--medos-gray-100)]">
            {OPEN_SHIFTS.map((os) => (
              <div key={os.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", os.severity === "critical" ? "bg-red-400" : "bg-amber-400")} />
                  <div>
                    <span className="text-xs font-medium text-[var(--medos-navy)]">{os.facility}</span>
                    <p className="text-[10px] text-[var(--medos-gray-500)]">{os.date} / {os.shift} Shift / {os.role}</p>
                  </div>
                </div>
                <button className="text-[10px] font-medium text-[var(--medos-primary)] hover:underline">Fill Shift</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FacilityCensusTab() {
  const totalCensus = FACILITY_CENSUS.reduce((s, f) => s + f.current, 0);
  const totalCapacity = FACILITY_CENSUS.reduce((s, f) => s + f.capacity, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Census", value: totalCensus.toString(), color: "text-[var(--medos-primary)]" },
          { label: "Total Capacity", value: totalCapacity.toString(), color: "text-[var(--medos-gray-600)]" },
          { label: "Network Occupancy", value: `${Math.round((totalCensus / totalCapacity) * 100)}%`, color: "text-blue-600" },
          { label: "Facilities", value: FACILITY_CENSUS.length.toString(), color: "text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Facility Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FACILITY_CENSUS.map((fac) => {
          const occupancy = Math.round((fac.current / fac.capacity) * 100);
          const totalAcuity = fac.acuityDistribution.low + fac.acuityDistribution.medium + fac.acuityDistribution.high;
          return (
            <div key={fac.id} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{fac.name}</h3>
                  <p className="text-[10px] text-[var(--medos-gray-500)]">{fac.location}</p>
                </div>
                <span className="text-xs font-medium text-[var(--medos-gray-500)]">{fac.providerToPatientRatio} ratio</span>
              </div>

              {/* Census Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--medos-gray-500)]">Census</span>
                  <span className="text-[10px] font-medium text-[var(--medos-navy)]">{fac.current} / {fac.capacity} ({occupancy}%)</span>
                </div>
                <div className="h-3 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", occupancy > 90 ? "bg-red-400" : occupancy > 75 ? "bg-amber-400" : "bg-emerald-400")}
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
              </div>

              {/* Acuity Distribution */}
              <div className="mb-4">
                <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Acuity Distribution</p>
                <div className="flex h-4 rounded-full overflow-hidden">
                  <div className="bg-emerald-400" style={{ width: `${(fac.acuityDistribution.low / totalAcuity) * 100}%` }} title={`Low: ${fac.acuityDistribution.low}`} />
                  <div className="bg-amber-400" style={{ width: `${(fac.acuityDistribution.medium / totalAcuity) * 100}%` }} title={`Medium: ${fac.acuityDistribution.medium}`} />
                  <div className="bg-red-400" style={{ width: `${(fac.acuityDistribution.high / totalAcuity) * 100}%` }} title={`High: ${fac.acuityDistribution.high}`} />
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-[9px] text-[var(--medos-gray-500)] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Low: {fac.acuityDistribution.low}</span>
                  <span className="text-[9px] text-[var(--medos-gray-500)] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Med: {fac.acuityDistribution.medium}</span>
                  <span className="text-[9px] text-[var(--medos-gray-500)] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />High: {fac.acuityDistribution.high}</span>
                </div>
              </div>

              {/* Providers On Duty */}
              <div className="mb-4">
                <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Providers on Duty</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {fac.providersOnDuty.map((name) => (
                    <span key={name} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]">{name}</span>
                  ))}
                </div>
              </div>

              {/* Shift Coverage */}
              <div className="pt-4 border-t border-[var(--medos-gray-100)] space-y-2">
                <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider font-medium">Shift Coverage</p>
                {[
                  { label: "Day", pct: fac.dayShiftCoverage, icon: Sun },
                  { label: "Night", pct: fac.nightShiftCoverage, icon: Moon },
                  { label: "Weekend", pct: fac.weekendCoverage, icon: CalendarDays },
                ].map((shift) => {
                  const ShiftIcon = shift.icon;
                  return (
                    <div key={shift.label} className="flex items-center gap-2">
                      <ShiftIcon className="w-3 h-3 text-[var(--medos-gray-400)]" />
                      <span className="text-[10px] text-[var(--medos-gray-600)] w-16">{shift.label}</span>
                      <div className="flex-1 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", shift.pct >= 90 ? "bg-emerald-400" : shift.pct >= 80 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${shift.pct}%` }} />
                      </div>
                      <span className={cn("text-[10px] font-medium w-8 text-right", shift.pct >= 90 ? "text-emerald-600" : shift.pct >= 80 ? "text-amber-600" : "text-red-600")}>{shift.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Census Predictions */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">7-Day Census Forecast</h3>
          <span className="text-[9px] text-[var(--medos-gray-400)] ml-auto">AI-generated predictions</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FACILITY_CENSUS.map((fac) => {
            const netChange = fac.forecastAdmissions7d - fac.forecastDischarges7d;
            const projectedCensus = fac.current + netChange;
            return (
              <div key={fac.id} className="bg-[var(--medos-gray-50)] rounded-lg p-4">
                <p className="text-xs font-medium text-[var(--medos-navy)] mb-2">{fac.name}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--medos-gray-500)]">Expected Admits</span>
                    <span className="font-medium text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{fac.forecastAdmissions7d}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--medos-gray-500)]">Expected D/C</span>
                    <span className="font-medium text-blue-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{fac.forecastDischarges7d}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[var(--medos-gray-200)]">
                    <span className="text-[var(--medos-gray-500)]">Projected Census</span>
                    <span className={cn("font-bold", netChange > 0 ? "text-amber-600" : "text-emerald-600")}>{projectedCensus}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CostAnalysisTab() {
  const totalMonthlySpend = PROVIDER_COSTS.reduce((s, p) => s + p.monthlyCost, 0);
  const optimizedProjection = Math.round(totalMonthlySpend * 0.87);
  const potentialSavings = totalMonthlySpend - optimizedProjection;
  const locumCurrentSpend = 22500;
  const locumOptimized = 10000;

  return (
    <div className="space-y-6">
      {/* Top-Level Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Monthly Staffing Spend", value: `$${(totalMonthlySpend / 1000).toFixed(0)}K`, color: "text-[var(--medos-navy)]" },
          { label: "Optimized Projection", value: `$${(optimizedProjection / 1000).toFixed(0)}K`, color: "text-blue-600" },
          { label: "Potential Savings", value: `$${(potentialSavings / 1000).toFixed(1)}K`, color: "text-emerald-600" },
          { label: "Savings Rate", value: "13%", color: "text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Provider Cost Breakdown */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <DollarSign className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Provider Cost Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Provider", "Type", "Mode", "Hours/Mo", "Rate/Hr", "Monthly Cost", "Cost/Patient"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {PROVIDER_COSTS.map((pc) => (
                <tr key={pc.providerId} className="hover:bg-[var(--medos-gray-50)] transition-default">
                  <td className="px-4 py-3"><span className="text-xs font-medium text-[var(--medos-navy)]">{pc.name}</span></td>
                  <td className="px-4 py-3"><span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", pc.type === "MD" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700")}>{pc.type}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {pc.mode === "telemedicine" ? <Video className="w-3 h-3 text-blue-500" /> : <MapPin className="w-3 h-3 text-emerald-500" />}
                      <span className="text-xs text-[var(--medos-gray-600)]">{pc.mode}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-[var(--medos-gray-600)]">{pc.hoursPerMonth}h</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-[var(--medos-gray-600)]">${pc.ratePerHour}</span></td>
                  <td className="px-4 py-3"><span className="text-xs font-medium text-[var(--medos-navy)]">${pc.monthlyCost.toLocaleString()}</span></td>
                  <td className="px-4 py-3"><span className={cn("text-xs font-medium", pc.costPerPatient > 150 ? "text-red-600" : pc.costPerPatient > 100 ? "text-amber-600" : "text-emerald-600")}>${pc.costPerPatient}</span></td>
                </tr>
              ))}
              <tr className="bg-[var(--medos-gray-50)] font-semibold">
                <td className="px-4 py-3" colSpan={5}><span className="text-xs text-[var(--medos-navy)]">Total</span></td>
                <td className="px-4 py-3"><span className="text-xs text-[var(--medos-navy)]">${totalMonthlySpend.toLocaleString()}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-[var(--medos-gray-600)]">avg ${Math.round(PROVIDER_COSTS.reduce((s, p) => s + p.costPerPatient, 0) / PROVIDER_COSTS.length)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Current vs Optimized Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[var(--medos-gray-500)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Current Model</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "MD On-site", value: "$81,360/mo", detail: "4 MDs x avg 163h" },
              { label: "MD Telemedicine", value: "$46,800/mo", detail: "2 MDs x avg 156h" },
              { label: "NP On-site", value: "$32,680/mo", detail: "2 NPs x avg 172h" },
              { label: "NP Telemedicine", value: "$11,520/mo", detail: "1 NP x 144h" },
              { label: "Locum Tenens", value: `$${locumCurrentSpend.toLocaleString()}/mo`, detail: "~9 locum days/month" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--medos-navy)]">{item.label}</span>
                  <p className="text-[10px] text-[var(--medos-gray-400)]">{item.detail}</p>
                </div>
                <span className="text-xs font-medium text-[var(--medos-navy)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-emerald-700">Optimized Model</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "MD On-site", value: "$68,400/mo", detail: "Shift Dr. Khan Tue to Oakwood, eliminate 1 locum" },
              { label: "MD Telemedicine", value: "$49,200/mo", detail: "Expand tele coverage to fill night gaps" },
              { label: "NP On-site", value: "$32,680/mo", detail: "No change — efficient utilization" },
              { label: "NP Telemedicine", value: "$15,360/mo", detail: "Add NP Chen weekday evenings for triage" },
              { label: "Locum Tenens", value: `$${locumOptimized.toLocaleString()}/mo`, detail: "Reduce to ~4 locum days/month" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--medos-navy)]">{item.label}</span>
                  <p className="text-[10px] text-emerald-600">{item.detail}</p>
                </div>
                <span className="text-xs font-medium text-emerald-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Optimization Recommendations */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">AI Staffing Recommendations</h3>
        </div>
        <div className="space-y-3">
          {[
            { action: "Shift Dr. Khan from Sunrise to Oakwood on Tuesdays", impact: "Eliminates 1 locum day/week", savings: "$10,000/month", confidence: 94 },
            { action: "Extend NP Chen telemedicine hours to cover Oakwood night triage (7pm-11pm)", impact: "Reduces night coverage gap from 28% to 8%", savings: "$3,840/month vs locum NP", confidence: 91 },
            { action: "Cross-train NP Rivera for Palm Gardens weekend coverage", impact: "Fills 2 open weekend shifts per month", savings: "$5,000/month", confidence: 87 },
            { action: "Convert Dr. Brown Wednesday shift from on-site to telemedicine", impact: "Saves travel time; no clinical impact for scheduled patients", savings: "$960/month", confidence: 82 },
          ].map((rec, i) => (
            <div key={i} className="bg-[var(--medos-gray-50)] rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-[var(--medos-navy)]">{rec.action}</p>
                <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2", rec.confidence >= 90 ? "bg-emerald-50 text-emerald-700" : rec.confidence >= 85 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>
                  {rec.confidence}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-[var(--medos-gray-500)]"><strong>Impact:</strong> {rec.impact}</span>
                <span className="text-emerald-600 font-medium"><strong>Savings:</strong> {rec.savings}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend (simple bar chart) */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Monthly Staffing Cost Trend</h3>
        </div>
        <div className="flex items-end gap-3 h-40">
          {[
            { month: "Sep", amount: 185000 },
            { month: "Oct", amount: 192000 },
            { month: "Nov", amount: 188000 },
            { month: "Dec", amount: 195000 },
            { month: "Jan", amount: 178000 },
            { month: "Feb", amount: totalMonthlySpend },
            { month: "Mar*", amount: optimizedProjection },
          ].map((m) => {
            const maxAmount = 200000;
            const heightPct = (m.amount / maxAmount) * 100;
            const isProjected = m.month === "Mar*";
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-medium text-[var(--medos-gray-600)]">${(m.amount / 1000).toFixed(0)}K</span>
                <div
                  className={cn("w-full rounded-t-md", isProjected ? "bg-emerald-400 bg-opacity-60 border-2 border-dashed border-emerald-500" : "bg-[var(--medos-primary)] bg-opacity-70")}
                  style={{ height: `${heightPct}%` }}
                />
                <span className={cn("text-[9px]", isProjected ? "font-medium text-emerald-600" : "text-[var(--medos-gray-500)]")}>{m.month}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-[var(--medos-gray-400)] mt-2 text-right">*Mar projected with AI optimization</p>
      </div>
    </div>
  );
}

// --- Main Export ---

export default function StaffingOptimizerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("schedule");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Staffing Optimizer</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Dynamic provider allocation — workforce efficiency across 21 states
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
      {activeTab === "schedule" && <ProviderScheduleTab />}
      {activeTab === "census" && <FacilityCensusTab />}
      {activeTab === "cost" && <CostAnalysisTab />}
    </div>
  );
}
