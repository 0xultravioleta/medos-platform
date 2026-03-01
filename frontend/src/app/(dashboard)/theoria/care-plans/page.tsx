"use client";

import { useState } from "react";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  BookOpen,
  FileCheck,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Shield,
  Lightbulb,
  AlertTriangle,
  MessageSquare,
  User,
  Building2,
  Activity,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "recommendations" | "evidence" | "approval";
type ApprovalStatus = "pending" | "approved" | "modified" | "rejected";
type EvidenceLevel = "A" | "B" | "C";

interface CareRecommendation {
  id: string;
  patientName: string;
  facility: string;
  primaryDx: string;
  currentPlanSummary: string;
  recommendations: string[];
  evidenceCitations: EvidenceCitation[];
  confidence: number;
  model: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  modificationNotes?: string;
}

interface EvidenceCitation {
  id: string;
  recommendationId: string;
  source: string;
  guidelineOrg: string;
  evidenceLevel: EvidenceLevel;
  keyFindings: string;
  year: number;
}

interface ApprovalAction {
  id: string;
  recommendationId: string;
  patientName: string;
  recommendationSummary: string;
  reviewer: string;
  action: ApprovalStatus;
  timestamp: string;
  notes: string;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof Brain }[] = [
  { key: "recommendations", label: "AI Recommendations", icon: Lightbulb },
  { key: "evidence", label: "Evidence Citations", icon: BookOpen },
  { key: "approval", label: "Approval Flow", icon: FileCheck },
];

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending Review", bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  approved: { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  modified: { label: "Modified", bg: "bg-blue-50", text: "text-blue-700", icon: Edit3 },
  rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-700", icon: XCircle },
};

const EVIDENCE_LEVEL_CONFIG: Record<EvidenceLevel, { label: string; bg: string; text: string }> = {
  A: { label: "Level A — Strong", bg: "bg-emerald-50", text: "text-emerald-700" },
  B: { label: "Level B — Moderate", bg: "bg-blue-50", text: "text-blue-700" },
  C: { label: "Level C — Consensus", bg: "bg-amber-50", text: "text-amber-700" },
};

// --- Mock Data ---

