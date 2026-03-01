"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Bed,
  Activity,
  Stethoscope,
  Watch,
  Smartphone,
  Heart,
  Filter,
  ChevronDown,
  AlertTriangle,
  Clock,
  UserCheck,
  Moon,
  Sun,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "facilities" | "patients" | "staffing";
type FacilityStatus = "healthy" | "degraded";
type DeviceType = "oura" | "apple-watch" | "dexcom";

interface Facility {
  id: string;
  name: string;
  location: string;
  beds: number;
  census: number;
  status: FacilityStatus;
  avgAcuity: number;
  readmissionRate: number;
  staffingRatio: number;
}

interface Patient {
  id: string;
  name: string;
  room: string;
  facilityId: string;
  acuity: number;
  primaryDx: string;
  admissionDate: string;
  attending: string;
  devices: DeviceType[];
  lastVitals: {
    bp: string;
    hr: number;
    spo2: number;
    temp: number;
  };
}

interface StaffingData {
  facilityId: string;
  facilityName: string;
  mdOnSite: number;
  mdTele: number;
  nps: number;
  rns: number;
  dayShiftCoverage: number;
  nightShiftCoverage: number;
  weekendCoverage: number;
}

interface StaffingAlert {
  id: string;
  facility: string;
  shift: string;
  role: string;
  severity: "critical" | "warning";
  message: string;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "facilities", label: "Facilities", icon: Building2 },
  { key: "patients", label: "Patients", icon: Users },
  { key: "staffing", label: "Staffing", icon: UserCheck },
];

const STATUS_DOT: Record<FacilityStatus, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
};

const ACUITY_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-emerald-50", text: "text-emerald-700" },
  2: { bg: "bg-blue-50", text: "text-blue-700" },
  3: { bg: "bg-yellow-50", text: "text-yellow-700" },
  4: { bg: "bg-amber-50", text: "text-amber-700" },
  5: { bg: "bg-red-50", text: "text-red-700" },
};

const DEVICE_INFO: Record<DeviceType, { label: string; icon: typeof Watch }> = {
  oura: { label: "Oura Ring", icon: Heart },
  "apple-watch": { label: "Apple Watch", icon: Watch },
  dexcom: { label: "Dexcom G7", icon: Smartphone },
};

// --- Mock Data ---

const FACILITIES: Facility[] = [
  {
    id: "fac-001",
    name: "Sunrise Senior Living",
    location: "Troy, MI",
    beds: 120,
    census: 94,
    status: "healthy",
    avgAcuity: 2.8,
    readmissionRate: 12.4,
    staffingRatio: 1.6,
  },
  {
    id: "fac-002",
    name: "Oakwood Manor",
    location: "Dearborn, MI",
    beds: 85,
    census: 78,
    status: "degraded",
    avgAcuity: 3.1,
    readmissionRate: 15.2,
    staffingRatio: 1.4,
  },
  {
    id: "fac-003",
    name: "Palm Gardens",
    location: "Boca Raton, FL",
    beds: 150,
    census: 132,
    status: "healthy",
    avgAcuity: 2.5,
    readmissionRate: 10.8,
    staffingRatio: 1.7,
  },
  {
    id: "fac-004",
    name: "Willow Creek",
    location: "Jacksonville, FL",
    beds: 100,
    census: 87,
    status: "healthy",
    avgAcuity: 3.4,
    readmissionRate: 14.1,
    staffingRatio: 1.5,
  },
];

