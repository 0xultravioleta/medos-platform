"use client";

import { useState } from "react";
import {
  BadgeCheck,
  FileText,
  AlertTriangle,
  Shield,
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bell,
  Send,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "licensing" | "caqh" | "alerts";
type LicenseStatus = "active" | "expiring-soon" | "expired" | "pending-renewal" | "under-review";
type CAQHStatus = "current" | "due-soon" | "overdue";

interface StateLicense {
  state: string;
  licenseNumber: string;
  issueDate: string;
  expirationDate: string;
  status: LicenseStatus;
}

interface Provider {
  id: string;
  name: string;
  title: string;
  npi: string;
  homeState: string;
  licenses: StateLicense[];
  caqhProfileId: string;
  caqhLastAttestation: string;
  caqhNextDue: string;
  caqhCompleteness: number;
  deaStatus: LicenseStatus;
  deaExpiration: string;
  boardCertifications: string[];
  boardCertStatus: LicenseStatus;
  boardCertExpiration: string;
}

interface ExpirationAlert {
  id: string;
  providerId: string;
  providerName: string;
  providerTitle: string;
  type: "State License" | "DEA Registration" | "Board Certification" | "CAQH Attestation";
  detail: string;
  expirationDate: string;
  daysRemaining: number;
  renewalChecklist: {
    label: string;
    completed: boolean;
  }[];
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof BadgeCheck }[] = [
  { key: "licensing", label: "Licensing", icon: FileText },
  { key: "caqh", label: "CAQH Profiles", icon: ClipboardCheck },
  { key: "alerts", label: "Expiration Alerts", icon: AlertTriangle },
];

const LICENSE_STATUS_STYLE: Record<LicenseStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  "expiring-soon": { bg: "bg-amber-50", text: "text-amber-700", label: "Expiring Soon" },
  expired: { bg: "bg-red-50", text: "text-red-700", label: "Expired" },
  "pending-renewal": { bg: "bg-blue-50", text: "text-blue-700", label: "Pending Renewal" },
  "under-review": { bg: "bg-purple-50", text: "text-purple-700", label: "Under Review" },
};

const CAQH_STATUS_STYLE: Record<CAQHStatus, { bg: string; text: string }> = {
  current: { bg: "bg-emerald-50", text: "text-emerald-700" },
  "due-soon": { bg: "bg-amber-50", text: "text-amber-700" },
  overdue: { bg: "bg-red-50", text: "text-red-700" },
};

// --- Mock Data ---

