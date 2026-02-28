/**
 * Mock data for demo purposes.
 * In production, this would come from the FastAPI backend via FHIR R4 API.
 */

export interface MockPatient {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  mrn: string;
  phone: string;
  email: string;
  address: string;
  insurance: string;
  lastVisit: string;
  nextAppointment: string | null;
  conditions: string[];
  riskScore: "low" | "moderate" | "high";
  status: "active" | "scheduled" | "discharged";
}

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: "p-001",
    name: "Maria Garcia",
    firstName: "Maria",
    lastName: "Garcia",
    birthDate: "1985-03-15",
    gender: "Female",
    mrn: "MRN-12345",
    phone: "(305) 555-0123",
    email: "maria.garcia@email.com",
    address: "1234 Brickell Ave, Miami, FL 33131",
    insurance: "Blue Cross Blue Shield - PPO",
    lastVisit: "2026-02-20",
    nextAppointment: "2026-03-05",
    conditions: ["Type 2 Diabetes", "Hypertension"],
    riskScore: "moderate",
    status: "active",
  },
  {
    id: "p-002",
    name: "James Rodriguez",
    firstName: "James",
    lastName: "Rodriguez",
    birthDate: "1972-08-22",
    gender: "Male",
    mrn: "MRN-12346",
    phone: "(305) 555-0456",
    email: "james.rodriguez@email.com",
    address: "5678 Collins Ave, Miami Beach, FL 33140",
    insurance: "Aetna - HMO",
    lastVisit: "2026-02-25",
    nextAppointment: "2026-03-10",
    conditions: ["COPD", "Sleep Apnea", "Obesity"],
    riskScore: "high",
    status: "active",
  },
  {
    id: "p-003",
    name: "Sofia Martinez",
    firstName: "Sofia",
    lastName: "Martinez",
    birthDate: "1990-11-08",
    gender: "Female",
    mrn: "MRN-12347",
    phone: "(786) 555-0789",
    email: "sofia.martinez@email.com",
    address: "910 Coral Way, Coral Gables, FL 33134",
    insurance: "United Healthcare - EPO",
    lastVisit: "2026-02-18",
    nextAppointment: null,
    conditions: ["Asthma"],
    riskScore: "low",
    status: "discharged",
  },
  {
    id: "p-004",
    name: "Robert Chen",
    firstName: "Robert",
    lastName: "Chen",
    birthDate: "1965-04-30",
    gender: "Male",
    mrn: "MRN-12348",
    phone: "(305) 555-1234",
    email: "robert.chen@email.com",
    address: "2345 SW 8th St, Miami, FL 33135",
    insurance: "Medicare Part B",
    lastVisit: "2026-02-27",
    nextAppointment: "2026-03-03",
    conditions: ["Atrial Fibrillation", "Chronic Kidney Disease Stage 3", "Hypertension"],
    riskScore: "high",
    status: "active",
  },
  {
    id: "p-005",
    name: "Ana Flores",
    firstName: "Ana",
    lastName: "Flores",
    birthDate: "1998-07-12",
    gender: "Female",
    mrn: "MRN-12349",
    phone: "(786) 555-5678",
    email: "ana.flores@email.com",
    address: "3456 NW 7th St, Miami, FL 33125",
    insurance: "Cigna - PPO",
    lastVisit: "2026-02-15",
    nextAppointment: "2026-03-12",
    conditions: ["Migraine", "Anxiety"],
    riskScore: "low",
    status: "scheduled",
  },
  {
    id: "p-006",
    name: "William Torres",
    firstName: "William",
    lastName: "Torres",
    birthDate: "1958-01-20",
    gender: "Male",
    mrn: "MRN-12350",
    phone: "(305) 555-9012",
    email: "william.torres@email.com",
    address: "7890 Bird Rd, Miami, FL 33155",
    insurance: "Humana Gold Plus - HMO",
    lastVisit: "2026-02-28",
    nextAppointment: "2026-03-07",
    conditions: ["Heart Failure (NYHA II)", "Type 2 Diabetes", "Peripheral Neuropathy", "Hyperlipidemia"],
    riskScore: "high",
    status: "active",
  },
];

/* ------------------------------------------------------------------ */
/*  Clinical Risk Data                                                 */
/* ------------------------------------------------------------------ */

