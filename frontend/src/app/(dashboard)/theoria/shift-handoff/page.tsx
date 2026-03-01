"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Thermometer,
  Heart,
  Wind,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  ListChecks,
  Clipboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "active" | "pending" | "vitals";
type Priority = "P1" | "P2" | "P3" | "P4";
type PendingStatus = "pending" | "in-progress";
type VitalTrend = "up" | "down" | "stable";
type VitalSeverity = "normal" | "warning" | "critical";

interface ShiftPatient {
  id: string;
  priority: Priority;
  name: string;
  facility: string;
  room: string;
  reason: string;
  brief: string;
  tasksPending: string[];
}

interface PendingItem {
  id: string;
  priority: Priority;
  description: string;
  patient: string;
  facility: string;
  createdAt: string;
  assignedTo: string;
  status: PendingStatus;
}

interface VitalReading {
  label: string;
  value: string;
  unit: string;
  trend: VitalTrend;
  severity: VitalSeverity;
  normalRange: string;
}

interface PatientVitals {
  id: string;
  name: string;
  facility: string;
  room: string;
  readings: VitalReading[];
  lastUpdated: string;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof ArrowLeftRight }[] = [
  { key: "active", label: "Active Shift", icon: Clipboard },
  { key: "pending", label: "Pending Items", icon: ListChecks },
  { key: "vitals", label: "Vitals Timeline", icon: Activity },
];

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string; border: string; dot: string }> = {
  P1: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-400" },
  P2: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" },
  P3: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-400" },
  P4: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-400" },
};

const TREND_ICONS: Record<VitalTrend, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const SEVERITY_COLORS: Record<VitalSeverity, { text: string; bg: string }> = {
  normal: { text: "text-emerald-700", bg: "bg-emerald-50" },
  warning: { text: "text-amber-700", bg: "bg-amber-50" },
  critical: { text: "text-red-700", bg: "bg-red-50" },
};

// --- Mock Data ---

const SHIFT_INFO = {
  id: "SH-2026-0301-N",
  currentDoctor: "Dr. Maria Santos",
  currentShift: "7:00 AM - 7:00 PM",
  incomingDoctor: "Dr. Ahmed Khan",
  incomingShift: "7:00 PM - 7:00 AM",
  timeRemaining: "4h 23m",
  totalPatients: 8,
  criticalCount: 2,
};

