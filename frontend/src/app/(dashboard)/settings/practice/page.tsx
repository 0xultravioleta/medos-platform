"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  DollarSign,
  FileText,
  Search,
  Plus,
  Edit3,
  UserX,
  UserCheck,
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

// --- Types ---

type ProviderStatus = "active" | "inactive";

interface ProviderSchedule {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
}

interface Provider {
  id: string;
  name: string;
  npi: string;
  specialty: string;
  status: ProviderStatus;
  schedule: ProviderSchedule;
}

interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  hours: string;
}

interface FeeScheduleItem {
  cpt: string;
  description: string;
  standardCharge: number;
  medicareRate: number;
  contractedRates: Record<string, number>;
}

type PayerContractStatus = "active" | "expired" | "pending";

interface PayerContract {
  id: string;
  name: string;
  status: PayerContractStatus;
  timelyFilingDays: number;
  effectiveDate: string;
  expirationDate: string;
  paymentTerms: string;
}

// --- Mock Data ---

const MOCK_PROVIDERS: Provider[] = [
  {
    id: "PRV-001",
    name: "Dr. Sarah Mitchell",
    npi: "1234567890",
    specialty: "Orthopedic Surgery",
    status: "active",
    schedule: { mon: "8:00-17:00", tue: "8:00-17:00", wed: "8:00-12:00", thu: "8:00-17:00", fri: "8:00-15:00" },
  },
  {
    id: "PRV-002",
    name: "Dr. James Thornton",
    npi: "2345678901",
    specialty: "Sports Medicine",
    status: "active",
    schedule: { mon: "9:00-18:00", tue: "9:00-18:00", wed: "9:00-18:00", thu: "9:00-18:00", fri: "9:00-14:00" },
  },
  {
    id: "PRV-003",
    name: "Dr. Lisa Chen",
    npi: "3456789012",
    specialty: "Physical Medicine & Rehabilitation",
    status: "active",
    schedule: { mon: "7:30-16:00", tue: "7:30-16:00", wed: "7:30-16:00", thu: "7:30-16:00", fri: "7:30-12:00" },
  },
  {
    id: "PRV-004",
    name: "Dr. Robert Hayes",
    npi: "4567890123",
    specialty: "Orthopedic Surgery",
    status: "inactive",
    schedule: { mon: "-", tue: "-", wed: "-", thu: "-", fri: "-" },
  },
  {
    id: "PRV-005",
    name: "PA Michael Torres",
    npi: "5678901234",
    specialty: "Physician Assistant - Orthopedics",
    status: "active",
    schedule: { mon: "8:00-17:00", tue: "8:00-17:00", wed: "8:00-17:00", thu: "8:00-17:00", fri: "8:00-15:00" },
  },
];

const MOCK_LOCATIONS: Location[] = [
  {
    id: "LOC-001",
    name: "Sunshine Orthopedics - Main Campus",
    address: "1200 Brickell Ave, Suite 400, Miami, FL 33131",
    phone: "(305) 555-0100",
    fax: "(305) 555-0101",
    hours: "Mon-Fri 7:30 AM - 6:00 PM",
  },
  {
    id: "LOC-002",
    name: "Sunshine Orthopedics - Coral Gables",
    address: "2801 Ponce de Leon Blvd, Coral Gables, FL 33134",
    phone: "(305) 555-0200",
    fax: "(305) 555-0201",
    hours: "Mon-Fri 8:00 AM - 5:00 PM",
  },
  {
    id: "LOC-003",
    name: "Sunshine Orthopedics - Surgical Center",
    address: "900 NW 17th St, Miami, FL 33136",
    phone: "(305) 555-0300",
    fax: "(305) 555-0301",
    hours: "Mon-Fri 6:00 AM - 4:00 PM",
  },
];