export interface RiskAlert {
  id: string;
  severity: "urgent" | "warning" | "info";
  title: string;
  description: string;
}

export interface PatientRiskData {
  overallScore: number;
  factors: {
    medicationAdherence: number;
    labAbnormality: number;
    comorbidity: number;
    careGap: number;
  };
  alerts: RiskAlert[];
  trendData: number[];
}

export interface TimelineAIInsight {
  type: "effectiveness" | "abnormal" | "ai-note" | "pattern";
  label: string;
  color: "green" | "orange" | "blue" | "purple";
}

export const PATIENT_RISK_DATA: Record<string, PatientRiskData> = {
  "p-001": {
    overallScore: 55,
    factors: {
      medicationAdherence: 38,
      labAbnormality: 42,
      comorbidity: 35,
      careGap: 52,
    },
    alerts: [
      {
        id: "a-001-1",
        severity: "warning",
        title: "Overdue for annual diabetic eye exam",
        description:
          "Last dilated eye exam was 14 months ago. ADA recommends annual screening for patients with Type 2 Diabetes.",
      },
      {
        id: "a-001-2",
        severity: "info",
        title: "Eligible for Medicare Annual Wellness Visit",
        description:
          "Patient qualifies for preventive wellness visit. Schedule to maximize reimbursement and close care gaps.",
      },
      {
        id: "a-001-3",
        severity: "warning",
        title: "HbA1c at goal threshold",
        description:
          "Current HbA1c 7.2% is at the upper limit of target range. Consider intensifying glycemic management if next reading trends upward.",
      },
    ],
    trendData: [42, 45, 48, 50, 53, 55],
  },
  "p-002": {
    overallScore: 72,
    factors: {
      medicationAdherence: 55,
      labAbnormality: 48,
      comorbidity: 68,
      careGap: 40,
    },
    alerts: [
      {
        id: "a-002-1",
        severity: "urgent",
        title: "Spirometry decline exceeds threshold",
        description:
          "FEV1 has declined 12% over 6 months. COPD exacerbation risk elevated. Consider pulmonology referral and medication adjustment.",
      },
      {
        id: "a-002-2",
        severity: "warning",
        title: "BMI trending upward",
        description:
          "BMI increased from 34.2 to 36.1 over past quarter. Weight management intervention recommended alongside sleep apnea treatment.",
      },
      {
        id: "a-002-3",
        severity: "info",
        title: "Sleep study follow-up due",
        description:
          "Last polysomnography was 11 months ago. Annual CPAP compliance review and titration study recommended.",
      },
    ],
    trendData: [58, 62, 65, 68, 70, 72],
  },
  "p-003": {
    overallScore: 25,
    factors: {
      medicationAdherence: 15,
      labAbnormality: 10,
      comorbidity: 8,
      careGap: 22,
    },
    alerts: [
      {
        id: "a-003-1",
        severity: "info",
        title: "Asthma action plan review",
        description:
          "Annual asthma action plan update is due. Patient has been well-controlled on current regimen.",
      },
      {
        id: "a-003-2",
        severity: "info",
        title: "Seasonal allergy preparation",
        description:
          "Spring allergy season approaching. Consider preemptive adjustment of controller medication.",
      },
    ],
    trendData: [30, 28, 27, 26, 25, 25],
  },
  "p-004": {
    overallScore: 78,
    factors: {
      medicationAdherence: 32,
      labAbnormality: 65,
      comorbidity: 72,
      careGap: 28,
    },
    alerts: [
      {
        id: "a-004-1",
        severity: "urgent",
        title: "HbA1c trending up 2 consecutive quarters",
        description:
          "HbA1c rose from 7.1% to 7.8% to 8.4% over the last 6 months. Immediate glycemic intervention required. Consider endocrinology referral.",
      },
      {
        id: "a-004-2",
        severity: "urgent",
        title: "eGFR declining -- CKD Stage 3 progression risk",
        description:
          "Estimated GFR dropped from 48 to 42 mL/min. Nephrology consultation recommended. Review nephrotoxic medications.",
      },
      {
        id: "a-004-3",
        severity: "warning",
        title: "Blood pressure control deteriorating",
        description:
          "Last 3 readings average 148/92 mmHg, exceeding target of 130/80 for CKD patients. Antihypertensive regimen adjustment needed.",
      },
      {
        id: "a-004-4",
        severity: "warning",
        title: "Anticoagulation INR variability",
        description:
          "INR readings have been outside therapeutic range in 2 of last 4 checks. Warfarin dose may need re-titration.",
      },
    ],
    trendData: [60, 64, 68, 72, 75, 78],
  },
  "p-005": {
    overallScore: 20,
    factors: {
      medicationAdherence: 12,
      labAbnormality: 8,
      comorbidity: 15,
      careGap: 18,
    },
    alerts: [
      {
        id: "a-005-1",
        severity: "info",
        title: "Preventive screening reminder",
        description:
          "Patient is due for routine preventive screenings appropriate for age group. Schedule during next visit.",
      },
      {
        id: "a-005-2",
        severity: "info",
        title: "Migraine frequency stable",
        description:
          "Migraine episodes holding steady at 2-3 per month. Current prophylactic therapy appears effective.",
      },
    ],
    trendData: [28, 25, 23, 22, 21, 20],
  },
  "p-006": {
    overallScore: 82,
    factors: {
      medicationAdherence: 45,
      labAbnormality: 58,
      comorbidity: 78,
      careGap: 35,
    },
    alerts: [
      {
        id: "a-006-1",
        severity: "urgent",
        title: "Heart failure exacerbation indicators",
        description:
          "Weight gain of 4 lbs in 7 days combined with elevated BNP (890 pg/mL). Immediate diuretic adjustment and possible hospitalization evaluation needed.",
      },
      {
        id: "a-006-2",
        severity: "urgent",
        title: "Peripheral neuropathy progression",
        description:
          "Monofilament test shows decreased sensation in both feet. Diabetic foot ulcer risk elevated. Podiatry referral urgent.",
      },
      {
        id: "a-006-3",
        severity: "warning",
        title: "LDL cholesterol above target",
        description:
          "LDL 142 mg/dL despite statin therapy. Target for high-risk cardiac patient is <70 mg/dL. Consider statin intensification or adding ezetimibe.",
      },
      {
        id: "a-006-4",
        severity: "warning",
        title: "Polypharmacy risk -- 12 active medications",
        description:
          "Patient is on 12 concurrent medications. Medication reconciliation review recommended to identify potential interactions and deprescribing opportunities.",
      },
      {
        id: "a-006-5",
        severity: "info",
        title: "Cardiac rehabilitation eligibility",
        description:
          "Patient meets criteria for outpatient cardiac rehabilitation program. Insurance pre-authorization in progress.",
      },
    ],
    trendData: [68, 72, 75, 78, 80, 82],
  },
};