const SHIFT_PATIENTS: ShiftPatient[] = [
  {
    id: "sp-001",
    priority: "P1",
    name: "Susan Lee",
    facility: "Oakwood Manor",
    room: "305",
    reason: "New labs — critical troponin elevation",
    brief:
      "82F with CHF + AKI admitted 02/25. Troponin trending up from 0.04 to 0.18 ng/mL over 8h. BNP remains elevated at 1,240 pg/mL. Cardiology consult placed, awaiting response. Monitor for chest pain and dyspnea.",
    tasksPending: [
      "Follow up on cardiology consult response",
      "Repeat troponin in 4 hours (due 11:00 PM)",
      "Reassess fluid status — current I&O negative 200mL",
    ],
  },
  {
    id: "sp-002",
    priority: "P1",
    name: "Eleanor Thompson",
    facility: "Palm Gardens",
    room: "118",
    reason: "Vitals change — fever spike, worsening hypoxia",
    brief:
      "76F with CAP admitted 02/26. Temp spiked to 101.8F at 2:00 PM, SpO2 dropped to 89% on 2L NC. Increased to 4L NC, SpO2 now 92%. Blood cultures drawn. Awaiting chest X-ray results for progression assessment.",
    tasksPending: [
      "Review CXR results when available",
      "Consider broadening antibiotics if no improvement by midnight",
      "Continuous SpO2 monitoring — escalate if <90% on 4L",
    ],
  },
  {
    id: "sp-003",
    priority: "P2",
    name: "Margaret Wilson",
    facility: "Sunrise Senior Living",
    room: "214-A",
    reason: "Weight gain — possible fluid retention",
    brief:
      "79F with CHF admitted 02/18. Weight up 3.2 lbs over 48h (165.0 to 168.2 lbs). BNP elevated at 980 pg/mL. Bilateral ankle edema increased from 1+ to 2+. Current Lasix 40mg BID may need adjustment.",
    tasksPending: [
      "Discuss Lasix dose increase with attending",
      "Strict I&O — verify evening intake/output recorded",
      "Daily weight confirmed for 6:00 AM",
    ],
  },
  {
    id: "sp-004",
    priority: "P2",
    name: "Dorothy Martinez",
    facility: "Willow Creek",
    room: "220",
    reason: "Medication due — insulin adjustment pending",
    brief:
      "71F with decompensated CHF + DM2 admitted 02/27. Morning blood glucose was 287 mg/dL. Endocrine recommended sliding scale adjustment. Evening dose needs verification. Patient reports intermittent dizziness with position changes.",
    tasksPending: [
      "Verify insulin sliding scale adjustment was entered",
      "Check 6:00 PM blood glucose reading",
      "Orthostatic vitals if dizziness persists",
    ],
  },
  {
    id: "sp-005",
    priority: "P3",
    name: "David Kim",
    facility: "Palm Gardens",
    room: "412-A",
    reason: "Family request — care plan discussion",
    brief:
      "68M with uncontrolled DM2 admitted 02/15. Daughter called requesting meeting about discharge timeline and home care plan. Dexcom G7 readings stabilizing with A1C target reassessment scheduled. Patient motivated for self-management education.",
    tasksPending: [
      "Schedule family meeting (daughter available after 6:00 PM)",
      "Prepare discharge summary draft for family review",
    ],
  },
  {
    id: "sp-006",
    priority: "P3",
    name: "James Brown",
    facility: "Sunrise Senior Living",
    room: "108-B",
    reason: "Vitals change — SpO2 trending down",
    brief:
      "73M with COPD exacerbation admitted 02/22. SpO2 dipping to 91% intermittently on 2L NC. No acute distress. Nebulizer treatments continuing Q4H. Pulmonology follow-up scheduled for tomorrow morning.",
    tasksPending: [
      "Ensure nebulizer treatments continue on schedule",
      "Overnight SpO2 monitoring with 5-min interval checks",
    ],
  },
  {
    id: "sp-007",
    priority: "P4",
    name: "Robert Davis",
    facility: "Oakwood Manor",
    room: "202",
    reason: "Routine — PT progress update",
    brief:
      "65M, day 9 post hip ORIF. PT reports good progress — ambulating 50ft with walker, weight-bearing as tolerated. Pain well-controlled at 3/10 on current regimen. Discharge planning for end of week.",
    tasksPending: ["Review PT progress note when filed", "Confirm discharge date with care coordinator"],
  },
  {
    id: "sp-008",
    priority: "P4",
    name: "Charles Anderson",
    facility: "Willow Creek",
    room: "105",
    reason: "Routine — approaching discharge",
    brief:
      "70M, day 19 post hip fracture rehab. Independently ambulating with cane. All discharge criteria met. Home health referral submitted, awaiting confirmation. Family picking up Saturday AM.",
    tasksPending: ["Confirm home health referral accepted", "Finalize discharge medication list"],
  },
];