const MOCK_FEE_SCHEDULE: FeeScheduleItem[] = [
  { cpt: "99213", description: "Office visit - established, low complexity", standardCharge: 150.00, medicareRate: 110.46, contractedRates: { "BCBS": 135.00, "Aetna": 130.00, "Cigna": 128.00 } },
  { cpt: "99214", description: "Office visit - established, moderate complexity", standardCharge: 220.00, medicareRate: 165.26, contractedRates: { "BCBS": 198.00, "Aetna": 190.00, "Cigna": 188.00 } },
  { cpt: "99215", description: "Office visit - established, high complexity", standardCharge: 325.00, medicareRate: 235.74, contractedRates: { "BCBS": 292.50, "Aetna": 280.00, "Cigna": 275.00 } },
  { cpt: "99203", description: "Office visit - new patient, low complexity", standardCharge: 200.00, medicareRate: 139.81, contractedRates: { "BCBS": 180.00, "Aetna": 175.00, "Cigna": 170.00 } },
  { cpt: "99204", description: "Office visit - new patient, moderate complexity", standardCharge: 310.00, medicareRate: 211.40, contractedRates: { "BCBS": 279.00, "Aetna": 268.00, "Cigna": 264.00 } },
  { cpt: "20610", description: "Arthrocentesis - major joint", standardCharge: 275.00, medicareRate: 112.14, contractedRates: { "BCBS": 220.00, "Aetna": 210.00, "Cigna": 205.00 } },
  { cpt: "20611", description: "Arthrocentesis - major joint with ultrasound", standardCharge: 350.00, medicareRate: 152.38, contractedRates: { "BCBS": 280.00, "Aetna": 270.00, "Cigna": 265.00 } },
  { cpt: "27447", description: "Total knee arthroplasty", standardCharge: 4500.00, medicareRate: 1523.80, contractedRates: { "BCBS": 3600.00, "Aetna": 3450.00, "Cigna": 3400.00 } },
  { cpt: "27130", description: "Total hip arthroplasty", standardCharge: 4800.00, medicareRate: 1612.50, contractedRates: { "BCBS": 3840.00, "Aetna": 3700.00, "Cigna": 3650.00 } },
  { cpt: "29881", description: "Arthroscopy - knee, with meniscectomy", standardCharge: 2200.00, medicareRate: 823.45, contractedRates: { "BCBS": 1760.00, "Aetna": 1700.00, "Cigna": 1680.00 } },
  { cpt: "29826", description: "Arthroscopy - shoulder, decompression", standardCharge: 2400.00, medicareRate: 912.30, contractedRates: { "BCBS": 1920.00, "Aetna": 1850.00, "Cigna": 1820.00 } },
  { cpt: "73721", description: "MRI lower extremity without contrast", standardCharge: 850.00, medicareRate: 246.80, contractedRates: { "BCBS": 680.00, "Aetna": 650.00, "Cigna": 640.00 } },
  { cpt: "73221", description: "MRI upper extremity without contrast", standardCharge: 825.00, medicareRate: 238.50, contractedRates: { "BCBS": 660.00, "Aetna": 635.00, "Cigna": 625.00 } },
  { cpt: "97110", description: "Therapeutic exercises - 15 min", standardCharge: 75.00, medicareRate: 33.56, contractedRates: { "BCBS": 60.00, "Aetna": 58.00, "Cigna": 56.00 } },
  { cpt: "97140", description: "Manual therapy - 15 min", standardCharge: 80.00, medicareRate: 35.92, contractedRates: { "BCBS": 64.00, "Aetna": 62.00, "Cigna": 60.00 } },
];

