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
  { id: "a-001", patientName: "Robert Chen", patientId: "p-004", time: "09:00 AM", type: "Follow-up", status: "completed", provider: "Dr. Di Reze" },
  { id: "a-002", patientName: "Maria Garcia", patientId: "p-001", time: "09:30 AM", type: "Lab Review", status: "completed", provider: "Dr. Di Reze" },
  { id: "a-003", patientName: "William Torres", patientId: "p-006", time: "10:00 AM", type: "Cardiology Consult", status: "in-progress", provider: "Dr. Di Reze" },
  { id: "a-004", patientName: "Ana Flores", patientId: "p-005", time: "11:00 AM", type: "New Patient", status: "confirmed", provider: "Dr. Di Reze" },
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
