"use client";

import { useState } from "react";
import {
  FileOutput,
  ArrowRight,
  AlertTriangle,
  Clock,
  Pill,
  Stethoscope,
  FlaskConical,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Activity,
  ShieldAlert,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "queue" | "discrepancies" | "medications";
type ReconciliationStatus = "pending" | "in-progress" | "completed" | "flagged";
type DiscrepancyType = "new-med" | "dosage-change" | "new-diagnosis" | "follow-up" | "pending-labs";
type DiscrepancySeverity = "critical" | "moderate" | "informational";
type ResolutionStatus = "open" | "acknowledged" | "resolved";

interface Discharge {
  id: string;
  patientName: string;
  age: number;
  dischargeDate: string;
  sourceHospital: string;
  sourceLocation: string;
  destinationSNF: string;
  destLocation: string;
  reason: string;
  status: ReconciliationStatus;
  discrepancyCount: number;
  aiConfidence: number;
}

interface Discrepancy {
  id: string;
  dischargeId: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  description: string;
  source: string;
  requiredAction: string;
  assignedTo: string;
  resolution: ResolutionStatus;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface MedComparison {
  dischargeId: string;
  patientName: string;
  facility: string;
  preMeds: Medication[];
  postMeds: Medication[];
  newMeds: string[];
  discontinuedMeds: string[];
  changedMeds: { name: string; oldDosage: string; newDosage: string }[];
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof FileOutput }[] = [
  { key: "queue", label: "Transition Queue", icon: Activity },
  { key: "discrepancies", label: "Discrepancy Report", icon: ShieldAlert },
  { key: "medications", label: "Med Changes", icon: Pill },
];

const STATUS_CONFIG: Record<ReconciliationStatus, { label: string; bg: string; text: string; pulse?: boolean }> = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", pulse: true },
  "in-progress": { label: "In Progress", bg: "bg-blue-50", text: "text-blue-700" },
  completed: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700" },
  flagged: { label: "Flagged", bg: "bg-red-50", text: "text-red-700" },
};

const DISCREPANCY_TYPE_CONFIG: Record<DiscrepancyType, { label: string; icon: typeof Pill; color: string }> = {
  "new-med": { label: "New Medication", icon: Plus, color: "text-red-600" },
  "dosage-change": { label: "Dosage Change", icon: RefreshCw, color: "text-red-600" },
  "new-diagnosis": { label: "New Diagnosis", icon: Stethoscope, color: "text-amber-600" },
  "follow-up": { label: "Follow-up Required", icon: CalendarCheck, color: "text-blue-600" },
  "pending-labs": { label: "Pending Labs", icon: FlaskConical, color: "text-amber-600" },
};

const SEVERITY_CONFIG: Record<DiscrepancySeverity, { bg: string; border: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-200" },
  moderate: { bg: "bg-amber-50", border: "border-amber-200" },
  informational: { bg: "bg-blue-50", border: "border-blue-200" },
};

// --- Mock Data ---

const DISCHARGES: Discharge[] = [
  {
    id: "dc-001",
    patientName: "Margaret Wilson",
    age: 78,
    dischargeDate: "2026-02-27",
    sourceHospital: "Ascension Genesys",
    sourceLocation: "Grand Blanc, MI",
    destinationSNF: "Sunrise Senior Living",
    destLocation: "Troy, MI",
    reason: "CHF Exacerbation",
    status: "flagged",
    discrepancyCount: 4,
    aiConfidence: 0.82,
  },
  {
    id: "dc-002",
    patientName: "James Brown",
    age: 84,
    dischargeDate: "2026-02-28",
    sourceHospital: "Beaumont Hospital",
    sourceLocation: "Royal Oak, MI",
    destinationSNF: "Oakwood Manor",
    destLocation: "Dearborn, MI",
    reason: "Pneumonia",
    status: "in-progress",
    discrepancyCount: 3,
    aiConfidence: 0.91,
  },
  {
    id: "dc-003",
    patientName: "Eleanor Thompson",
    age: 71,
    dischargeDate: "2026-02-28",
    sourceHospital: "Cleveland Clinic Florida",
    sourceLocation: "Weston, FL",
    destinationSNF: "Palm Gardens",
    destLocation: "Boca Raton, FL",
    reason: "Hip Fracture",
    status: "completed",
    discrepancyCount: 2,
    aiConfidence: 0.96,
  },
  {
    id: "dc-004",
    patientName: "Robert Davis",
    age: 89,
    dischargeDate: "2026-03-01",
    sourceHospital: "Baptist Health",
    sourceLocation: "Jacksonville, FL",
    destinationSNF: "Willow Creek",
    destLocation: "Jacksonville, FL",
    reason: "UTI / Sepsis",
    status: "pending",
    discrepancyCount: 5,
    aiConfidence: 0.84,
  },
  {
    id: "dc-005",
    patientName: "Susan Lee",
    age: 82,
    dischargeDate: "2026-03-01",
    sourceHospital: "Ascension Genesys",
    sourceLocation: "Grand Blanc, MI",
    destinationSNF: "Sunrise Senior Living",
    destLocation: "Troy, MI",
    reason: "COPD Flare",
    status: "pending",
    discrepancyCount: 3,
    aiConfidence: 0.88,
  },
  {
    id: "dc-006",
    patientName: "Charles Anderson",
    age: 76,
    dischargeDate: "2026-02-26",
    sourceHospital: "Beaumont Hospital",
    sourceLocation: "Royal Oak, MI",
    destinationSNF: "Oakwood Manor",
    destLocation: "Dearborn, MI",
    reason: "Fall with Head Injury",
    status: "completed",
    discrepancyCount: 2,
    aiConfidence: 0.93,
  },
];

const DISCREPANCIES: Discrepancy[] = [
  // dc-001: Margaret Wilson (CHF) - 4 discrepancies
  { id: "disc-001", dischargeId: "dc-001", type: "new-med", severity: "critical", description: "Furosemide 40mg BID added at hospital — not in ChartEasy SNF medication list", source: "Ascension Genesys Discharge Summary", requiredAction: "Reconcile with SNF pharmacy; update ChartEasy med list", assignedTo: "Dr. Ahmed Khan", resolution: "open" },
  { id: "disc-002", dischargeId: "dc-001", type: "dosage-change", severity: "critical", description: "Metoprolol changed from 25mg daily to 50mg BID during hospitalization", source: "Hospital Medication Reconciliation Form", requiredAction: "Verify dose with cardiologist; update standing orders", assignedTo: "NP Lisa Thompson", resolution: "acknowledged" },
  { id: "disc-003", dischargeId: "dc-001", type: "new-diagnosis", severity: "moderate", description: "New dx: Acute Kidney Injury Stage 2 (Cr 2.4, baseline 1.1)", source: "Hospital Discharge ICD-10 codes", requiredAction: "Add AKI to problem list; monitor Cr q48h; nephro follow-up", assignedTo: "Dr. Ahmed Khan", resolution: "open" },
  { id: "disc-004", dischargeId: "dc-001", type: "follow-up", severity: "informational", description: "Cardiology follow-up within 7 days — not yet scheduled in ChartEasy", source: "Discharge Instructions", requiredAction: "Schedule telemedicine cardiology visit via ChatEasy", assignedTo: "Care Coordinator", resolution: "open" },
  // dc-002: James Brown (Pneumonia) - 3 discrepancies
  { id: "disc-005", dischargeId: "dc-002", type: "new-med", severity: "critical", description: "Levofloxacin 750mg daily x 5 days added — antibiotic not in pre-admission meds", source: "Beaumont Discharge Pharmacy Summary", requiredAction: "Confirm remaining course days; add to SNF MAR", assignedTo: "NP Lisa Thompson", resolution: "resolved" },
  { id: "disc-006", dischargeId: "dc-002", type: "pending-labs", severity: "moderate", description: "Blood culture drawn at discharge — results expected within 48 hours", source: "Lab Orders at Discharge", requiredAction: "Follow up with Beaumont lab for final culture results", assignedTo: "Dr. Ahmed Khan", resolution: "open" },
  { id: "disc-007", dischargeId: "dc-002", type: "follow-up", severity: "informational", description: "Chest X-ray follow-up in 4 weeks to confirm pneumonia resolution", source: "Radiology Recommendations", requiredAction: "Schedule portable CXR at Oakwood Manor", assignedTo: "Care Coordinator", resolution: "open" },
  // dc-003: Eleanor Thompson (Hip Fracture) - 2 discrepancies
  { id: "disc-008", dischargeId: "dc-003", type: "new-med", severity: "critical", description: "Enoxaparin 40mg SC daily added for DVT prophylaxis post-ORIF", source: "Cleveland Clinic Surgical Discharge", requiredAction: "Add to MAR; monitor for bleeding; PT/INR baseline", assignedTo: "Dr. Rachel Green", resolution: "resolved" },
  { id: "disc-009", dischargeId: "dc-003", type: "follow-up", severity: "informational", description: "Orthopedic surgeon follow-up at 2 weeks; weight bearing as tolerated", source: "Surgical Follow-Up Plan", requiredAction: "Schedule ortho telemedicine; update PT plan with WBAT", assignedTo: "Care Coordinator", resolution: "resolved" },
  // dc-004: Robert Davis (UTI/Sepsis) - 5 discrepancies
  { id: "disc-010", dischargeId: "dc-004", type: "new-med", severity: "critical", description: "Meropenem 1g IV q8h for 10 more days — ESBL E.coli UTI", source: "Baptist Health ID Consult Note", requiredAction: "Coordinate IV antibiotic administration at SNF; PICC line care", assignedTo: "Dr. James Wilson", resolution: "open" },
  { id: "disc-011", dischargeId: "dc-004", type: "dosage-change", severity: "critical", description: "Lisinopril held during sepsis — unclear if restart at SNF", source: "Hospital Medication Changes", requiredAction: "Contact hospitalist for restart criteria; monitor BP", assignedTo: "NP Carlos Rivera", resolution: "open" },
  { id: "disc-012", dischargeId: "dc-004", type: "new-diagnosis", severity: "moderate", description: "New dx: ESBL-producing E.coli bacteremia — contact precautions required", source: "Microbiology Final Report", requiredAction: "Implement contact isolation; notify infection control", assignedTo: "Dr. James Wilson", resolution: "open" },
  { id: "disc-013", dischargeId: "dc-004", type: "pending-labs", severity: "moderate", description: "Repeat blood cultures at 48h post-antibiotics — clearance pending", source: "ID Consult Recommendations", requiredAction: "Draw repeat cultures Day 3; send to Baptist Health lab", assignedTo: "NP Carlos Rivera", resolution: "open" },
  { id: "disc-014", dischargeId: "dc-004", type: "follow-up", severity: "informational", description: "Infectious disease telemedicine follow-up in 5 days", source: "ID Consult Discharge Plan", requiredAction: "Schedule ID telemedicine via ChatEasy", assignedTo: "Care Coordinator", resolution: "open" },
  // dc-005: Susan Lee (COPD) - 3 discrepancies
  { id: "disc-015", dischargeId: "dc-005", type: "dosage-change", severity: "critical", description: "Prednisone taper: 40mg x 3d, 20mg x 3d, 10mg x 3d — different from prior 5mg daily", source: "Ascension Pulmonology Discharge", requiredAction: "Update medication schedule in ChartEasy; monitor blood glucose", assignedTo: "Dr. Ahmed Khan", resolution: "open" },
  { id: "disc-016", dischargeId: "dc-005", type: "new-med", severity: "critical", description: "Tiotropium 18mcg inhaler added; was not on any long-acting bronchodilator before", source: "Discharge Medication List", requiredAction: "Add to MAR; ensure inhaler technique education", assignedTo: "NP Lisa Thompson", resolution: "open" },
  { id: "disc-017", dischargeId: "dc-005", type: "new-diagnosis", severity: "moderate", description: "Pulmonary function updated: FEV1 38% predicted (GOLD Stage III)", source: "Inpatient PFT Results", requiredAction: "Update COPD severity classification in problem list", assignedTo: "Dr. Ahmed Khan", resolution: "open" },
  // dc-006: Charles Anderson (Fall) - 2 discrepancies
  { id: "disc-018", dischargeId: "dc-006", type: "new-med", severity: "critical", description: "Levetiracetam 500mg BID started for post-traumatic seizure prophylaxis", source: "Beaumont Neurology Consult", requiredAction: "Add to MAR; monitor for sedation; neuro follow-up at 30 days", assignedTo: "Dr. Ahmed Khan", resolution: "resolved" },
  { id: "disc-019", dischargeId: "dc-006", type: "follow-up", severity: "informational", description: "Repeat CT head in 1 week to rule out delayed subdural hematoma", source: "Neurosurgery Discharge Instructions", requiredAction: "Arrange transport for outpatient CT; neuro precautions", assignedTo: "Care Coordinator", resolution: "resolved" },
];

const MED_COMPARISONS: MedComparison[] = [
  {
    dischargeId: "dc-001", patientName: "Margaret Wilson", facility: "Ascension Genesys -> Sunrise Senior Living",
    preMeds: [
      { name: "Metoprolol", dosage: "25mg", frequency: "Daily" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Daily" },
      { name: "Atorvastatin", dosage: "40mg", frequency: "QHS" },
      { name: "Aspirin", dosage: "81mg", frequency: "Daily" },
      { name: "Amlodipine", dosage: "5mg", frequency: "Daily" },
    ],
    postMeds: [
      { name: "Metoprolol", dosage: "50mg", frequency: "BID" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Daily" },
      { name: "Atorvastatin", dosage: "40mg", frequency: "QHS" },
      { name: "Aspirin", dosage: "81mg", frequency: "Daily" },
      { name: "Amlodipine", dosage: "5mg", frequency: "Daily" },
      { name: "Furosemide", dosage: "40mg", frequency: "BID" },
      { name: "Potassium Chloride", dosage: "20mEq", frequency: "Daily" },
    ],
    newMeds: ["Furosemide 40mg BID", "Potassium Chloride 20mEq Daily"],
    discontinuedMeds: [],
    changedMeds: [{ name: "Metoprolol", oldDosage: "25mg Daily", newDosage: "50mg BID" }],
  },
  {
    dischargeId: "dc-002", patientName: "James Brown", facility: "Beaumont Hospital -> Oakwood Manor",
    preMeds: [
      { name: "Albuterol Inhaler", dosage: "2 puffs", frequency: "Q4h PRN" },
      { name: "Metformin", dosage: "500mg", frequency: "BID" },
      { name: "Omeprazole", dosage: "20mg", frequency: "Daily" },
    ],
    postMeds: [
      { name: "Albuterol Inhaler", dosage: "2 puffs", frequency: "Q4h PRN" },
      { name: "Metformin", dosage: "500mg", frequency: "BID" },
      { name: "Omeprazole", dosage: "20mg", frequency: "Daily" },
      { name: "Levofloxacin", dosage: "750mg", frequency: "Daily x 5d" },
      { name: "Guaifenesin", dosage: "600mg", frequency: "BID" },
    ],
    newMeds: ["Levofloxacin 750mg Daily x 5d", "Guaifenesin 600mg BID"],
    discontinuedMeds: [],
    changedMeds: [],
  },
  {
    dischargeId: "dc-004", patientName: "Robert Davis", facility: "Baptist Health -> Willow Creek",
    preMeds: [
      { name: "Lisinopril", dosage: "20mg", frequency: "Daily" },
      { name: "Metoprolol", dosage: "50mg", frequency: "BID" },
      { name: "Warfarin", dosage: "5mg", frequency: "QHS" },
      { name: "Furosemide", dosage: "20mg", frequency: "Daily" },
      { name: "Gabapentin", dosage: "300mg", frequency: "TID" },
    ],
    postMeds: [
      { name: "Metoprolol", dosage: "50mg", frequency: "BID" },
      { name: "Warfarin", dosage: "5mg", frequency: "QHS" },
      { name: "Furosemide", dosage: "20mg", frequency: "Daily" },
      { name: "Gabapentin", dosage: "300mg", frequency: "TID" },
      { name: "Meropenem", dosage: "1g IV", frequency: "Q8h x 10d" },
    ],
    newMeds: ["Meropenem 1g IV Q8h x 10d"],
    discontinuedMeds: ["Lisinopril 20mg Daily (held during sepsis)"],
    changedMeds: [],
  },
  {
    dischargeId: "dc-005", patientName: "Susan Lee", facility: "Ascension Genesys -> Sunrise Senior Living",
    preMeds: [
      { name: "Prednisone", dosage: "5mg", frequency: "Daily" },
      { name: "Albuterol Inhaler", dosage: "2 puffs", frequency: "Q4h PRN" },
      { name: "Fluticasone", dosage: "250mcg", frequency: "BID" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Daily" },
    ],
    postMeds: [
      { name: "Prednisone", dosage: "40mg taper", frequency: "See schedule" },
      { name: "Albuterol Inhaler", dosage: "2 puffs", frequency: "Q4h PRN" },
      { name: "Fluticasone", dosage: "250mcg", frequency: "BID" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Daily" },
      { name: "Tiotropium", dosage: "18mcg", frequency: "Daily" },
    ],
    newMeds: ["Tiotropium 18mcg Daily"],
    discontinuedMeds: [],
    changedMeds: [{ name: "Prednisone", oldDosage: "5mg Daily", newDosage: "40mg taper (40/20/10 x 3d each)" }],
  },
];

// --- Tab Components ---

function TransitionQueueTab() {
  const totalTransitions = DISCHARGES.length;
  const pendingReview = DISCHARGES.filter((d) => d.status === "pending" || d.status === "flagged").length;
  const avgDiscrepancies = (DISCHARGES.reduce((s, d) => s + d.discrepancyCount, 0) / DISCHARGES.length).toFixed(1);
  const avgReconciliationTime = "4.2h";

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Transitions This Week", value: totalTransitions.toString(), color: "text-[var(--medos-primary)]" },
          { label: "Pending Review", value: pendingReview.toString(), color: "text-amber-600" },
          { label: "Avg Discrepancies", value: avgDiscrepancies, color: "text-red-600" },
          { label: "Avg Reconciliation Time", value: avgReconciliationTime, color: "text-blue-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Discharge Queue Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Recent Discharges ({DISCHARGES.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Patient", "Age", "Source Hospital", "Dest. SNF", "Date", "Reason", "Status", "Discrepancies", "AI Confidence", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {DISCHARGES.map((dc) => {
                const statusCfg = STATUS_CONFIG[dc.status];
                return (
                  <tr key={dc.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">{dc.patientName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{dc.age}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-xs text-[var(--medos-gray-700)]">{dc.sourceHospital}</span>
                        <p className="text-[10px] text-[var(--medos-gray-400)]">{dc.sourceLocation}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-xs text-[var(--medos-gray-700)]">{dc.destinationSNF}</span>
                        <p className="text-[10px] text-[var(--medos-gray-400)]">{dc.destLocation}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-500)]">{dc.dischargeDate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{dc.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                        statusCfg.bg, statusCfg.text
                      )}>
                        {statusCfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        dc.discrepancyCount >= 4 ? "bg-red-50 text-red-700" : dc.discrepancyCount >= 3 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {dc.discrepancyCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        dc.aiConfidence >= 0.90 ? "bg-emerald-50 text-emerald-700" : dc.aiConfidence >= 0.85 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                      )}>
                        {(dc.aiConfidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-[10px] font-medium text-[var(--medos-primary)] hover:underline">Review</button>
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

function DiscrepancyReportTab() {
  const [expandedPatient, setExpandedPatient] = useState<string | null>("dc-001");

  const groupedByPatient = DISCHARGES.map((dc) => ({
    discharge: dc,
    discrepancies: DISCREPANCIES.filter((d) => d.dischargeId === dc.id),
  })).filter((g) => g.discrepancies.length > 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Discrepancies", value: DISCREPANCIES.length.toString(), color: "text-[var(--medos-primary)]" },
          { label: "Critical", value: DISCREPANCIES.filter((d) => d.severity === "critical").length.toString(), color: "text-red-600" },
          { label: "Open", value: DISCREPANCIES.filter((d) => d.resolution === "open").length.toString(), color: "text-amber-600" },
          { label: "Resolved", value: DISCREPANCIES.filter((d) => d.resolution === "resolved").length.toString(), color: "text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Expandable Patient Sections */}
      {groupedByPatient.map(({ discharge, discrepancies }) => {
        const isExpanded = expandedPatient === discharge.id;
        return (
          <div key={discharge.id} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
            <button
              onClick={() => setExpandedPatient(isExpanded ? null : discharge.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--medos-gray-50)] transition-default"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />
                )}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--medos-navy)]">{discharge.patientName}</span>
                    <span className="text-[10px] text-[var(--medos-gray-400)]">Age {discharge.age}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[var(--medos-gray-500)]">{discharge.sourceHospital}</span>
                    <ArrowRight className="w-3 h-3 text-[var(--medos-gray-400)]" />
                    <span className="text-[10px] text-[var(--medos-gray-500)]">{discharge.destinationSNF}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  STATUS_CONFIG[discharge.status].bg, STATUS_CONFIG[discharge.status].text
                )}>
                  {STATUS_CONFIG[discharge.status].label}
                </span>
                <span className="text-[10px] font-semibold text-[var(--medos-gray-600)] bg-[var(--medos-gray-100)] px-2 py-0.5 rounded-full">
                  {discrepancies.length} issues
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="px-6 pb-6 space-y-3 border-t border-[var(--medos-gray-100)] pt-4">
                {discrepancies.map((disc) => {
                  const typeCfg = DISCREPANCY_TYPE_CONFIG[disc.type];
                  const sevCfg = SEVERITY_CONFIG[disc.severity];
                  const TypeIcon = typeCfg.icon;
                  return (
                    <div key={disc.id} className={cn("rounded-lg border p-4", sevCfg.bg, sevCfg.border)}>
                      <div className="flex items-start gap-3">
                        <TypeIcon className={cn("w-4 h-4 mt-0.5 shrink-0", typeCfg.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", typeCfg.color)}>
                              {typeCfg.label}
                            </span>
                            <span className={cn(
                              "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                              disc.severity === "critical" ? "bg-red-100 text-red-700" : disc.severity === "moderate" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {disc.severity}
                            </span>
                            <span className={cn(
                              "text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-auto",
                              disc.resolution === "resolved" ? "bg-emerald-100 text-emerald-700" : disc.resolution === "acknowledged" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                            )}>
                              {disc.resolution}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--medos-navy)] mb-2">{disc.description}</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
                            <div>
                              <span className="text-[var(--medos-gray-400)] uppercase tracking-wider">Source:</span>
                              <p className="text-[var(--medos-gray-600)] mt-0.5">{disc.source}</p>
                            </div>
                            <div>
                              <span className="text-[var(--medos-gray-400)] uppercase tracking-wider">Action:</span>
                              <p className="text-[var(--medos-gray-600)] mt-0.5">{disc.requiredAction}</p>
                            </div>
                            <div>
                              <span className="text-[var(--medos-gray-400)] uppercase tracking-wider">Assigned:</span>
                              <p className="text-[var(--medos-gray-600)] mt-0.5">{disc.assignedTo}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MedChangesTab() {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "New Medications Added", value: MED_COMPARISONS.reduce((s, m) => s + m.newMeds.length, 0).toString(), color: "text-emerald-600", icon: Plus },
          { label: "Medications Discontinued", value: MED_COMPARISONS.reduce((s, m) => s + m.discontinuedMeds.length, 0).toString(), color: "text-red-600", icon: Minus },
          { label: "Dosage Changes", value: MED_COMPARISONS.reduce((s, m) => s + m.changedMeds.length, 0).toString(), color: "text-amber-600", icon: RefreshCw },
        ].map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <KpiIcon className={cn("w-4 h-4", kpi.color)} />
                <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Per-Patient Med Comparisons */}
      {MED_COMPARISONS.map((comp) => (
        <div key={comp.dischargeId} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--medos-gray-100)]">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[var(--medos-primary)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{comp.patientName}</h3>
                <p className="text-[10px] text-[var(--medos-gray-400)]">{comp.facility}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {comp.newMeds.length > 0 && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{comp.newMeds.length} new</span>
              )}
              {comp.discontinuedMeds.length > 0 && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">{comp.discontinuedMeds.length} discontinued</span>
              )}
              {comp.changedMeds.length > 0 && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{comp.changedMeds.length} changed</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--medos-gray-100)]">
            {/* Pre-Hospitalization */}
            <div className="p-4">
              <h4 className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-3">
                Pre-Hospitalization (ChartEasy)
              </h4>
              <div className="space-y-2">
                {comp.preMeds.map((med) => {
                  const isDiscontinued = comp.discontinuedMeds.some((dm) => dm.startsWith(med.name));
                  const isChanged = comp.changedMeds.some((cm) => cm.name === med.name);
                  return (
                    <div key={med.name} className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs",
                      isDiscontinued ? "bg-red-50 line-through text-red-600" : isChanged ? "bg-amber-50 text-amber-700" : "bg-[var(--medos-gray-50)] text-[var(--medos-gray-700)]"
                    )}>
                      <span className="font-medium">{med.name}</span>
                      <span className="text-[10px]">{med.dosage} {med.frequency}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Post-Discharge */}
            <div className="p-4">
              <h4 className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-3">
                Post-Discharge
              </h4>
              <div className="space-y-2">
                {comp.postMeds.map((med) => {
                  const isNew = comp.newMeds.some((nm) => nm.startsWith(med.name));
                  const isChanged = comp.changedMeds.some((cm) => cm.name === med.name);
                  return (
                    <div key={med.name} className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs",
                      isNew ? "bg-emerald-50 text-emerald-700 font-medium" : isChanged ? "bg-amber-50 text-amber-700" : "bg-[var(--medos-gray-50)] text-[var(--medos-gray-700)]"
                    )}>
                      <div className="flex items-center gap-1.5">
                        {isNew && <Plus className="w-3 h-3" />}
                        {isChanged && <RefreshCw className="w-3 h-3" />}
                        <span className="font-medium">{med.name}</span>
                      </div>
                      <span className="text-[10px]">{med.dosage} {med.frequency}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Change Summary */}
          {(comp.changedMeds.length > 0 || comp.discontinuedMeds.length > 0) && (
            <div className="px-6 py-3 bg-[var(--medos-gray-50)] border-t border-[var(--medos-gray-100)]">
              <p className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">Change Details</p>
              <div className="space-y-1">
                {comp.changedMeds.map((cm) => (
                  <div key={cm.name} className="flex items-center gap-2 text-[10px]">
                    <RefreshCw className="w-3 h-3 text-amber-500" />
                    <span className="text-[var(--medos-gray-600)]">
                      <strong>{cm.name}</strong>: {cm.oldDosage} <ArrowRight className="w-3 h-3 inline" /> {cm.newDosage}
                    </span>
                  </div>
                ))}
                {comp.discontinuedMeds.map((dm) => (
                  <div key={dm} className="flex items-center gap-2 text-[10px]">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span className="text-[var(--medos-gray-600)]"><strong>Discontinued:</strong> {dm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Main Export ---

export default function DischargeReconciliationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("queue");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <FileOutput className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Discharge Reconciliation</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Hospital-SNF semantic data bridge — solving the transition gap
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
      {activeTab === "queue" && <TransitionQueueTab />}
      {activeTab === "discrepancies" && <DiscrepancyReportTab />}
      {activeTab === "medications" && <MedChangesTab />}
    </div>
  );
}