const MOCK_PAYER_CONTRACTS: PayerContract[] = [
  {
    id: "PAY-001",
    name: "Blue Cross Blue Shield of Florida",
    status: "active",
    timelyFilingDays: 365,
    effectiveDate: "Jan 1, 2025",
    expirationDate: "Dec 31, 2026",
    paymentTerms: "Net 30 - Electronic",
  },
  {
    id: "PAY-002",
    name: "Medicare Part B",
    status: "active",
    timelyFilingDays: 365,
    effectiveDate: "Jan 1, 2026",
    expirationDate: "Dec 31, 2026",
    paymentTerms: "Net 14 - Electronic",
  },
  {
    id: "PAY-003",
    name: "Aetna",
    status: "active",
    timelyFilingDays: 180,
    effectiveDate: "Mar 1, 2025",
    expirationDate: "Feb 28, 2027",
    paymentTerms: "Net 30 - Electronic",
  },
  {
    id: "PAY-004",
    name: "Cigna",
    status: "pending",
    timelyFilingDays: 90,
    effectiveDate: "Apr 1, 2026",
    expirationDate: "Mar 31, 2028",
    paymentTerms: "Net 30 - Pending",
  },
  {
    id: "PAY-005",
    name: "Humana Gold Plus",
    status: "expired",
    timelyFilingDays: 120,
    effectiveDate: "Jan 1, 2024",
    expirationDate: "Dec 31, 2025",
    paymentTerms: "Net 45 - Electronic",
  },
  {
    id: "PAY-006",
    name: "United Healthcare",
    status: "active",
    timelyFilingDays: 180,
    effectiveDate: "Jul 1, 2025",
    expirationDate: "Jun 30, 2027",
    paymentTerms: "Net 30 - Electronic",
  },
];

// --- Helpers ---