const RECOMMENDATIONS: CareRecommendation[] = [
  {
    id: "rec-001",
    patientName: "Margaret Wilson",
    facility: "Sunrise Senior Living (Troy, MI)",
    primaryDx: "CHF (Congestive Heart Failure)",
    currentPlanSummary: "Daily weight monitoring, sodium restriction 2g/day, Lisinopril 10mg daily, Metoprolol 25mg daily. Cardiology follow-up quarterly. No current diuretic therapy.",
    recommendations: [
      "Administer Furosemide 40mg IV Push stat — weight up 4 lbs in 48h + nocturnal O2 desaturation to 88% detected by Oura Ring indicates fluid overload",
      "Schedule stat telemedicine cardiology check-in via ChatEasy within 24 hours for diuretic titration plan",
      "Initiate daily weight protocol with morning standing weight + 2pm recheck; alert threshold: >2 lbs/day or >5 lbs/week",
      "Escalate Metoprolol from 25mg daily to 50mg BID per ACC/AHA Stage C heart failure guidelines",
      "Order BMP + BNP labs stat to assess renal function and volume status before aggressive diuresis",
    ],
    evidenceCitations: [
      { id: "ev-001", recommendationId: "rec-001", source: "2022 AHA/ACC/HFSA Guideline for Management of Heart Failure", guidelineOrg: "AHA/ACC", evidenceLevel: "A", keyFindings: "Loop diuretics recommended for volume management in Stage C HFrEF; daily weight monitoring is Class I recommendation for all HF patients", year: 2022 },
      { id: "ev-002", recommendationId: "rec-001", source: "Wearable Devices for Remote Monitoring of Heart Failure: JAMA Cardiology 2024;9(4):412-420", guidelineOrg: "JAMA", evidenceLevel: "B", keyFindings: "Nocturnal oxygen desaturation detected by consumer wearables correlates with 85% PPV for CHF decompensation within 72 hours", year: 2024 },
      { id: "ev-003", recommendationId: "rec-001", source: "CMS Quality Measure NQF #0229: Heart Failure Readmission Rate", guidelineOrg: "CMS", evidenceLevel: "A", keyFindings: "Weight monitoring + early diuretic intervention reduces 30-day HF readmission by 23%", year: 2023 },
    ],
    confidence: 0.94,
    model: "Claude + MedOS Clinical RAG",
    status: "pending",
  },
  {
    id: "rec-002",
    patientName: "David Kim",
    facility: "Palm Gardens (Boca Raton, FL)",
    primaryDx: "Diabetes Type 2 (Uncontrolled)",
    currentPlanSummary: "Metformin 1000mg BID, Glipizide 10mg daily. HbA1c 8.2 three months ago. Diet-controlled approach with regular meals. No GLP-1 RA therapy.",
    recommendations: [
      "Add Semaglutide (Ozempic) 0.25mg SC weekly — HbA1c trending 8.2 to 8.9 over 3 months despite maximal metformin + sulfonylurea",
      "Refer to certified diabetes educator via ChatEasy for CGM data review and carb counting education",
      "Adjust meal plan: RPM Dexcom G7 data shows consistent glucose spikes 180-250 mg/dL post-dinner — recommend protein-first eating strategy",
      "Schedule monthly telemedicine endocrinology follow-up for GLP-1 dose titration (0.25 -> 0.5 -> 1.0mg over 8 weeks)",
    ],
    evidenceCitations: [
      { id: "ev-004", recommendationId: "rec-002", source: "ADA Standards of Care in Diabetes — 2025 (Section 9: Pharmacologic Approaches to Glycemic Treatment)", guidelineOrg: "ADA", evidenceLevel: "A", keyFindings: "GLP-1 RA recommended as first injectable for T2DM when HbA1c above target despite dual oral therapy; cardiovascular benefit demonstrated in SUSTAIN-6", year: 2025 },
      { id: "ev-005", recommendationId: "rec-002", source: "CGM in Older Adults with T2DM: Diabetes Care 2024;47(8):1450-1458", guidelineOrg: "ADA", evidenceLevel: "B", keyFindings: "CGM-guided therapy adjustments reduced HbA1c by average 0.8% in SNF populations; post-meal pattern identification most actionable insight", year: 2024 },
    ],
    confidence: 0.91,
    model: "Claude + MedOS Clinical RAG",
    status: "approved",
    reviewedBy: "Dr. Ahmed Khan",
    reviewedAt: "2026-02-28 14:30",
  },
  {
    id: "rec-003",
    patientName: "Patricia Moore",
    facility: "Willow Creek (Jacksonville, FL)",
    primaryDx: "COPD with Oxygen Dependence",
    currentPlanSummary: "O2 2L/min continuous via nasal cannula. Albuterol PRN. No long-acting bronchodilator. Pulmonary rehab 3x/week. Current FEV1 42% predicted.",
    recommendations: [
      "Initiate Tiotropium/Olodaterol (Stiolto Respimat) 2.5/2.5mcg daily — patient on no LAMA/LABA despite GOLD Stage III classification",
      "Add Roflumilast 500mcg daily for exacerbation prevention — history of 2 exacerbations in past 12 months",
      "Optimize pulmonary rehab: increase to 5x/week with added upper extremity training per ACCP guidelines",
    ],
    evidenceCitations: [
      { id: "ev-006", recommendationId: "rec-003", source: "GOLD 2025 Global Strategy for Diagnosis, Management, and Prevention of COPD", guidelineOrg: "GOLD", evidenceLevel: "A", keyFindings: "LAMA/LABA combination is first-line for Group E COPD (history of exacerbations); PDE4 inhibitor add-on reduces exacerbation frequency by 17%", year: 2025 },
      { id: "ev-007", recommendationId: "rec-003", source: "Pulmonary Rehabilitation in Post-Acute Care: CHEST 2024;165(2):389-401", guidelineOrg: "ACCP", evidenceLevel: "B", keyFindings: "Increasing rehab frequency from 3x to 5x/week in SNF patients improved 6MWD by 45 meters and reduced 90-day readmission by 31%", year: 2024 },
    ],
    confidence: 0.89,
    model: "Claude + MedOS Clinical RAG",
    status: "modified",
    reviewedBy: "Dr. James Wilson",
    reviewedAt: "2026-02-27 09:15",
    modificationNotes: "Approved LAMA/LABA but deferred Roflumilast — patient has hepatic impairment. Substituted Azithromycin 250mg MWF for exacerbation prevention.",
  },
  {
    id: "rec-004",
    patientName: "Dorothy Martinez",
    facility: "Willow Creek (Jacksonville, FL)",
    primaryDx: "CHF (Decompensated)",
    currentPlanSummary: "Carvedilol 25mg BID, Lisinopril 20mg daily, Spironolactone 25mg daily. Recent EF 30%. On telemonitoring. Daily weight checks.",
    recommendations: [
      "Add Sacubitril/Valsartan (Entresto) 24/26mg BID — replace Lisinopril after 36h washout; PARADIGM-HF shows 20% mortality reduction vs ACEi in HFrEF",
      "Initiate SGLT2 inhibitor (Dapagliflozin 10mg daily) — DAPA-HF trial demonstrates benefit regardless of diabetic status",
      "Schedule cardiac resynchronization therapy (CRT) evaluation — EF 30% with LBBB on recent ECG meets Class I indication",
      "Implement RPM protocol: twice-daily weight, continuous HR/SpO2 via Apple Watch, weekly BNP trending",
    ],
    evidenceCitations: [
      { id: "ev-008", recommendationId: "rec-004", source: "PARADIGM-HF: Sacubitril/Valsartan vs Enalapril in Heart Failure. NEJM 2014;371:993-1004", guidelineOrg: "NEJM", evidenceLevel: "A", keyFindings: "Sacubitril/Valsartan reduced cardiovascular death or HF hospitalization by 20% compared to enalapril in chronic HFrEF", year: 2014 },
      { id: "ev-009", recommendationId: "rec-004", source: "DAPA-HF: Dapagliflozin in Heart Failure with Reduced EF. NEJM 2019;381:1995-2008", guidelineOrg: "NEJM", evidenceLevel: "A", keyFindings: "SGLT2 inhibition reduced worsening HF or CV death by 26% in HFrEF patients regardless of diabetes status", year: 2019 },
      { id: "ev-010", recommendationId: "rec-004", source: "2022 AHA/ACC/HFSA Guideline: CRT Recommendations", guidelineOrg: "AHA/ACC", evidenceLevel: "A", keyFindings: "CRT is Class I recommendation for HFrEF with EF <=35%, LBBB, QRS >=150ms, and NYHA Class II-IV symptoms", year: 2022 },
    ],
    confidence: 0.96,
    model: "Claude + MedOS Clinical RAG",
    status: "pending",
  },
  {
    id: "rec-005",
    patientName: "Susan Lee",
    facility: "Sunrise Senior Living (Troy, MI)",
    primaryDx: "CHF with Acute Kidney Injury",
    currentPlanSummary: "Amlodipine 5mg daily, Metoprolol 50mg BID (newly increased). Recently hospitalized for CHF exacerbation with AKI Stage 2. Cr 2.4 (baseline 1.1).",
    recommendations: [
      "Hold ACEi/ARB until Cr improves below 2.0 — cardiorenal syndrome risk; recheck BMP in 48 hours",
      "Initiate low-dose Furosemide 20mg daily PO (not IV) — gentle diuresis while monitoring renal function",
      "Request nephrology telemedicine consult via ChatEasy for cardiorenal syndrome management plan",
    ],
    evidenceCitations: [
      { id: "ev-011", recommendationId: "rec-005", source: "KDIGO 2024 Clinical Practice Guideline for AKI in Heart Failure", guidelineOrg: "KDIGO", evidenceLevel: "B", keyFindings: "In cardiorenal syndrome, cautious diuresis preferred over aggressive volume removal; ACEi/ARB should be held when Cr rises >50% above baseline", year: 2024 },
      { id: "ev-012", recommendationId: "rec-005", source: "Cardiorenal Syndrome in the Post-Acute Setting: J Am Geriatr Soc 2024;72(6):1234-1245", guidelineOrg: "AGS", evidenceLevel: "B", keyFindings: "Early nephrology co-management in SNF patients with cardiorenal syndrome reduced 30-day hospital readmission by 34%", year: 2024 },
    ],
    confidence: 0.87,
    model: "Claude + MedOS Clinical RAG",
    status: "approved",
    reviewedBy: "Dr. Sarah Martinez",
    reviewedAt: "2026-02-28 11:00",
  },
  {
    id: "rec-006",
    patientName: "Robert Davis",
    facility: "Willow Creek (Jacksonville, FL)",
    primaryDx: "UTI / Sepsis (ESBL E.coli)",
    currentPlanSummary: "IV Meropenem 1g q8h (Day 3 of 10). PICC line in situ. Contact isolation. Lisinopril held. Warfarin resumed.",
    recommendations: [
      "Plan oral step-down to Nitrofurantoin 100mg BID if repeat cultures negative at Day 5 — ID consult concurs for ESBL-sensitive agents",
      "Resume Lisinopril 10mg daily (reduced from 20mg) once MAP consistently >70 for 48 hours",
      "Implement ESBL decolonization protocol per facility infection control guidelines",
    ],
    evidenceCitations: [
      { id: "ev-013", recommendationId: "rec-006", source: "IDSA 2024 Guidelines: Management of Extended-Spectrum Beta-Lactamase Producing Enterobacterales UTI", guidelineOrg: "IDSA", evidenceLevel: "A", keyFindings: "IV-to-oral step-down is safe when patient is afebrile for 48h with negative repeat cultures; Nitrofurantoin effective for uncomplicated lower UTI caused by ESBL producers", year: 2024 },
      { id: "ev-014", recommendationId: "rec-006", source: "Sepsis Recovery in Skilled Nursing Facilities: Crit Care Med 2023;51(11):1567-1576", guidelineOrg: "SCCM", evidenceLevel: "B", keyFindings: "Gradual antihypertensive reintroduction post-sepsis reduces hemodynamic instability; recommend 50% of pre-sepsis dose initially", year: 2023 },
    ],
    confidence: 0.85,
    model: "Claude + MedOS Clinical RAG",
    status: "rejected",
    reviewedBy: "Dr. James Wilson",
    reviewedAt: "2026-02-28 16:45",
    modificationNotes: "Rejected oral step-down plan — patient still febrile (100.4 at last check). Continue IV Meropenem full course. Reassess at Day 7.",
  },
];