const PATIENTS: Patient[] = [
  {
    id: "pt-001",
    name: "Margaret Wilson",
    room: "214-A",
    facilityId: "fac-001",
    acuity: 4,
    primaryDx: "CHF (Congestive Heart Failure)",
    admissionDate: "2026-02-18",
    attending: "Dr. Maria Santos",
    devices: ["oura", "apple-watch"],
    lastVitals: { bp: "148/92", hr: 88, spo2: 93, temp: 98.4 },
  },
  {
    id: "pt-002",
    name: "James Brown",
    room: "108-B",
    facilityId: "fac-001",
    acuity: 3,
    primaryDx: "COPD Exacerbation",
    admissionDate: "2026-02-22",
    attending: "Dr. Ahmed Khan",
    devices: ["apple-watch"],
    lastVitals: { bp: "132/78", hr: 76, spo2: 91, temp: 98.8 },
  },
  {
    id: "pt-003",
    name: "Susan Lee",
    room: "305",
    facilityId: "fac-002",
    acuity: 5,
    primaryDx: "CHF with Acute Kidney Injury",
    admissionDate: "2026-02-25",
    attending: "Dr. Maria Santos",
    devices: ["oura", "apple-watch"],
    lastVitals: { bp: "156/98", hr: 96, spo2: 90, temp: 99.1 },
  },
  {
    id: "pt-004",
    name: "Robert Davis",
    room: "202",
    facilityId: "fac-002",
    acuity: 2,
    primaryDx: "Hip Fracture (Post-ORIF)",
    admissionDate: "2026-02-20",
    attending: "Dr. Lisa Chen",
    devices: ["apple-watch"],
    lastVitals: { bp: "124/76", hr: 72, spo2: 97, temp: 98.2 },
  },
  {
    id: "pt-005",
    name: "David Kim",
    room: "412-A",
    facilityId: "fac-003",
    acuity: 3,
    primaryDx: "Diabetes Type 2 (Uncontrolled)",
    admissionDate: "2026-02-15",
    attending: "Dr. Ahmed Khan",
    devices: ["dexcom", "oura"],
    lastVitals: { bp: "138/84", hr: 80, spo2: 96, temp: 98.6 },
  },
  {
    id: "pt-006",
    name: "Eleanor Thompson",
    room: "118",
    facilityId: "fac-003",
    acuity: 4,
    primaryDx: "Pneumonia (Community-Acquired)",
    admissionDate: "2026-02-26",
    attending: "Dr. Maria Santos",
    devices: ["apple-watch"],
    lastVitals: { bp: "142/88", hr: 92, spo2: 92, temp: 101.2 },
  },
  {
    id: "pt-007",
    name: "William Harris",
    room: "203-B",
    facilityId: "fac-003",
    acuity: 2,
    primaryDx: "UTI (Complicated)",
    admissionDate: "2026-02-24",
    attending: "Dr. Lisa Chen",
    devices: [],
    lastVitals: { bp: "128/74", hr: 70, spo2: 97, temp: 99.4 },
  },
  {
    id: "pt-008",
    name: "Patricia Moore",
    room: "310",
    facilityId: "fac-004",
    acuity: 3,
    primaryDx: "COPD with Oxygen Dependence",
    admissionDate: "2026-02-19",
    attending: "Dr. Ahmed Khan",
    devices: ["oura", "apple-watch"],
    lastVitals: { bp: "136/82", hr: 78, spo2: 93, temp: 98.5 },
  },
  {
    id: "pt-009",
    name: "Charles Anderson",
    room: "105",
    facilityId: "fac-004",
    acuity: 1,
    primaryDx: "Hip Fracture (Rehab Phase)",
    admissionDate: "2026-02-10",
    attending: "Dr. Lisa Chen",
    devices: ["apple-watch"],
    lastVitals: { bp: "118/72", hr: 68, spo2: 98, temp: 98.1 },
  },
  {
    id: "pt-010",
    name: "Dorothy Martinez",
    room: "220",
    facilityId: "fac-004",
    acuity: 4,
    primaryDx: "CHF (Decompensated)",
    admissionDate: "2026-02-27",
    attending: "Dr. Maria Santos",
    devices: ["oura", "apple-watch", "dexcom"],
    lastVitals: { bp: "152/96", hr: 94, spo2: 91, temp: 98.9 },
  },
];

const STAFFING: StaffingData[] = [
  {
    facilityId: "fac-001",
    facilityName: "Sunrise Senior Living",
    mdOnSite: 2,
    mdTele: 3,
    nps: 4,
    rns: 18,
    dayShiftCoverage: 95,
    nightShiftCoverage: 88,
    weekendCoverage: 82,
  },
  {
    facilityId: "fac-002",
    facilityName: "Oakwood Manor",
    mdOnSite: 1,
    mdTele: 2,
    nps: 3,
    rns: 12,
    dayShiftCoverage: 90,
    nightShiftCoverage: 72,
    weekendCoverage: 68,
  },
  {
    facilityId: "fac-003",
    facilityName: "Palm Gardens",
    mdOnSite: 3,
    mdTele: 4,
    nps: 5,
    rns: 22,
    dayShiftCoverage: 98,
    nightShiftCoverage: 92,
    weekendCoverage: 90,
  },
  {
    facilityId: "fac-004",
    facilityName: "Willow Creek",
    mdOnSite: 2,
    mdTele: 2,
    nps: 3,
    rns: 14,
    dayShiftCoverage: 92,
    nightShiftCoverage: 78,
    weekendCoverage: 75,
  },
];