const TABS = [
  { key: "providers", label: "Providers", icon: Users },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "fees", label: "Fee Schedules", icon: DollarSign },
  { key: "payers", label: "Payer Contracts", icon: FileText },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const PAYER_STATUS_MAP: Record<PayerContractStatus, { label: string; style: string }> = {
  active: { label: "Active", style: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  expired: { label: "Expired", style: "bg-red-50 text-red-700 border border-red-200" },
  pending: { label: "Pending", style: "bg-amber-50 text-amber-700 border border-amber-200" },
};

const PROVIDER_STATUS_MAP: Record<ProviderStatus, { label: string; style: string; icon: typeof UserCheck }> = {
  active: { label: "Active", style: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: UserCheck },
  inactive: { label: "Inactive", style: "bg-red-50 text-red-700 border border-red-200", icon: UserX },
};

// --- Components ---

function ProvidersTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {MOCK_PROVIDERS.filter((p) => p.status === "active").length} active providers
        </p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Provider
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                NPI
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Specialty
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Schedule
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {MOCK_PROVIDERS.map((provider) => {
              const statusInfo = PROVIDER_STATUS_MAP[provider.status];
              const StatusIcon = statusInfo.icon;
              return (
                <tr key={provider.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[var(--medos-gray-900)]">{provider.name}</p>
                    <p className="text-xs text-[var(--medos-gray-500)]">{provider.id}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-[var(--medos-gray-700)]">{provider.npi}</td>
                  <td className="px-6 py-4 text-sm text-[var(--medos-gray-700)]">{provider.specialty}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                      <span className="text-xs text-[var(--medos-gray-600)]">
                        {provider.status === "active" ? `M-F ${provider.schedule.mon}` : "No schedule"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.style}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          provider.status === "active"
                            ? "border border-red-200 text-red-700 hover:bg-red-50"
                            : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {provider.status === "active" ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocationsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          {MOCK_LOCATIONS.length} locations configured
        </p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOCK_LOCATIONS.map((location) => (
          <div
            key={location.id}
            className="group bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:shadow-md hover:border-[var(--medos-primary)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--medos-primary-light)] text-[var(--medos-primary)] group-hover:bg-[var(--medos-primary)] group-hover:text-white transition-colors">
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">{location.name}</p>
                  <p className="text-xs text-[var(--medos-gray-500)]">{location.id}</p>
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-gray-300)] text-xs font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-all opacity-0 group-hover:opacity-100">
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>

            <div className="space-y-2 ml-12">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[var(--medos-gray-400)] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--medos-gray-700)]">{location.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[var(--medos-gray-400)] flex-shrink-0" />
                <p className="text-sm text-[var(--medos-gray-700)]">
                  {location.phone}
                  <span className="text-[var(--medos-gray-400)] mx-1.5">|</span>
                  <span className="text-[var(--medos-gray-500)]">Fax: {location.fax}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[var(--medos-gray-400)] flex-shrink-0" />
                <p className="text-sm text-[var(--medos-gray-700)]">{location.hours}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeeSchedulesTab() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return MOCK_FEE_SCHEDULE;
    return MOCK_FEE_SCHEDULE.filter(
      (f) =>
        f.cpt.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
          <input
            type="text"
            placeholder="Search by CPT code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
          />
        </div>
        <p className="text-sm text-[var(--medos-gray-500)] flex-shrink-0">
          {filtered.length} of {MOCK_FEE_SCHEDULE.length} codes
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  CPT Code
                </th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  Description
                </th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  Standard Charge
                </th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  Medicare Rate
                </th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  BCBS Rate
                </th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                  Aetna Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((item) => {
                const medicarePercent = ((item.medicareRate / item.standardCharge) * 100).toFixed(0);
                return (
                  <tr key={item.cpt} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-6 py-3 text-sm font-mono font-medium text-[var(--medos-primary)]">
                      {item.cpt}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)] max-w-xs">
                      {item.description}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-[var(--medos-gray-900)] text-right tabular-nums">
                      ${item.standardCharge.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div>
                        <p className="text-sm font-medium text-[var(--medos-gray-900)] tabular-nums">
                          ${item.medicareRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-[var(--medos-gray-500)]">{medicarePercent}% of standard</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)] text-right tabular-nums">
                      ${item.contractedRates["BCBS"]?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)] text-right tabular-nums">
                      ${item.contractedRates["Aetna"]?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "-"}
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

function PayerContractsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {MOCK_PAYER_CONTRACTS.filter((p) => p.status === "active").length} Active
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            {MOCK_PAYER_CONTRACTS.filter((p) => p.status === "pending").length} Pending
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            {MOCK_PAYER_CONTRACTS.filter((p) => p.status === "expired").length} Expired
          </span>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Plus className="w-4 h-4" />
          Add Payer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOCK_PAYER_CONTRACTS.map((payer) => {
          const statusInfo = PAYER_STATUS_MAP[payer.status];
          return (
            <div
              key={payer.id}
              className={`group bg-white rounded-xl border shadow-medos-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                payer.status === "expired"
                  ? "border-red-200 bg-red-50/30"
                  : payer.status === "pending"
                  ? "border-amber-200 bg-amber-50/20"
                  : "border-[var(--medos-gray-200)] hover:border-[var(--medos-primary)]"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">{payer.name}</p>
                  <p className="text-xs text-[var(--medos-gray-500)]">{payer.id}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.style}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                    Effective Date
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                    <p className="text-sm text-[var(--medos-gray-700)]">{payer.effectiveDate}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                    Expiration Date
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                    <p className={`text-sm ${payer.status === "expired" ? "text-red-700 font-medium" : "text-[var(--medos-gray-700)]"}`}>
                      {payer.expirationDate}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                    Timely Filing
                  </p>
                  <p className="text-sm font-semibold text-[var(--medos-navy)] mt-1">
                    {payer.timelyFilingDays} days
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">
                    Payment Terms
                  </p>
                  <p className="text-sm text-[var(--medos-gray-700)] mt-1">{payer.paymentTerms}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Page ---

export default function PracticeConfigPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("providers");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--medos-gray-200)] text-[var(--medos-gray-500)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-700)] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Building2 className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Practice Configuration</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Manage providers, locations, fee schedules, and payer contracts
          </p>
        </div>
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "providers" && <ProvidersTab />}
      {activeTab === "locations" && <LocationsTab />}
      {activeTab === "fees" && <FeeSchedulesTab />}
      {activeTab === "payers" && <PayerContractsTab />}
    </div>
  );
}