const PROVIDERS: Provider[] = [
  {
    id: "prov-001",
    name: "Dr. Justin Di Rezze",
    title: "DO",
    npi: "1558775700",
    homeState: "Michigan",
    licenses: [
      { state: "MI", licenseNumber: "4301105658", issueDate: "2016-07-01", expirationDate: "2027-06-30", status: "active" },
      { state: "FL", licenseNumber: "ME-118432", issueDate: "2021-03-15", expirationDate: "2027-01-31", status: "active" },
      { state: "TX", licenseNumber: "TX-MP94521", issueDate: "2022-01-10", expirationDate: "2026-04-15", status: "expiring-soon" },
      { state: "OH", licenseNumber: "OH-35-112847", issueDate: "2022-06-01", expirationDate: "2027-05-31", status: "active" },
    ],
    caqhProfileId: "CAQH-14829731",
    caqhLastAttestation: "2026-01-15",
    caqhNextDue: "2026-04-15",
    caqhCompleteness: 98,
    deaStatus: "active",
    deaExpiration: "2028-03-31",
    boardCertifications: ["Internal Medicine (ABIM)"],
    boardCertStatus: "active",
    boardCertExpiration: "2028-12-31",
  },
  {
    id: "prov-002",
    name: "Dr. Maria Santos",
    title: "MD",
    npi: "1234567890",
    homeState: "Florida",
    licenses: [
      { state: "FL", licenseNumber: "ME-102938", issueDate: "2018-05-20", expirationDate: "2027-03-31", status: "active" },
      { state: "MI", licenseNumber: "4301208741", issueDate: "2020-09-01", expirationDate: "2026-08-31", status: "active" },
      { state: "GA", licenseNumber: "GA-067432", issueDate: "2023-01-10", expirationDate: "2026-04-30", status: "expiring-soon" },
      { state: "NC", licenseNumber: "NC-2023-4521", issueDate: "2023-06-15", expirationDate: "2027-06-14", status: "active" },
      { state: "TX", licenseNumber: "TX-MP95832", issueDate: "2023-11-01", expirationDate: "2026-03-28", status: "expiring-soon" },
    ],
    caqhProfileId: "CAQH-10293847",
    caqhLastAttestation: "2025-12-20",
    caqhNextDue: "2026-03-20",
    caqhCompleteness: 95,
    deaStatus: "active",
    deaExpiration: "2027-09-30",
    boardCertifications: ["Internal Medicine (ABIM)", "Geriatrics (ABIM)"],
    boardCertStatus: "active",
    boardCertExpiration: "2029-06-30",
  },
  {
    id: "prov-003",
    name: "Dr. Ahmed Khan",
    title: "MD",
    npi: "2345678901",
    homeState: "Michigan",
    licenses: [
      { state: "MI", licenseNumber: "4301304521", issueDate: "2019-02-15", expirationDate: "2027-02-14", status: "active" },
      { state: "OH", licenseNumber: "OH-35-118932", issueDate: "2021-04-01", expirationDate: "2027-03-31", status: "active" },
      { state: "IN", licenseNumber: "IN-01-084523", issueDate: "2022-08-10", expirationDate: "2026-08-09", status: "active" },
    ],
    caqhProfileId: "CAQH-20384756",
    caqhLastAttestation: "2026-02-01",
    caqhNextDue: "2026-05-01",
    caqhCompleteness: 100,
    deaStatus: "active",
    deaExpiration: "2027-12-31",
    boardCertifications: ["Pulmonology (ABIM)"],
    boardCertStatus: "active",
    boardCertExpiration: "2028-03-31",
  },
  {
    id: "prov-004",
    name: "Dr. Lisa Chen",
    title: "MD",
    npi: "3456789012",
    homeState: "Florida",
    licenses: [
      { state: "FL", licenseNumber: "ME-114523", issueDate: "2020-01-15", expirationDate: "2027-01-14", status: "active" },
      { state: "NY", licenseNumber: "NY-292841", issueDate: "2018-06-01", expirationDate: "2026-05-31", status: "expiring-soon" },
      { state: "NJ", licenseNumber: "NJ-25MA09842", issueDate: "2021-09-15", expirationDate: "2027-09-14", status: "active" },
      { state: "PA", licenseNumber: "PA-MD-084521", issueDate: "2022-03-01", expirationDate: "2027-02-28", status: "active" },
    ],
    caqhProfileId: "CAQH-30495867",
    caqhLastAttestation: "2025-11-10",
    caqhNextDue: "2026-02-10",
    caqhCompleteness: 88,
    deaStatus: "expiring-soon",
    deaExpiration: "2026-05-15",
    boardCertifications: ["Physical Medicine & Rehab (ABPMR)"],
    boardCertStatus: "active",
    boardCertExpiration: "2029-12-31",
  },
  {
    id: "prov-005",
    name: "Sarah Mitchell",
    title: "NP",
    npi: "4567890123",
    homeState: "Michigan",
    licenses: [
      { state: "MI", licenseNumber: "NP-4701-08423", issueDate: "2020-04-01", expirationDate: "2026-03-31", status: "expiring-soon" },
      { state: "OH", licenseNumber: "OH-RN-384521", issueDate: "2021-07-15", expirationDate: "2027-07-14", status: "active" },
      { state: "WI", licenseNumber: "WI-NP-28451", issueDate: "2023-02-01", expirationDate: "2027-01-31", status: "active" },
    ],
    caqhProfileId: "CAQH-40506978",
    caqhLastAttestation: "2026-01-25",
    caqhNextDue: "2026-04-25",
    caqhCompleteness: 92,
    deaStatus: "active",
    deaExpiration: "2028-06-30",
    boardCertifications: ["Family NP (AANP)"],
    boardCertStatus: "active",
    boardCertExpiration: "2027-09-30",
  },
  {
    id: "prov-006",
    name: "James Rodriguez",
    title: "PA",
    npi: "5678901234",
    homeState: "Texas",
    licenses: [
      { state: "TX", licenseNumber: "TX-PA-42891", issueDate: "2019-11-01", expirationDate: "2027-10-31", status: "active" },
      { state: "FL", licenseNumber: "PA-9102834", issueDate: "2022-05-15", expirationDate: "2026-05-14", status: "expiring-soon" },
      { state: "AZ", licenseNumber: "AZ-PA-18294", issueDate: "2023-03-01", expirationDate: "2027-02-28", status: "active" },
    ],
    caqhProfileId: "CAQH-50617089",
    caqhLastAttestation: "2026-02-15",
    caqhNextDue: "2026-05-15",
    caqhCompleteness: 96,
    deaStatus: "active",
    deaExpiration: "2027-11-30",
    boardCertifications: ["PA-C (NCCPA)"],
    boardCertStatus: "active",
    boardCertExpiration: "2028-06-30",
  },
  {
    id: "prov-007",
    name: "Dr. Robert Williams",
    title: "MD",
    npi: "6789012345",
    homeState: "Ohio",
    licenses: [
      { state: "OH", licenseNumber: "OH-35-125847", issueDate: "2017-08-01", expirationDate: "2027-07-31", status: "active" },
      { state: "MI", licenseNumber: "4301409832", issueDate: "2020-12-01", expirationDate: "2026-11-30", status: "active" },
      { state: "MN", licenseNumber: "MN-58241", issueDate: "2023-05-15", expirationDate: "2027-05-14", status: "active" },
      { state: "CO", licenseNumber: "CO-DR-84521", issueDate: "2024-01-10", expirationDate: "2026-01-09", status: "expired" },
    ],
    caqhProfileId: "CAQH-60728190",
    caqhLastAttestation: "2025-10-05",
    caqhNextDue: "2026-01-05",
    caqhCompleteness: 82,
    deaStatus: "active",
    deaExpiration: "2028-04-30",
    boardCertifications: ["Internal Medicine (ABIM)"],
    boardCertStatus: "active",
    boardCertExpiration: "2027-12-31",
  },
  {
    id: "prov-008",
    name: "Dr. Priya Patel",
    title: "MD",
    npi: "7890123456",
    homeState: "Florida",
    licenses: [
      { state: "FL", licenseNumber: "ME-121847", issueDate: "2021-06-01", expirationDate: "2027-05-31", status: "active" },
      { state: "GA", licenseNumber: "GA-078432", issueDate: "2022-02-15", expirationDate: "2027-02-14", status: "active" },
      { state: "TN", licenseNumber: "TN-MD-94521", issueDate: "2023-04-01", expirationDate: "2027-03-31", status: "active" },
      { state: "MA", licenseNumber: "MA-281947", issueDate: "2023-09-15", expirationDate: "2027-09-14", status: "active" },
      { state: "VA", licenseNumber: "VA-0101-084523", issueDate: "2024-01-10", expirationDate: "2027-01-09", status: "active" },
    ],
    caqhProfileId: "CAQH-70839201",
    caqhLastAttestation: "2026-02-20",
    caqhNextDue: "2026-05-20",
    caqhCompleteness: 100,
    deaStatus: "active",
    deaExpiration: "2028-09-30",
    boardCertifications: ["Internal Medicine (ABIM)", "Hospice & Palliative (ABMS)"],
    boardCertStatus: "active",
    boardCertExpiration: "2029-03-31",
  },
  {
    id: "prov-009",
    name: "Emily Nguyen",
    title: "NP",
    npi: "8901234567",
    homeState: "Texas",
    licenses: [
      { state: "TX", licenseNumber: "TX-APRN-52891", issueDate: "2021-03-15", expirationDate: "2027-03-14", status: "active" },
      { state: "IL", licenseNumber: "IL-APRN-043821", issueDate: "2022-08-01", expirationDate: "2026-07-31", status: "active" },
      { state: "MO", licenseNumber: "MO-NP-2023-4521", issueDate: "2023-06-10", expirationDate: "2027-06-09", status: "active" },
    ],
    caqhProfileId: "CAQH-80940312",
    caqhLastAttestation: "2026-01-30",
    caqhNextDue: "2026-04-30",
    caqhCompleteness: 94,
    deaStatus: "active",
    deaExpiration: "2027-08-31",
    boardCertifications: ["Adult-Gerontology NP (ANCC)"],
    boardCertStatus: "active",
    boardCertExpiration: "2028-10-31",
  },
  {
    id: "prov-010",
    name: "Dr. Michael Torres",
    title: "DO",
    npi: "9012345678",
    homeState: "Michigan",
    licenses: [
      { state: "MI", licenseNumber: "4301512847", issueDate: "2018-09-01", expirationDate: "2026-08-31", status: "active" },
      { state: "FL", licenseNumber: "OS-14832", issueDate: "2021-11-15", expirationDate: "2027-11-14", status: "active" },
      { state: "CA", licenseNumber: "CA-A184523", issueDate: "2023-07-01", expirationDate: "2027-06-30", status: "active" },
      { state: "MD", licenseNumber: "MD-D84521", issueDate: "2024-02-10", expirationDate: "2026-03-25", status: "expiring-soon" },
    ],
    caqhProfileId: "CAQH-91051423",
    caqhLastAttestation: "2025-12-10",
    caqhNextDue: "2026-03-10",
    caqhCompleteness: 90,
    deaStatus: "active",
    deaExpiration: "2028-01-31",
    boardCertifications: ["Family Medicine (AOBFP)"],
    boardCertStatus: "active",
    boardCertExpiration: "2028-08-31",
  },
  {
    id: "prov-011",
    name: "Katherine Brooks",
    title: "NP",
    npi: "0123456789",
    homeState: "Ohio",
    licenses: [
      { state: "OH", licenseNumber: "OH-APRN-294521", issueDate: "2020-10-01", expirationDate: "2026-09-30", status: "active" },
      { state: "IN", licenseNumber: "IN-APRN-07452", issueDate: "2022-01-15", expirationDate: "2027-01-14", status: "active" },
    ],
    caqhProfileId: "CAQH-02162534",
    caqhLastAttestation: "2026-02-05",
    caqhNextDue: "2026-05-05",
    caqhCompleteness: 97,
    deaStatus: "active",
    deaExpiration: "2027-07-31",
    boardCertifications: ["Acute Care NP (AACN)"],
    boardCertStatus: "active",
    boardCertExpiration: "2028-04-30",
  },
  {
    id: "prov-012",
    name: "Dr. David Park",
    title: "MD",
    npi: "1122334455",
    homeState: "New York",
    licenses: [
      { state: "NY", licenseNumber: "NY-304821", issueDate: "2017-04-01", expirationDate: "2027-03-31", status: "active" },
      { state: "NJ", licenseNumber: "NJ-25MA12847", issueDate: "2019-08-15", expirationDate: "2027-08-14", status: "active" },
      { state: "PA", licenseNumber: "PA-MD-098432", issueDate: "2021-12-01", expirationDate: "2027-11-30", status: "active" },
      { state: "FL", licenseNumber: "ME-125843", issueDate: "2023-04-15", expirationDate: "2027-04-14", status: "active" },
    ],
    caqhProfileId: "CAQH-12273645",
    caqhLastAttestation: "2026-02-28",
    caqhNextDue: "2026-05-28",
    caqhCompleteness: 100,
    deaStatus: "active",
    deaExpiration: "2028-07-31",
    boardCertifications: ["Internal Medicine (ABIM)", "Nephrology (ABIM)"],
    boardCertStatus: "active",
    boardCertExpiration: "2029-09-30",
  },
];