/** AI insight badges for timeline entries, keyed by patient ID */
export const TIMELINE_AI_INSIGHTS: Record<string, TimelineAIInsight[]> = {
  "p-001": [
    { type: "ai-note", label: "AI SOAP Note: 92% confidence", color: "blue" },
    { type: "abnormal", label: "At upper limit -- monitor closely", color: "orange" },
    { type: "effectiveness", label: "Effective -- HbA1c improved 0.6% in 45 days", color: "green" },
    { type: "pattern", label: "Pattern: All screenings completed on schedule", color: "purple" },
  ],
  "p-002": [
    { type: "ai-note", label: "AI SOAP Note: 89% confidence", color: "blue" },
    { type: "abnormal", label: "Abnormal trend -- 3rd elevated reading", color: "orange" },
    { type: "effectiveness", label: "CPAP compliance improved 15%", color: "green" },
    { type: "pattern", label: "Pattern: Weight gain correlates with reduced activity", color: "purple" },
  ],
  "p-003": [
    { type: "ai-note", label: "AI SOAP Note: 95% confidence", color: "blue" },
    { type: "effectiveness", label: "Well-controlled -- peak flow stable", color: "green" },
    { type: "effectiveness", label: "Controller medication effective", color: "green" },
    { type: "pattern", label: "Pattern: Seasonal exacerbation in Q2 historically", color: "purple" },
  ],
  "p-004": [
    { type: "ai-note", label: "AI SOAP Note: 94% confidence", color: "blue" },
    { type: "abnormal", label: "Abnormal trend -- 3rd elevated HbA1c", color: "orange" },
    { type: "abnormal", label: "eGFR declining -- review nephrotoxic meds", color: "orange" },
    { type: "pattern", label: "Pattern: BP spikes correlate with medication gaps", color: "purple" },
  ],
  "p-005": [
    { type: "ai-note", label: "AI SOAP Note: 96% confidence", color: "blue" },
    { type: "effectiveness", label: "Migraine frequency reduced 40%", color: "green" },
    { type: "effectiveness", label: "Anxiety well-managed on current SSRI", color: "green" },
    { type: "pattern", label: "Pattern: Migraines cluster around menstrual cycle", color: "purple" },
  ],
  "p-006": [
    { type: "ai-note", label: "AI SOAP Note: 88% confidence", color: "blue" },
    { type: "abnormal", label: "Abnormal -- BNP elevated, weight gain 4 lbs/week", color: "orange" },
    { type: "abnormal", label: "LDL above target despite therapy", color: "orange" },
    { type: "pattern", label: "Pattern: Fluid retention worsens with dietary non-compliance", color: "purple" },
  ],
};