const STAFFING_ALERTS: StaffingAlert[] = [
  {
    id: "sa-001",
    facility: "Oakwood Manor",
    shift: "Night (7pm-7am)",
    role: "RN",
    severity: "critical",
    message: "Night shift RN staffing at 72% — 2 positions unfilled for tonight",
  },
  {
    id: "sa-002",
    facility: "Oakwood Manor",
    shift: "Weekend (Sat-Sun)",
    role: "MD",
    severity: "warning",
    message: "Weekend MD on-site coverage below minimum — telemedicine backup required",
  },
  {
    id: "sa-003",
    facility: "Willow Creek",
    shift: "Weekend (Sat-Sun)",
    role: "NP",
    severity: "warning",
    message: "Weekend NP coverage at 75% — 1 position unfilled",
  },
  {
    id: "sa-004",
    facility: "Willow Creek",
    shift: "Night (7pm-7am)",
    role: "RN",
    severity: "critical",
    message: "Night shift RN-to-patient ratio at 1:9 — below recommended 1:7",
  },
];

// --- Tab Components ---

function FacilitiesTab() {
  const totalBeds = FACILITIES.reduce((s, f) => s + f.beds, 0);
  const totalCensus = FACILITIES.reduce((s, f) => s + f.census, 0);
  const avgOccupancy = Math.round((totalCensus / totalBeds) * 100);
  const avgAcuity = (FACILITIES.reduce((s, f) => s + f.avgAcuity, 0) / FACILITIES.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FACILITIES.map((fac) => {
          const occupancy = Math.round((fac.census / fac.beds) * 100);
          return (
            <div
              key={fac.id}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[fac.status])} />
                    <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{fac.name}</h3>
                  </div>
                  <p className="text-xs text-[var(--medos-gray-500)] mt-0.5 ml-4">{fac.location}</p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    fac.status === "healthy"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  {fac.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
                    Beds / Census
                  </p>
                  <p className="text-lg font-bold text-[var(--medos-navy)]">
                    {fac.census}{" "}
                    <span className="text-xs font-normal text-[var(--medos-gray-400)]">/ {fac.beds}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
                    Avg Acuity
                  </p>
                  <p className="text-lg font-bold text-[var(--medos-navy)]">
                    {fac.avgAcuity.toFixed(1)}
                    <span className="text-xs font-normal text-[var(--medos-gray-400)]"> / 5</span>
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--medos-gray-500)]">Occupancy</span>
                  <span className="text-[10px] font-medium text-[var(--medos-navy)]">{occupancy}%</span>
                </div>
                <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      occupancy > 90 ? "bg-red-400" : occupancy > 75 ? "bg-amber-400" : "bg-emerald-400"
                    )}
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--medos-gray-100)]">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-[var(--medos-gray-400)]" />
                  <span className="text-[10px] text-[var(--medos-gray-500)]">
                    Readmission: <strong className="text-[var(--medos-navy)]">{fac.readmissionRate}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-[var(--medos-gray-400)]" />
                  <span className="text-[10px] text-[var(--medos-gray-500)]">
                    Staff ratio: <strong className="text-[var(--medos-navy)]">{fac.staffingRatio}</strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary KPI Row */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Network Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Total Beds</p>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{totalBeds}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Total Census</p>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{totalCensus}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Avg Occupancy</p>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{avgOccupancy}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Avg Acuity</p>
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{avgAcuity}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientsTab() {
  const [facilityFilter, setFacilityFilter] = useState<string>("all");

  const filtered =
    facilityFilter === "all"
      ? PATIENTS
      : PATIENTS.filter((p) => p.facilityId === facilityFilter);

  const getFacilityName = (id: string) => FACILITIES.find((f) => f.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
          <span className="text-xs text-[var(--medos-gray-500)]">Facility:</span>
          <div className="relative">
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="appearance-none bg-white border border-[var(--medos-gray-200)] rounded-md pl-3 pr-7 py-1.5 text-xs text-[var(--medos-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--medos-primary)]"
            >
              <option value="all">All Facilities</option>
              {FACILITIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[var(--medos-gray-400)] pointer-events-none" />
          </div>
        </div>

        {/* Acuity Legend */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[10px] text-[var(--medos-gray-400)]">Acuity:</span>
          {[1, 2, 3, 4, 5].map((a) => (
            <span
              key={a}
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                ACUITY_COLORS[a].bg,
                ACUITY_COLORS[a].text
              )}
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Users className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Patient Census ({filtered.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Name", "Room", "Facility", "Acuity", "Primary Dx", "Admitted", "Devices", "Attending"].map(
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
              {filtered.map((pt) => (
                <tr key={pt.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[var(--medos-navy)]">{pt.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[var(--medos-gray-600)]">{pt.room}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[var(--medos-gray-600)]">{getFacilityName(pt.facilityId)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        ACUITY_COLORS[pt.acuity].bg,
                        ACUITY_COLORS[pt.acuity].text
                      )}
                    >
                      {pt.acuity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[var(--medos-gray-600)]">{pt.primaryDx}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[var(--medos-gray-500)]">{pt.admissionDate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {pt.devices.length === 0 ? (
                        <span className="text-[10px] text-[var(--medos-gray-400)]">None</span>
                      ) : (
                        pt.devices.map((d) => {
                          const DevIcon = DEVICE_INFO[d].icon;
                          return (
                            <span
                              key={d}
                              title={DEVICE_INFO[d].label}
                              className="w-5 h-5 rounded bg-[var(--medos-gray-100)] flex items-center justify-center"
                            >
                              <DevIcon className="w-3 h-3 text-[var(--medos-primary)]" />
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[var(--medos-gray-600)]">{pt.attending}</span>
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

function StaffingTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STAFFING.map((staff) => (
          <div
            key={staff.facilityId}
            className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[var(--medos-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{staff.facilityName}</h3>
            </div>

            {/* Provider Breakdown */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "MD On-site", value: staff.mdOnSite, icon: Stethoscope },
                { label: "MD Tele", value: staff.mdTele, icon: Smartphone },
                { label: "NPs", value: staff.nps, icon: UserCheck },
                { label: "RNs", value: staff.rns, icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="text-center">
                    <Icon className="w-3.5 h-3.5 mx-auto text-[var(--medos-gray-400)] mb-1" />
                    <p className="text-lg font-bold text-[var(--medos-navy)]">{item.value}</p>
                    <p className="text-[9px] text-[var(--medos-gray-500)] uppercase tracking-wider">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Shift Coverage */}
            <div className="space-y-3 pt-4 border-t border-[var(--medos-gray-100)]">
              <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider font-medium">
                Shift Coverage
              </p>
              {[
                { label: "Day Shift", pct: staff.dayShiftCoverage, icon: Sun },
                { label: "Night Shift", pct: staff.nightShiftCoverage, icon: Moon },
                { label: "Weekend", pct: staff.weekendCoverage, icon: CalendarDays },
              ].map((shift) => {
                const ShiftIcon = shift.icon;
                return (
                  <div key={shift.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <ShiftIcon className="w-3 h-3 text-[var(--medos-gray-400)]" />
                        <span className="text-[10px] text-[var(--medos-gray-600)]">{shift.label}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          shift.pct >= 90
                            ? "text-emerald-600"
                            : shift.pct >= 80
                              ? "text-amber-600"
                              : "text-red-600"
                        )}
                      >
                        {shift.pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          shift.pct >= 90
                            ? "bg-emerald-400"
                            : shift.pct >= 80
                              ? "bg-amber-400"
                              : "bg-red-400"
                        )}
                        style={{ width: `${shift.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Staffing Alerts */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Staffing Alerts ({STAFFING_ALERTS.length})
          </h3>
        </div>
        <div className="divide-y divide-[var(--medos-gray-100)]">
          {STAFFING_ALERTS.map((alert) => (
            <div key={alert.id} className="px-6 py-4 flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 w-2 h-2 rounded-full shrink-0",
                  alert.severity === "critical" ? "bg-red-400" : "bg-amber-400"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-[var(--medos-navy)]">{alert.facility}</span>
                  <span className="text-[10px] text-[var(--medos-gray-400)]">{alert.shift}</span>
                  <span
                    className={cn(
                      "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                      alert.severity === "critical"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    )}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-[var(--medos-gray-600)]">{alert.message}</p>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--medos-gray-400)]" />
                <span className="text-[10px] text-[var(--medos-gray-400)]">Now</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main Export ---

export default function FacilityConsolePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("facilities");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Facility Console</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Multi-site operational overview — powered by ChartEasy integration
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
      {activeTab === "facilities" && <FacilitiesTab />}
      {activeTab === "patients" && <PatientsTab />}
      {activeTab === "staffing" && <StaffingTab />}
    </div>
  );
}