const PENDING_ITEMS: PendingItem[] = [
  {
    id: "pi-001",
    priority: "P1",
    description: "Cardiology consult response for Susan Lee — troponin trending up, needs urgent review",
    patient: "Susan Lee",
    facility: "Oakwood Manor",
    createdAt: "2:45 PM",
    assignedTo: "Dr. Maria Santos",
    status: "pending",
  },
  {
    id: "pi-002",
    priority: "P1",
    description: "CXR results pending for Eleanor Thompson — assess pneumonia progression",
    patient: "Eleanor Thompson",
    facility: "Palm Gardens",
    createdAt: "3:15 PM",
    assignedTo: "Dr. Maria Santos",
    status: "in-progress",
  },
  {
    id: "pi-003",
    priority: "P2",
    description: "Lasix dose adjustment decision for Margaret Wilson — weight gain 3.2 lbs in 48h",
    patient: "Margaret Wilson",
    facility: "Sunrise Senior Living",
    createdAt: "10:00 AM",
    assignedTo: "Dr. Ahmed Khan",
    status: "pending",
  },
  {
    id: "pi-004",
    priority: "P2",
    description: "Insulin sliding scale verification for Dorothy Martinez — AM glucose 287 mg/dL",
    patient: "Dorothy Martinez",
    facility: "Willow Creek",
    createdAt: "11:30 AM",
    assignedTo: "Dr. Ahmed Khan",
    status: "pending",
  },
  {
    id: "pi-005",
    priority: "P3",
    description: "Family callback requested — David Kim's daughter re: discharge timeline",
    patient: "David Kim",
    facility: "Palm Gardens",
    createdAt: "1:00 PM",
    assignedTo: "Dr. Ahmed Khan",
    status: "pending",
  },
  {
    id: "pi-006",
    priority: "P3",
    description: "Medication reconciliation needed — Robert Davis pre-discharge review",
    patient: "Robert Davis",
    facility: "Oakwood Manor",
    createdAt: "9:00 AM",
    assignedTo: "Dr. Lisa Chen",
    status: "in-progress",
  },
  {
    id: "pi-007",
    priority: "P4",
    description: "Home health referral confirmation — Charles Anderson discharge Saturday",
    patient: "Charles Anderson",
    facility: "Willow Creek",
    createdAt: "8:30 AM",
    assignedTo: "Dr. Lisa Chen",
    status: "pending",
  },
];

const PATIENT_VITALS: PatientVitals[] = [
  {
    id: "pv-001",
    name: "Susan Lee",
    facility: "Oakwood Manor",
    room: "305",
    lastUpdated: "12m ago",
    readings: [
      { label: "BP", value: "156/98", unit: "mmHg", trend: "up", severity: "critical", normalRange: "120/80" },
      { label: "HR", value: "96", unit: "bpm", trend: "up", severity: "warning", normalRange: "60-100" },
      { label: "SpO2", value: "90", unit: "%", trend: "down", severity: "critical", normalRange: "95-100" },
      { label: "Temp", value: "99.1", unit: "F", trend: "stable", severity: "normal", normalRange: "97.8-99.1" },
    ],
  },
  {
    id: "pv-002",
    name: "Eleanor Thompson",
    facility: "Palm Gardens",
    room: "118",
    lastUpdated: "8m ago",
    readings: [
      { label: "BP", value: "142/88", unit: "mmHg", trend: "up", severity: "warning", normalRange: "120/80" },
      { label: "HR", value: "92", unit: "bpm", trend: "up", severity: "warning", normalRange: "60-100" },
      { label: "SpO2", value: "92", unit: "%", trend: "down", severity: "critical", normalRange: "95-100" },
      { label: "Temp", value: "101.2", unit: "F", trend: "up", severity: "critical", normalRange: "97.8-99.1" },
    ],
  },
  {
    id: "pv-003",
    name: "Margaret Wilson",
    facility: "Sunrise Senior Living",
    room: "214-A",
    lastUpdated: "22m ago",
    readings: [
      { label: "BP", value: "148/92", unit: "mmHg", trend: "up", severity: "warning", normalRange: "120/80" },
      { label: "HR", value: "88", unit: "bpm", trend: "stable", severity: "normal", normalRange: "60-100" },
      { label: "SpO2", value: "93", unit: "%", trend: "down", severity: "warning", normalRange: "95-100" },
      { label: "Temp", value: "98.4", unit: "F", trend: "stable", severity: "normal", normalRange: "97.8-99.1" },
    ],
  },
  {
    id: "pv-004",
    name: "Dorothy Martinez",
    facility: "Willow Creek",
    room: "220",
    lastUpdated: "15m ago",
    readings: [
      { label: "BP", value: "152/96", unit: "mmHg", trend: "up", severity: "critical", normalRange: "120/80" },
      { label: "HR", value: "94", unit: "bpm", trend: "up", severity: "warning", normalRange: "60-100" },
      { label: "SpO2", value: "91", unit: "%", trend: "down", severity: "critical", normalRange: "95-100" },
      { label: "Temp", value: "98.9", unit: "F", trend: "stable", severity: "normal", normalRange: "97.8-99.1" },
    ],
  },
  {
    id: "pv-005",
    name: "James Brown",
    facility: "Sunrise Senior Living",
    room: "108-B",
    lastUpdated: "18m ago",
    readings: [
      { label: "BP", value: "132/78", unit: "mmHg", trend: "stable", severity: "normal", normalRange: "120/80" },
      { label: "HR", value: "76", unit: "bpm", trend: "stable", severity: "normal", normalRange: "60-100" },
      { label: "SpO2", value: "91", unit: "%", trend: "down", severity: "warning", normalRange: "95-100" },
      { label: "Temp", value: "98.8", unit: "F", trend: "stable", severity: "normal", normalRange: "97.8-99.1" },
    ],
  },
];