export interface MockAppointment {
  id: string;
  patientName: string;
  patientId: string;
  time: string;
  type: string;
  status: "confirmed" | "pending" | "in-progress" | "completed";
  provider: string;
}

export const MOCK_TODAYS_APPOINTMENTS: MockAppointment[] = [
  { id: "a-001", patientName: "Robert Chen", patientId: "p-004", time: "09:00 AM", type: "Follow-up", status: "completed", provider: "Dr. Justin" },
  { id: "a-002", patientName: "Maria Garcia", patientId: "p-001", time: "09:30 AM", type: "Lab Review", status: "completed", provider: "Dr. Justin" },
  { id: "a-003", patientName: "William Torres", patientId: "p-006", time: "10:00 AM", type: "Cardiology Consult", status: "in-progress", provider: "Dr. Justin" },
  { id: "a-004", patientName: "Ana Flores", patientId: "p-005", time: "11:00 AM", type: "New Patient", status: "confirmed", provider: "Dr. Justin" },
  { id: "a-005", patientName: "James Rodriguez", patientId: "p-002", time: "02:00 PM", type: "Pulmonology", status: "pending", provider: "Dr. Patel" },
  { id: "a-006", patientName: "Sofia Martinez", patientId: "p-003", time: "03:30 PM", type: "Discharge Review", status: "pending", provider: "Dr. Patel" },
];

export interface MockDashboardStats {
  totalPatients: number;
  appointmentsToday: number;
  pendingClaims: number;
  pendingPriorAuths: number;
  revenueThisMonth: number;
  claimDenialRate: number;
  avgWaitTime: number;
  aiNotesGenerated: number;
}

export const MOCK_DASHBOARD_STATS: MockDashboardStats = {
  totalPatients: 847,
  appointmentsToday: 24,
  pendingClaims: 38,
  pendingPriorAuths: 12,
  revenueThisMonth: 284500,
  claimDenialRate: 4.2,
  avgWaitTime: 12,
  aiNotesGenerated: 156,
};

export interface MockRecentActivity {
  id: string;
  action: string;
  detail: string;
  time: string;
  type: "ai" | "claim" | "appointment" | "alert";
}

export const MOCK_RECENT_ACTIVITY: MockRecentActivity[] = [
  { id: "r-001", action: "AI Note Generated", detail: "SOAP note for Robert Chen - Follow-up visit", time: "9:45 AM", type: "ai" },
  { id: "r-002", action: "Claim Submitted", detail: "CMS-1500 for Maria Garcia - CPT 99214", time: "9:35 AM", type: "claim" },
  { id: "r-003", action: "Prior Auth Approved", detail: "MRI Lumbar Spine - James Rodriguez", time: "9:20 AM", type: "claim" },
  { id: "r-004", action: "AI Coding Suggestion", detail: "ICD-10: E11.65, I10 for Maria Garcia encounter", time: "9:10 AM", type: "ai" },
  { id: "r-005", action: "Appointment Check-in", detail: "William Torres checked in for Cardiology Consult", time: "9:55 AM", type: "appointment" },
  { id: "r-006", action: "Risk Alert", detail: "Robert Chen - HbA1c trending up, recommend intervention", time: "8:30 AM", type: "alert" },
];