const APPROVAL_ACTIONS: ApprovalAction[] = [
  { id: "aa-001", recommendationId: "rec-002", patientName: "David Kim", recommendationSummary: "Add Ozempic 0.25mg weekly, refer diabetes educator, adjust meal plan", reviewer: "Dr. Ahmed Khan", action: "approved", timestamp: "2026-02-28 14:30", notes: "Agreed. GLP-1 RA well-indicated given HbA1c trajectory and CGM data." },
  { id: "aa-002", recommendationId: "rec-003", patientName: "Patricia Moore", recommendationSummary: "Initiate LAMA/LABA, add PDE4 inhibitor, increase pulm rehab", reviewer: "Dr. James Wilson", action: "modified", timestamp: "2026-02-27 09:15", notes: "Approved LAMA/LABA. Deferred Roflumilast due to hepatic impairment — substituted Azithromycin 250mg MWF." },
  { id: "aa-003", recommendationId: "rec-005", patientName: "Susan Lee", recommendationSummary: "Hold ACEi, gentle diuresis, nephrology consult", reviewer: "Dr. Sarah Martinez", action: "approved", timestamp: "2026-02-28 11:00", notes: "Agree with cardiorenal approach. Nephrology consult scheduled for tomorrow AM." },
  { id: "aa-004", recommendationId: "rec-006", patientName: "Robert Davis", recommendationSummary: "Oral step-down antibiotics, resume Lisinopril, ESBL decolonization", reviewer: "Dr. James Wilson", action: "rejected", timestamp: "2026-02-28 16:45", notes: "Patient still febrile. Not appropriate for step-down yet. Continue full IV course." },
];