// --- Tab Components ---

function ActiveShiftTab() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      {/* Shift Info Card */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Shift Handoff — {SHIFT_INFO.id}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Current</p>
            <p className="text-sm font-medium text-[var(--medos-navy)]">{SHIFT_INFO.currentDoctor}</p>
            <p className="text-[10px] text-[var(--medos-gray-400)]">{SHIFT_INFO.currentShift}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Incoming</p>
            <p className="text-sm font-medium text-[var(--medos-navy)]">{SHIFT_INFO.incomingDoctor}</p>
            <p className="text-[10px] text-[var(--medos-gray-400)]">{SHIFT_INFO.incomingShift}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Time Remaining</p>
            <p className="text-lg font-bold text-[var(--medos-primary)]">{SHIFT_INFO.timeRemaining}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">Patients</p>
            <p className="text-lg font-bold text-[var(--medos-navy)]">
              {SHIFT_INFO.totalPatients}
              <span className="text-xs font-normal text-red-500 ml-1">
                ({SHIFT_INFO.criticalCount} critical)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Prioritized Patient List */}
      <div className="space-y-3">
        {SHIFT_PATIENTS.map((pt) => {
          const style = PRIORITY_STYLES[pt.priority];
          const isOpen = expanded[pt.id] ?? (pt.priority === "P1");
          return (
            <div
              key={pt.id}
              className={cn(
                "bg-white rounded-xl border shadow-medos-sm overflow-hidden",
                style.border
              )}
            >
              <button
                onClick={() => toggle(pt.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                    style.bg,
                    style.text
                  )}
                >
                  {pt.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--medos-navy)]">{pt.name}</span>
                    <span className="text-[10px] text-[var(--medos-gray-400)]">
                      {pt.facility} / Rm {pt.room}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--medos-gray-500)] truncate">{pt.reason}</p>
                </div>
                <span className="text-[10px] text-[var(--medos-gray-400)] shrink-0">
                  {pt.tasksPending.length} tasks
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-[var(--medos-gray-400)] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)] shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-4 border-t border-[var(--medos-gray-100)]">
                  <div className="pt-3 mb-3">
                    <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">
                      Clinical Brief
                    </p>
                    <p className="text-xs text-[var(--medos-gray-700)] leading-relaxed">{pt.brief}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                      Pending Tasks
                    </p>
                    <div className="space-y-1.5">
                      {pt.tasksPending.map((task, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded border border-[var(--medos-gray-300)] shrink-0 mt-0.5 flex items-center justify-center" />
                          <span className="text-xs text-[var(--medos-gray-600)]">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Handoff Summary */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Handoff Summary</h3>
          <span className="text-[9px] bg-[var(--medos-gray-100)] text-[var(--medos-gray-500)] px-2 py-0.5 rounded-full">
            Auto-generated
          </span>
        </div>
        <div className="bg-[var(--medos-gray-50)] rounded-lg p-4">
          <p className="text-xs text-[var(--medos-gray-700)] leading-relaxed">
            <strong>Night shift receiving 8 patients across 4 facilities.</strong> Two P1 patients
            require immediate attention: Susan Lee (Oakwood Manor) has rising troponin with pending
            cardiology consult, and Eleanor Thompson (Palm Gardens) has fever spike with worsening
            hypoxia on 4L NC. Two P2 patients need medication adjustments: Margaret Wilson requires
            Lasix dose discussion for fluid retention, and Dorothy Martinez needs insulin sliding scale
            verification. Family callback pending for David Kim. Two patients approaching discharge
            (Robert Davis, Charles Anderson) with routine follow-up items. Total pending tasks: 18.
            Critical items requiring action before midnight: 5.
          </p>
        </div>
      </div>
    </div>
  );
}

function PendingItemsTab() {
  const pendingCount = PENDING_ITEMS.filter((i) => i.status === "pending").length;
  const inProgressCount = PENDING_ITEMS.filter((i) => i.status === "in-progress").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            {PENDING_ITEMS.length} items require attention before shift change
          </h3>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-[var(--medos-gray-500)]">
            <strong className="text-amber-600">{pendingCount}</strong> pending
          </span>
          <span className="text-xs text-[var(--medos-gray-500)]">
            <strong className="text-blue-600">{inProgressCount}</strong> in-progress
          </span>
        </div>
      </div>

      {/* Pending Items Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <ListChecks className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Pending Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Priority", "Description", "Patient", "Facility", "Created", "Assigned To", "Status"].map(
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
              {PENDING_ITEMS.map((item) => {
                const style = PRIORITY_STYLES[item.priority];
                return (
                  <tr key={item.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          style.bg,
                          style.text
                        )}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-xs text-[var(--medos-gray-700)]">{item.description}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">{item.patient}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{item.facility}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--medos-gray-400)]" />
                        <span className="text-xs text-[var(--medos-gray-500)]">{item.createdAt}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{item.assignedTo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          item.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        )}
                      >
                        {item.status}
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

function VitalsTimelineTab() {
  const VITAL_ICONS: Record<string, typeof Heart> = {
    BP: Activity,
    HR: Heart,
    SpO2: Wind,
    Temp: Thermometer,
  };

  return (
    <div className="space-y-4">
      {PATIENT_VITALS.map((pv) => (
        <div
          key={pv.id}
          className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--medos-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{pv.name}</h3>
              <span className="text-[10px] text-[var(--medos-gray-400)]">
                {pv.facility} / Rm {pv.room}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--medos-gray-400)]" />
              <span className="text-[10px] text-[var(--medos-gray-400)]">{pv.lastUpdated}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pv.readings.map((reading) => {
              const VIcon = VITAL_ICONS[reading.label] ?? Activity;
              const TIcon = TREND_ICONS[reading.trend];
              const sev = SEVERITY_COLORS[reading.severity];
              return (
                <div
                  key={reading.label}
                  className={cn("rounded-lg p-3 border", sev.bg, "border-opacity-50")}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <VIcon className={cn("w-3 h-3", sev.text)} />
                      <span className="text-[10px] font-medium text-[var(--medos-gray-600)]">
                        {reading.label}
                      </span>
                    </div>
                    <TIcon
                      className={cn(
                        "w-3 h-3",
                        reading.trend === "up" && reading.severity !== "normal"
                          ? "text-red-500"
                          : reading.trend === "down" && reading.severity !== "normal"
                            ? "text-red-500"
                            : "text-emerald-500"
                      )}
                    />
                  </div>
                  <p className={cn("text-lg font-bold", sev.text)}>
                    {reading.value}
                    <span className="text-[9px] font-normal ml-0.5">{reading.unit}</span>
                  </p>
                  <p className="text-[9px] text-[var(--medos-gray-400)] mt-0.5">
                    Normal: {reading.normalRange}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main Export ---

export default function ShiftHandoffPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("active");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Shift Handoff</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Priority-ranked briefing — generated by Shift Summary Agent
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
      {activeTab === "active" && <ActiveShiftTab />}
      {activeTab === "pending" && <PendingItemsTab />}
      {activeTab === "vitals" && <VitalsTimelineTab />}
    </div>
  );
}