const EXPIRATION_ALERTS: ExpirationAlert[] = [
  {
    id: "alert-001",
    providerId: "prov-002",
    providerName: "Dr. Maria Santos",
    providerTitle: "MD",
    type: "State License",
    detail: "Texas (TX-MP95832)",
    expirationDate: "2026-03-28",
    daysRemaining: 27,
    renewalChecklist: [
      { label: "Application submitted", completed: true },
      { label: "CE hours completed (48 hrs)", completed: true },
      { label: "Renewal fee paid ($300)", completed: false },
      { label: "Background check cleared", completed: true },
    ],
  },
  {
    id: "alert-002",
    providerId: "prov-005",
    providerName: "Sarah Mitchell",
    providerTitle: "NP",
    type: "State License",
    detail: "Michigan (NP-4701-08423)",
    expirationDate: "2026-03-31",
    daysRemaining: 30,
    renewalChecklist: [
      { label: "Application submitted", completed: true },
      { label: "CE hours completed (25 hrs)", completed: false },
      { label: "Renewal fee paid ($150)", completed: false },
      { label: "Collaborative agreement renewed", completed: true },
    ],
  },
  {
    id: "alert-003",
    providerId: "prov-010",
    providerName: "Dr. Michael Torres",
    providerTitle: "DO",
    type: "State License",
    detail: "Maryland (MD-D84521)",
    expirationDate: "2026-03-25",
    daysRemaining: 24,
    renewalChecklist: [
      { label: "Application submitted", completed: false },
      { label: "CE hours completed (40 hrs)", completed: true },
      { label: "Renewal fee paid ($462)", completed: false },
      { label: "Background check cleared", completed: false },
    ],
  },
  {
    id: "alert-004",
    providerId: "prov-001",
    providerName: "Dr. Justin Di Rezze",
    providerTitle: "DO",
    type: "State License",
    detail: "Texas (TX-MP94521)",
    expirationDate: "2026-04-15",
    daysRemaining: 45,
    renewalChecklist: [
      { label: "Application submitted", completed: true },
      { label: "CE hours completed (48 hrs)", completed: true },
      { label: "Renewal fee paid ($300)", completed: true },
      { label: "Background check cleared", completed: false },
    ],
  },
  {
    id: "alert-005",
    providerId: "prov-002",
    providerName: "Dr. Maria Santos",
    providerTitle: "MD",
    type: "State License",
    detail: "Georgia (GA-067432)",
    expirationDate: "2026-04-30",
    daysRemaining: 60,
    renewalChecklist: [
      { label: "Application submitted", completed: false },
      { label: "CE hours completed (40 hrs)", completed: false },
      { label: "Renewal fee paid ($235)", completed: false },
      { label: "Background check cleared", completed: false },
    ],
  },
  {
    id: "alert-006",
    providerId: "prov-004",
    providerName: "Dr. Lisa Chen",
    providerTitle: "MD",
    type: "DEA Registration",
    detail: "DEA Exp 2026-05-15",
    expirationDate: "2026-05-15",
    daysRemaining: 75,
    renewalChecklist: [
      { label: "DEA Form 224a submitted", completed: false },
      { label: "State license valid", completed: true },
      { label: "Renewal fee paid ($888)", completed: false },
      { label: "Background check cleared", completed: true },
    ],
  },
  {
    id: "alert-007",
    providerId: "prov-006",
    providerName: "James Rodriguez",
    providerTitle: "PA",
    type: "State License",
    detail: "Florida (PA-9102834)",
    expirationDate: "2026-05-14",
    daysRemaining: 74,
    renewalChecklist: [
      { label: "Application submitted", completed: false },
      { label: "CE hours completed (100 hrs)", completed: true },
      { label: "Renewal fee paid ($275)", completed: false },
      { label: "Supervisory agreement current", completed: true },
    ],
  },
  {
    id: "alert-008",
    providerId: "prov-004",
    providerName: "Dr. Lisa Chen",
    providerTitle: "MD",
    type: "State License",
    detail: "New York (NY-292841)",
    expirationDate: "2026-05-31",
    daysRemaining: 91,
    renewalChecklist: [
      { label: "Application submitted", completed: false },
      { label: "CE hours completed (36 hrs)", completed: false },
      { label: "Renewal fee paid ($736)", completed: false },
      { label: "Infection control coursework", completed: false },
    ],
  },
];