// --- Tab Components ---

function RecommendationsTab() {
  const totalRecs = RECOMMENDATIONS.length;
  const pendingCount = RECOMMENDATIONS.filter((r) => r.status === "pending").length;
  const avgConfidence = (RECOMMENDATIONS.reduce((s, r) => s + r.confidence, 0) / totalRecs * 100).toFixed(0);
  const approvedCount = RECOMMENDATIONS.filter((r) => r.status === "approved").length;
  const approvalRate = totalRecs > 0 ? Math.round(((approvedCount + RECOMMENDATIONS.filter((r) => r.status === "modified").length) / totalRecs) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Recommendations", value: totalRecs.toString(), color: "text-[var(--medos-primary)]" },
          { label: "Pending Review", value: pendingCount.toString(), color: "text-amber-600" },
          { label: "Avg Confidence", value: `${avgConfidence}%`, color: "text-emerald-600" },
          { label: "Approval Rate", value: `${approvalRate}%`, color: "text-blue-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Recommendation Cards */}
      {RECOMMENDATIONS.map((rec) => {
        const statusCfg = STATUS_CONFIG[rec.status];
        const StatusIcon = statusCfg.icon;
        return (
          <div key={rec.id} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
            {/* Patient Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--medos-gray-100)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--medos-gray-100)] flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--medos-gray-500)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--medos-navy)]">{rec.patientName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Building2 className="w-3 h-3 text-[var(--medos-gray-400)]" />
                    <span className="text-[10px] text-[var(--medos-gray-500)]">{rec.facility}</span>
                  </div>
                  <span className="text-[10px] text-[var(--medos-gray-500)] mt-0.5 block">Dx: {rec.primaryDx}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  rec.confidence >= 0.90 ? "bg-emerald-50 text-emerald-700" : rec.confidence >= 0.85 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                )}>
                  {(rec.confidence * 100).toFixed(0)}% confidence
                </span>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                  statusCfg.bg, statusCfg.text
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {statusCfg.label}
                </span>
              </div>
            </div>

            {/* Current Plan */}
            <div className="px-6 py-3 bg-[var(--medos-gray-50)]">
              <p className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Current Care Plan</p>
              <p className="text-xs text-[var(--medos-gray-600)]">{rec.currentPlanSummary}</p>
            </div>

            {/* AI Recommendations */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[var(--medos-primary)]" />
                <p className="text-[10px] font-semibold text-[var(--medos-primary)] uppercase tracking-wider">AI Recommendations</p>
                <span className="text-[9px] text-[var(--medos-gray-400)] ml-auto">{rec.model}</span>
              </div>
              <ol className="space-y-2">
                {rec.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-[var(--medos-navy)]">
                    <span className="text-[10px] font-bold text-[var(--medos-primary)] mt-0.5 shrink-0">{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Evidence + Actions Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--medos-gray-100)] bg-[var(--medos-gray-50)]">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--medos-gray-500)] flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {rec.evidenceCitations.length} citations
                </span>
                {rec.reviewedBy && (
                  <span className="text-[10px] text-[var(--medos-gray-500)] flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {rec.reviewedBy} at {rec.reviewedAt}
                  </span>
                )}
              </div>
              {rec.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button className="text-[10px] font-medium px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-default">Approve</button>
                  <button className="text-[10px] font-medium px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-default">Modify</button>
                  <button className="text-[10px] font-medium px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-default">Reject</button>
                  <button className="text-[10px] font-medium px-3 py-1.5 rounded-md bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-200)] transition-default">More Info</button>
                </div>
              )}
            </div>

            {/* Modification Notes */}
            {rec.modificationNotes && (
              <div className="px-6 py-3 border-t border-[var(--medos-gray-100)]">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--medos-gray-400)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-0.5">Reviewer Notes</p>
                    <p className="text-xs text-[var(--medos-gray-600)]">{rec.modificationNotes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EvidenceCitationsTab() {
  const [expandedRec, setExpandedRec] = useState<string | null>("rec-001");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Citations", value: RECOMMENDATIONS.reduce((s, r) => s + r.evidenceCitations.length, 0).toString(), color: "text-[var(--medos-primary)]" },
          { label: "Level A (Strong)", value: RECOMMENDATIONS.reduce((s, r) => s + r.evidenceCitations.filter((e) => e.evidenceLevel === "A").length, 0).toString(), color: "text-emerald-600" },
          { label: "Guideline Sources", value: "6", color: "text-blue-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Per-Recommendation Evidence */}
      {RECOMMENDATIONS.map((rec) => {
        const isExpanded = expandedRec === rec.id;
        return (
          <div key={rec.id} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
            <button
              onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--medos-gray-50)] transition-default"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)]" /> : <ChevronRight className="w-4 h-4 text-[var(--medos-gray-400)]" />}
                <div className="text-left">
                  <span className="text-sm font-semibold text-[var(--medos-navy)]">{rec.patientName}</span>
                  <p className="text-[10px] text-[var(--medos-gray-500)]">{rec.primaryDx}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[var(--medos-gray-500)] bg-[var(--medos-gray-100)] px-2 py-0.5 rounded-full">
                  {rec.evidenceCitations.length} citations
                </span>
                {rec.evidenceCitations.map((ev) => (
                  <span key={ev.id} className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", EVIDENCE_LEVEL_CONFIG[ev.evidenceLevel].bg, EVIDENCE_LEVEL_CONFIG[ev.evidenceLevel].text)}>
                    {ev.evidenceLevel}
                  </span>
                ))}
              </div>
            </button>

            {isExpanded && (
              <div className="px-6 pb-6 space-y-4 border-t border-[var(--medos-gray-100)] pt-4">
                {/* Show which recommendations these support */}
                <div className="bg-[var(--medos-gray-50)] rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">AI Recommendations Supported</p>
                  <ol className="space-y-1">
                    {rec.recommendations.map((r, i) => (
                      <li key={i} className="text-[10px] text-[var(--medos-gray-600)] flex gap-1.5">
                        <span className="text-[var(--medos-primary)] font-bold shrink-0">{i + 1}.</span>
                        <span className="line-clamp-1">{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Evidence Cards */}
                {rec.evidenceCitations.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-[var(--medos-gray-200)] p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[var(--medos-primary)]" />
                        <span className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase">{ev.guidelineOrg}</span>
                        <span className="text-[10px] text-[var(--medos-gray-400)]">{ev.year}</span>
                      </div>
                      <span className={cn("text-[9px] font-medium px-2 py-0.5 rounded-full", EVIDENCE_LEVEL_CONFIG[ev.evidenceLevel].bg, EVIDENCE_LEVEL_CONFIG[ev.evidenceLevel].text)}>
                        {EVIDENCE_LEVEL_CONFIG[ev.evidenceLevel].label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[var(--medos-navy)] mb-2">{ev.source}</p>
                    <div className="bg-[var(--medos-gray-50)] rounded-md p-3">
                      <p className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Key Findings</p>
                      <p className="text-xs text-[var(--medos-gray-600)]">{ev.keyFindings}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApprovalFlowTab() {
  const generated = RECOMMENDATIONS.filter((r) => r.status === "pending").length;
  const underReview = 0;
  const approved = RECOMMENDATIONS.filter((r) => r.status === "approved").length;
  const modified = RECOMMENDATIONS.filter((r) => r.status === "modified").length;
  const rejected = RECOMMENDATIONS.filter((r) => r.status === "rejected").length;
  const avgReviewTime = "3.2h";
  const modificationRate = RECOMMENDATIONS.length > 0 ? Math.round((modified / RECOMMENDATIONS.length) * 100) : 0;

  const pipelineStages = [
    { label: "AI Generated", count: generated, color: "bg-[var(--medos-primary)]", textColor: "text-[var(--medos-primary)]" },
    { label: "Under Review", count: underReview, color: "bg-blue-500", textColor: "text-blue-600" },
    { label: "Approved", count: approved, color: "bg-emerald-500", textColor: "text-emerald-600" },
    { label: "Modified", count: modified, color: "bg-blue-400", textColor: "text-blue-600" },
    { label: "Rejected", count: rejected, color: "bg-red-500", textColor: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Pipeline */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Approval Pipeline</h3>
        </div>
        <div className="flex items-center justify-between">
          {pipelineStages.map((stage, i) => (
            <div key={stage.label} className="flex items-center">
              <div className="text-center">
                <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2", stage.color, "bg-opacity-10")}>
                  <span className={cn("text-xl font-bold", stage.textColor)}>{stage.count}</span>
                </div>
                <p className="text-[10px] font-medium text-[var(--medos-gray-600)]">{stage.label}</p>
              </div>
              {i < pipelineStages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-[var(--medos-gray-300)] mx-3" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Review Time", value: avgReviewTime, color: "text-blue-600" },
          { label: "Modification Rate", value: `${modificationRate}%`, color: "text-amber-600" },
          { label: "Total Reviewed", value: APPROVAL_ACTIONS.length.toString(), color: "text-[var(--medos-primary)]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
            <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Approval Actions Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Approval History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Patient", "Recommendation", "Reviewer", "Action", "Timestamp", "Notes"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {APPROVAL_ACTIONS.map((aa) => {
                const actionCfg = STATUS_CONFIG[aa.action];
                const ActionIcon = actionCfg.icon;
                return (
                  <tr key={aa.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-[var(--medos-navy)]">{aa.patientName}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-xs text-[var(--medos-gray-600)] line-clamp-2">{aa.recommendationSummary}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--medos-gray-600)]">{aa.reviewer}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                        actionCfg.bg, actionCfg.text
                      )}>
                        <ActionIcon className="w-3 h-3" />
                        {actionCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-[var(--medos-gray-500)]">{aa.timestamp}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <span className="text-xs text-[var(--medos-gray-600)] line-clamp-2">{aa.notes}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Reasons */}
      {APPROVAL_ACTIONS.filter((a) => a.action === "rejected").length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Rejection Analysis</h3>
          </div>
          {APPROVAL_ACTIONS.filter((a) => a.action === "rejected").map((aa) => (
            <div key={aa.id} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-red-700">{aa.patientName}</span>
                <span className="text-[10px] text-red-500">by {aa.reviewer}</span>
              </div>
              <p className="text-xs text-red-600 mb-1"><strong>Recommendation:</strong> {aa.recommendationSummary}</p>
              <p className="text-xs text-red-600"><strong>Reason:</strong> {aa.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Export ---

export default function CarePlanOptimizerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommendations");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Care Plan Optimizer</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              AI-powered evidence-based recommendations — confidence-scored clinical intelligence
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
      {activeTab === "recommendations" && <RecommendationsTab />}
      {activeTab === "evidence" && <EvidenceCitationsTab />}
      {activeTab === "approval" && <ApprovalFlowTab />}
    </div>
  );
}