const CAQH_CHECKLIST = [
  "Demographics & Contact",
  "Education & Training",
  "Work History",
  "Malpractice History",
  "Hospital Affiliations",
  "Professional References",
  "Disclosure Questions",
  "Practice Locations",
];

// --- Helpers ---

function getActiveLicenses(p: Provider): number {
  return p.licenses.filter((l) => l.status === "active").length;
}

function getExpiringSoon(p: Provider): number {
  return p.licenses.filter((l) => l.status === "expiring-soon").length;
}

function getExpired(p: Provider): number {
  return p.licenses.filter((l) => l.status === "expired").length;
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date("2026-03-01");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getCAQHStatus(p: Provider): CAQHStatus {
  const days = daysBetween(p.caqhNextDue);
  if (days < 0) return "overdue";
  if (days <= 30) return "due-soon";
  return "current";
}

function getDaysColor(days: number): string {
  if (days < 30) return "text-red-600";
  if (days < 60) return "text-amber-600";
  return "text-emerald-600";
}

function getDaysBg(days: number): string {
  if (days < 30) return "bg-red-50";
  if (days < 60) return "bg-amber-50";
  return "bg-emerald-50";
}

// --- Tab Components ---

function LicensingTab() {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const totalProviders = PROVIDERS.length;
  const totalActiveLicenses = PROVIDERS.reduce((s, p) => s + getActiveLicenses(p), 0);
  const totalLicenses = PROVIDERS.reduce((s, p) => s + p.licenses.length, 0);
  const statesCovered = new Set(PROVIDERS.flatMap((p) => p.licenses.map((l) => l.state))).size;
  const expiringIn90 = PROVIDERS.reduce((s, p) => s + getExpiringSoon(p), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            Total Providers
          </p>
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{totalProviders}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            Active Licenses
          </p>
          <p className="text-2xl font-bold text-emerald-600">{totalActiveLicenses}</p>
          <p className="text-[10px] text-[var(--medos-gray-400)]">of {totalLicenses} total</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            States Covered
          </p>
          <p className="text-2xl font-bold text-[var(--medos-primary)]">{statesCovered}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-[var(--medos-gray-500)] uppercase tracking-wider">
            Expiring in 90 Days
          </p>
          <p className={cn("text-2xl font-bold", expiringIn90 > 0 ? "text-amber-600" : "text-emerald-600")}>
            {expiringIn90}
          </p>
        </div>
      </div>

      {/* Provider Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Users className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            Provider Roster ({totalProviders})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["", "Provider", "Title", "NPI", "Home State", "Active", "Expiring", "Expired", "Board Cert", "DEA"].map(
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
              {PROVIDERS.map((prov) => {
                const isExpanded = expandedProvider === prov.id;
                const activeCt = getActiveLicenses(prov);
                const expiringCt = getExpiringSoon(prov);
                const expiredCt = getExpired(prov);
                return (
                  <>
                    <tr
                      key={prov.id}
                      onClick={() => setExpandedProvider(isExpanded ? null : prov.id)}
                      className="hover:bg-[var(--medos-gray-50)] transition-default cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-[var(--medos-navy)]">
                          {prov.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]">
                          {prov.title}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--medos-gray-500)] font-mono">
                          {prov.npi}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[var(--medos-gray-400)]" />
                          <span className="text-xs text-[var(--medos-gray-600)]">
                            {prov.homeState}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {activeCt}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {expiringCt > 0 ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            {expiringCt}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--medos-gray-400)]">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {expiredCt > 0 ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                            {expiredCt}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--medos-gray-400)]">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full",
                            LICENSE_STATUS_STYLE[prov.boardCertStatus].bg,
                            LICENSE_STATUS_STYLE[prov.boardCertStatus].text
                          )}
                        >
                          {LICENSE_STATUS_STYLE[prov.boardCertStatus].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full",
                            LICENSE_STATUS_STYLE[prov.deaStatus].bg,
                            LICENSE_STATUS_STYLE[prov.deaStatus].text
                          )}
                        >
                          {LICENSE_STATUS_STYLE[prov.deaStatus].label}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${prov.id}-detail`}>
                        <td colSpan={10} className="px-8 py-4 bg-[var(--medos-gray-50)]">
                          <div className="mb-3">
                            <p className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                              State Licenses ({prov.licenses.length})
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {prov.licenses.map((lic) => (
                                <div
                                  key={`${lic.state}-${lic.licenseNumber}`}
                                  className="flex items-center justify-between bg-white rounded-lg border border-[var(--medos-gray-200)] px-3 py-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[var(--medos-navy)]">
                                        {lic.state}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                                          LICENSE_STATUS_STYLE[lic.status].bg,
                                          LICENSE_STATUS_STYLE[lic.status].text
                                        )}
                                      >
                                        {LICENSE_STATUS_STYLE[lic.status].label}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-[var(--medos-gray-500)] font-mono mt-0.5">
                                      {lic.licenseNumber}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-[var(--medos-gray-500)]">
                                      Exp: {lic.expirationDate}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-[10px] text-[var(--medos-gray-500)]">
                            <span>
                              Board: {prov.boardCertifications.join(", ")} (exp {prov.boardCertExpiration})
                            </span>
                            <span>DEA: exp {prov.deaExpiration}</span>
                            <span>CAQH: {prov.caqhProfileId}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CAQHTab() {
  const upToDate = PROVIDERS.filter((p) => getCAQHStatus(p) === "current").length;
  const avgCompleteness = Math.round(
    PROVIDERS.reduce((s, p) => s + p.caqhCompleteness, 0) / PROVIDERS.length
  );
  const nextBatchDue = [...PROVIDERS]
    .sort((a, b) => new Date(a.caqhNextDue).getTime() - new Date(b.caqhNextDue).getTime())
    .find((p) => daysBetween(p.caqhNextDue) > 0);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Up to Date</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            {Math.round((upToDate / PROVIDERS.length) * 100)}%
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">
            {upToDate} of {PROVIDERS.length} providers current
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-4 h-4 text-[var(--medos-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Avg Completeness</h3>
          </div>
          <p className="text-3xl font-bold text-[var(--medos-primary)]">{avgCompleteness}%</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Profile data completeness</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Next Batch Due</h3>
          </div>
          <p className="text-lg font-bold text-[var(--medos-navy)]">
            {nextBatchDue?.caqhNextDue ?? "N/A"}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">
            {nextBatchDue ? `${nextBatchDue.name} (${daysBetween(nextBatchDue.caqhNextDue)} days)` : ""}
          </p>
        </div>
      </div>

      {/* Attestation Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <ClipboardCheck className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            CAQH Attestation Tracking
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Provider", "Last Attestation", "Next Due", "Days Until Due", "Profile Completeness", "Status"].map(
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
              {[...PROVIDERS]
                .sort(
                  (a, b) =>
                    daysBetween(a.caqhNextDue) - daysBetween(b.caqhNextDue)
                )
                .map((prov) => {
                  const daysUntil = daysBetween(prov.caqhNextDue);
                  const status = getCAQHStatus(prov);
                  return (
                    <tr key={prov.id} className="hover:bg-[var(--medos-gray-50)] transition-default">
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-xs font-medium text-[var(--medos-navy)]">
                            {prov.name}
                          </span>
                          <span className="text-[10px] text-[var(--medos-gray-400)] ml-2">
                            {prov.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--medos-gray-600)]">
                          {prov.caqhLastAttestation}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--medos-gray-600)]">
                          {prov.caqhNextDue}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded",
                            getDaysBg(daysUntil),
                            getDaysColor(daysUntil)
                          )}
                        >
                          {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                prov.caqhCompleteness >= 95
                                  ? "bg-emerald-400"
                                  : prov.caqhCompleteness >= 85
                                    ? "bg-amber-400"
                                    : "bg-red-400"
                              )}
                              style={{ width: `${prov.caqhCompleteness}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[var(--medos-gray-600)]">
                            {prov.caqhCompleteness}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                            CAQH_STATUS_STYLE[status].bg,
                            CAQH_STATUS_STYLE[status].text
                          )}
                        >
                          {status.replace("-", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAQH Completion Checklist */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
            CAQH Profile Sections
          </h3>
          <span className="text-[10px] text-[var(--medos-gray-400)] ml-auto">
            Required for credentialing
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CAQH_CHECKLIST.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 p-3 rounded-lg bg-[var(--medos-gray-50)] border border-[var(--medos-gray-100)]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-[var(--medos-navy)]">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsTab() {
  const critical = EXPIRATION_ALERTS.filter((a) => a.daysRemaining < 30);
  const warning = EXPIRATION_ALERTS.filter(
    (a) => a.daysRemaining >= 30 && a.daysRemaining < 60
  );
  const upcoming = EXPIRATION_ALERTS.filter((a) => a.daysRemaining >= 60);

  const sections: {
    label: string;
    alerts: ExpirationAlert[];
    color: string;
    borderColor: string;
    bgColor: string;
    iconColor: string;
  }[] = [
    {
      label: "Critical (< 30 days)",
      alerts: critical,
      color: "text-red-700",
      borderColor: "border-red-200",
      bgColor: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      label: "Warning (30-60 days)",
      alerts: warning,
      color: "text-amber-700",
      borderColor: "border-amber-200",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      label: "Upcoming (60-90 days)",
      alerts: upcoming,
      color: "text-blue-700",
      borderColor: "border-blue-200",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-xl border border-red-200 shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-red-600 uppercase tracking-wider font-medium">Critical</p>
          <p className="text-3xl font-bold text-red-700">{critical.length}</p>
          <p className="text-[10px] text-red-500">&lt; 30 days</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-amber-600 uppercase tracking-wider font-medium">Warning</p>
          <p className="text-3xl font-bold text-amber-700">{warning.length}</p>
          <p className="text-[10px] text-amber-500">30-60 days</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-medos-sm p-4 text-center">
          <p className="text-[10px] text-blue-600 uppercase tracking-wider font-medium">Upcoming</p>
          <p className="text-3xl font-bold text-blue-700">{upcoming.length}</p>
          <p className="text-[10px] text-blue-500">60-90 days</p>
        </div>
      </div>

      {/* Alert Groups */}
      {sections.map(
        (section) =>
          section.alerts.length > 0 && (
            <div key={section.label}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className={cn("w-4 h-4", section.iconColor)} />
                <h3 className={cn("text-sm font-semibold", section.color)}>
                  {section.label}
                </h3>
              </div>
              <div className="space-y-3">
                {section.alerts.map((alert) => {
                  const completedCount = alert.renewalChecklist.filter(
                    (c) => c.completed
                  ).length;
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "rounded-xl border shadow-medos-sm p-5",
                        section.bgColor,
                        section.borderColor
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-[var(--medos-navy)]">
                              {alert.providerName}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]">
                              {alert.providerTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                alert.type === "DEA Registration"
                                  ? "bg-purple-50 text-purple-700"
                                  : alert.type === "Board Certification"
                                    ? "bg-blue-50 text-blue-700"
                                    : alert.type === "CAQH Attestation"
                                      ? "bg-indigo-50 text-indigo-700"
                                      : "bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]"
                              )}
                            >
                              {alert.type}
                            </span>
                            <span className="text-xs text-[var(--medos-gray-600)]">
                              {alert.detail}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-2xl font-bold",
                              getDaysColor(alert.daysRemaining)
                            )}
                          >
                            {alert.daysRemaining}
                          </p>
                          <p className="text-[10px] text-[var(--medos-gray-500)]">days remaining</p>
                        </div>
                      </div>

                      {/* Expiration Date */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Calendar className="w-3 h-3 text-[var(--medos-gray-400)]" />
                        <span className="text-xs text-[var(--medos-gray-600)]">
                          Expires: {alert.expirationDate}
                        </span>
                      </div>

                      {/* Renewal Checklist */}
                      <div className="mb-4">
                        <p className="text-[10px] font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider mb-2">
                          Renewal Requirements ({completedCount}/{alert.renewalChecklist.length})
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {alert.renewalChecklist.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center gap-2"
                            >
                              {item.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-[var(--medos-gray-300)] flex-shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "text-[10px]",
                                  item.completed
                                    ? "text-[var(--medos-gray-600)]"
                                    : "text-[var(--medos-gray-400)]"
                                )}
                              >
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[var(--medos-gray-200)]/30">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium bg-[var(--medos-primary)] text-white hover:opacity-90 transition-default">
                          <RefreshCw className="w-3 h-3" />
                          Start Renewal
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium bg-white text-[var(--medos-gray-600)] border border-[var(--medos-gray-200)] hover:bg-[var(--medos-gray-50)] transition-default">
                          <Send className="w-3 h-3" />
                          Send Reminder
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-default">
                          <CheckCircle2 className="w-3 h-3" />
                          Mark Complete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
      )}
    </div>
  );
}

// --- Main Export ---

export default function CredentialingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("licensing");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--medos-primary)] bg-opacity-10 flex items-center justify-center">
            <BadgeCheck className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--medos-navy)]">Credentialing Center</h1>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Multi-state licensing & CAQH management — 21 states, 142 providers
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
      {activeTab === "licensing" && <LicensingTab />}
      {activeTab === "caqh" && <CAQHTab />}
      {activeTab === "alerts" && <AlertsTab />}
    </div>
  );
}
