"use client";

import { useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  Key,
  Layers,
  Lock,
  MapPin,
  Phone,
  Plus,
  Search,
  Shield,
  Upload,
  User,
  Users,
  Settings,
  Activity,
  Database,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type TabKey = "directory" | "onboarding" | "health";
type TenantStatus = "active" | "suspended" | "pending";
type PlanTier = "standard" | "premium";
type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;
type HealthStatus = "healthy" | "degraded" | "critical";

interface Tenant {
  id: string;
  name: string;
  specialty: string;
  plan: PlanTier;
  status: TenantStatus;
  providers: number;
  patients: number;
  createdAt: string;
  npi: string;
  taxId: string;
  kmsKeyStatus: string;
  schemaName: string;
  businessHours: string;
  timezone: string;
}

interface TenantHealth {
  tenantId: string;
  name: string;
  errorRate: number;
  p99Latency: number;
  fhirResources: number;
  dailyActiveUsers: number;
  storageUsed: string;
  status: HealthStatus;
}

// --- Constants ---

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "directory", label: "Directory", icon: Building2 },
  { key: "onboarding", label: "Onboarding", icon: Plus },
  { key: "health", label: "Health", icon: Heart },
];

const PLAN_STYLES: Record<PlanTier, { bg: string; text: string; border: string }> = {
  standard: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  premium: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

const STATUS_STYLES: Record<TenantStatus, { bg: string; text: string; border: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Active" },
  suspended: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Suspended" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending" },
};

const HEALTH_STYLES: Record<HealthStatus, { dot: string; label: string; text: string }> = {
  healthy: { dot: "bg-emerald-400", label: "Healthy", text: "text-emerald-700" },
  degraded: { dot: "bg-amber-400", label: "Degraded", text: "text-amber-700" },
  critical: { dot: "bg-red-400", label: "Critical", text: "text-red-700" },
};

// --- Mock Data ---

const TENANTS: Tenant[] = [
  {
    id: "TNT-001",
    name: "Sunshine Orthopedics",
    specialty: "Orthopedics",
    plan: "standard",
    status: "active",
    providers: 8,
    patients: 2340,
    createdAt: "2026-01-15",
    npi: "1234567890",
    taxId: "XX-XXX7890",
    kmsKeyStatus: "Active (auto-rotation enabled)",
    schemaName: "tenant_sunshine_ortho",
    businessHours: "Mon-Fri 8:00 AM - 5:00 PM",
    timezone: "America/New_York",
  },
  {
    id: "TNT-002",
    name: "Palm Beach Dermatology",
    specialty: "Dermatology",
    plan: "premium",
    status: "active",
    providers: 5,
    patients: 1847,
    createdAt: "2026-02-01",
    npi: "2345678901",
    taxId: "XX-XXX8901",
    kmsKeyStatus: "Active (auto-rotation enabled)",
    schemaName: "tenant_palm_beach_derm",
    businessHours: "Mon-Sat 7:30 AM - 6:00 PM",
    timezone: "America/New_York",
  },
  {
    id: "TNT-003",
    name: "Miami Spine Center",
    specialty: "Pain Management",
    plan: "standard",
    status: "active",
    providers: 3,
    patients: 892,
    createdAt: "2026-02-20",
    npi: "3456789012",
    taxId: "XX-XXX9012",
    kmsKeyStatus: "Active (auto-rotation enabled)",
    schemaName: "tenant_miami_spine",
    businessHours: "Mon-Fri 9:00 AM - 5:30 PM",
    timezone: "America/New_York",
  },
];

const TENANT_HEALTH_DATA: TenantHealth[] = [
  { tenantId: "TNT-001", name: "Sunshine Orthopedics", errorRate: 0.3, p99Latency: 812, fhirResources: 14520, dailyActiveUsers: 12, storageUsed: "1.8 GB", status: "healthy" },
  { tenantId: "TNT-002", name: "Palm Beach Dermatology", errorRate: 0.5, p99Latency: 934, fhirResources: 11230, dailyActiveUsers: 8, storageUsed: "1.4 GB", status: "healthy" },
  { tenantId: "TNT-003", name: "Miami Spine Center", errorRate: 0.2, p99Latency: 678, fhirResources: 4280, dailyActiveUsers: 3, storageUsed: "0.7 GB", status: "healthy" },
];

const ONBOARDING_STEPS = [
  { step: 1 as const, label: "Organization Info", icon: Building2, description: "Practice details, NPI, and address" },
  { step: 2 as const, label: "Admin User", icon: User, description: "First admin account setup" },
  { step: 3 as const, label: "Practice Config", icon: Settings, description: "Business hours, specialties, providers" },
  { step: 4 as const, label: "Payer Setup", icon: Shield, description: "Insurance payer connections" },
  { step: 5 as const, label: "Data Import", icon: Upload, description: "Migrate patient data (CSV/HL7v2)" },
  { step: 6 as const, label: "Confirmation", icon: Check, description: "Review and activate tenant" },
];

const SPECIALTIES = [
  "Orthopedics",
  "Dermatology",
  "Pain Management",
  "Cardiology",
  "Internal Medicine",
  "Family Medicine",
  "Neurology",
  "Rheumatology",
  "Ophthalmology",
  "ENT",
];

// --- Tab Content ---

function DirectoryTab() {
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filtered = search
    ? TENANTS.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.specialty.toLowerCase().includes(search.toLowerCase())
      )
    : TENANTS;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
        <input
          type="text"
          placeholder="Search tenants by name or specialty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)]"
        />
      </div>

      {/* Tenant Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="w-8 px-2" />
                {["Practice Name", "Specialty", "Plan Tier", "Status", "Providers", "Patients", "Created", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((tenant) => {
                const plan = PLAN_STYLES[tenant.plan];
                const status = STATUS_STYLES[tenant.status];
                const isExpanded = expandedRow === tenant.id;

                return (
                  <>
                    <tr
                      key={tenant.id}
                      onClick={() => setExpandedRow(isExpanded ? null : tenant.id)}
                      className="hover:bg-[var(--medos-gray-50)] transition-colors cursor-pointer"
                    >
                      <td className="px-2 text-[var(--medos-gray-400)]">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--medos-primary-light)]">
                            <Building2 className="w-4 h-4 text-[var(--medos-primary)]" />
                          </div>
                          <span className="text-xs font-semibold text-[var(--medos-gray-900)]">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--medos-gray-700)]">{tenant.specialty}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", plan.bg, plan.text, plan.border)}>
                          {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", status.bg, status.text, status.border)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[var(--medos-gray-700)] tabular-nums">{tenant.providers}</td>
                      <td className="px-4 py-3 text-xs font-medium text-[var(--medos-gray-700)] tabular-nums">{tenant.patients.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-[var(--medos-gray-600)]">{tenant.createdAt}</td>
                      <td className="px-4 py-3">
                        <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium bg-[var(--medos-primary-light)] text-[var(--medos-primary)] hover:bg-[var(--medos-primary)] hover:text-white transition-colors">
                          <Settings className="w-3 h-3" />
                          Manage
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${tenant.id}-detail`}>
                        <td colSpan={9} className="px-4 py-4 bg-[var(--medos-gray-50)]">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pl-10">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                                <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">NPI</span>
                              </div>
                              <p className="text-xs font-mono text-[var(--medos-gray-900)] pl-5">{tenant.npi}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                                <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">Tax ID</span>
                              </div>
                              <p className="text-xs font-mono text-[var(--medos-gray-900)] pl-5">{tenant.taxId}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Key className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                                <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">KMS Key</span>
                              </div>
                              <p className="text-xs text-emerald-600 pl-5">{tenant.kmsKeyStatus}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                                <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">Schema</span>
                              </div>
                              <p className="text-xs font-mono text-[var(--medos-gray-900)] pl-5">{tenant.schemaName}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                                <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">Business Hours</span>
                              </div>
                              <p className="text-xs text-[var(--medos-gray-900)] pl-5">{tenant.businessHours}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                                <span className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase">Timezone</span>
                              </div>
                              <p className="text-xs text-[var(--medos-gray-900)] pl-5">{tenant.timezone}</p>
                            </div>
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
        <div className="px-4 py-2.5 border-t border-[var(--medos-gray-100)] text-xs text-[var(--medos-gray-500)]">
          Showing {filtered.length} of {TENANTS.length} tenants
        </div>
      </div>
    </div>
  );
}

function OnboardingTab() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Plus className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">New Tenant Onboarding</h3>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between mb-8">
          {ONBOARDING_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.step;
            const isCompleted = currentStep > step.step;
            const isLocked = currentStep < step.step;

            return (
              <div key={step.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => !isLocked && setCurrentStep(step.step)}
                    disabled={isLocked}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                      isActive
                        ? "bg-[var(--medos-primary)] border-[var(--medos-primary)] text-white shadow-lg"
                        : isCompleted
                        ? "bg-emerald-100 border-emerald-400 text-emerald-600"
                        : "bg-[var(--medos-gray-100)] border-[var(--medos-gray-200)] text-[var(--medos-gray-400)]"
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </button>
                  <span className={cn(
                    "text-[10px] font-medium mt-2 text-center max-w-[80px]",
                    isActive ? "text-[var(--medos-primary)]" : isCompleted ? "text-emerald-600" : "text-[var(--medos-gray-400)]"
                  )}>
                    {step.label}
                  </span>
                </div>
                {idx < ONBOARDING_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-20px]",
                    isCompleted ? "bg-emerald-400" : "bg-[var(--medos-gray-200)]"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--medos-primary-light)]">
            <Building2 className="w-4 h-4 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Step 1: Organization Info</h3>
            <p className="text-[10px] text-[var(--medos-gray-500)]">Enter your practice details to get started</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Practice Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-700)] mb-1.5">
              Practice Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Sunshine Orthopedics"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)]"
            />
          </div>

          {/* NPI */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-700)] mb-1.5">
              NPI Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="10-digit NPI"
              maxLength={10}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)] font-mono"
            />
          </div>

          {/* Tax ID */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-700)] mb-1.5">
              Tax ID (EIN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="XX-XXXXXXX"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)] font-mono"
            />
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-700)] mb-1.5">
              Specialty <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none px-3 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] text-[var(--medos-gray-700)]"
              >
                <option value="">Select specialty...</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)] pointer-events-none" />
            </div>
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[var(--medos-gray-700)] mb-1.5">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--medos-gray-400)]" />
              <input
                type="text"
                placeholder="Street address, city, state, ZIP"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)]"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-700)] mb-1.5">
              Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-[var(--medos-gray-400)]" />
              <input
                type="tel"
                placeholder="(555) 123-4567"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)]"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-700)] mb-1.5">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 w-4 h-4 text-[var(--medos-gray-400)]" />
              <input
                type="url"
                placeholder="https://www.example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)]"
              />
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--medos-gray-100)]">
          <button
            disabled
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-400)] cursor-not-allowed"
          >
            Previous
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--medos-gray-400)]">Step 1 of 6</span>
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--medos-primary)] text-white hover:bg-[var(--medos-primary-hover)] transition-colors shadow-medos-sm"
            >
              Next: Admin User
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Steps Preview */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Upcoming Steps</h3>
        <div className="space-y-3">
          {ONBOARDING_STEPS.slice(1).map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.step} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--medos-gray-50)] border border-[var(--medos-gray-100)]">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--medos-gray-100)]">
                  <StepIcon className="w-4 h-4 text-[var(--medos-gray-400)]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-[var(--medos-gray-700)]">Step {step.step}: {step.label}</p>
                  <p className="text-[10px] text-[var(--medos-gray-500)]">{step.description}</p>
                </div>
                <Lock className="w-3.5 h-3.5 text-[var(--medos-gray-300)]" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HealthTab() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TENANT_HEALTH_DATA.map((t) => {
          const hs = HEALTH_STYLES[t.status];
          return (
            <div key={t.tenantId} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--medos-primary)]" />
                  <span className="text-sm font-semibold text-[var(--medos-gray-900)]">{t.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", hs.dot)} />
                  <span className={cn("text-[10px] font-medium", hs.text)}>{hs.label}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase">Error Rate</p>
                  <p className={cn("text-sm font-bold", t.errorRate < 0.5 ? "text-emerald-600" : "text-amber-600")}>{t.errorRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase">P99 Latency</p>
                  <p className={cn("text-sm font-bold", t.p99Latency < 1000 ? "text-emerald-600" : "text-amber-600")}>{t.p99Latency}ms</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase">Active Users</p>
                  <p className="text-sm font-bold text-[var(--medos-navy)]">{t.dailyActiveUsers}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--medos-gray-500)] uppercase">Storage</p>
                  <p className="text-sm font-bold text-[var(--medos-navy)]">{t.storageUsed}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Health Table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <Activity className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Per-Tenant Health Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                {["Status", "Tenant", "Error Rate", "P99 Latency", "FHIR Resources", "Daily Active Users", "Storage Used"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {TENANT_HEALTH_DATA.map((t) => {
                const hs = HEALTH_STYLES[t.status];
                return (
                  <tr key={t.tenantId} className="hover:bg-[var(--medos-gray-50)] transition-colors">
                    <td className="px-4 py-3">
                      <div className={cn("w-2.5 h-2.5 rounded-full", hs.dot)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[var(--medos-gray-400)]" />
                        <span className="text-xs font-semibold text-[var(--medos-gray-900)]">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold tabular-nums", t.errorRate < 0.5 ? "text-emerald-600" : "text-amber-600")}>
                          {t.errorRate}%
                        </span>
                        <div className="w-12 h-1.5 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", t.errorRate < 0.5 ? "bg-emerald-400" : "bg-amber-400")}
                            style={{ width: `${Math.min(t.errorRate * 20, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-bold tabular-nums", t.p99Latency < 1000 ? "text-emerald-600" : "text-amber-600")}>
                        {t.p99Latency}ms
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-gray-700)] tabular-nums">
                      {t.fhirResources.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-gray-700)] tabular-nums">
                      {t.dailyActiveUsers}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--medos-gray-700)]">
                      {t.storageUsed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resource Usage Bars */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">FHIR Resource Distribution</h3>
        </div>
        <div className="space-y-3">
          {TENANT_HEALTH_DATA.map((t) => {
            const maxResources = Math.max(...TENANT_HEALTH_DATA.map((x) => x.fhirResources));
            const pct = Math.round((t.fhirResources / maxResources) * 100);
            return (
              <div key={t.tenantId} className="flex items-center gap-3">
                <div className="w-44 flex-shrink-0">
                  <span className="text-xs font-medium text-[var(--medos-gray-700)]">{t.name}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-[var(--medos-gray-100)] rounded-md overflow-hidden">
                    <div
                      className="h-full bg-[var(--medos-primary)] rounded-md flex items-center px-2"
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{t.fhirResources.toLocaleString()}</span>
                    </div>
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

// --- Main Page ---

export default function AdminTenantsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("directory");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Building2 className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Tenant Management</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            {TENANTS.length} active practices -- Schema-per-tenant with KMS isolation
          </p>
        </div>
        <div className="ml-auto">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--medos-primary)] text-white hover:bg-[var(--medos-primary-hover)] transition-colors shadow-medos-sm">
            <Plus className="w-3.5 h-3.5" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Total Tenants</p>
          <p className="text-xl font-bold text-[var(--medos-navy)]">{TENANTS.length}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">{TENANTS.filter((t) => t.status === "active").length} active</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Total Providers</p>
          <p className="text-xl font-bold text-[var(--medos-navy)]">{TENANTS.reduce((s, t) => s + t.providers, 0)}</p>
          <p className="text-[10px] text-[var(--medos-gray-400)] mt-1">across all practices</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Total Patients</p>
          <p className="text-xl font-bold text-[var(--medos-navy)]">{TENANTS.reduce((s, t) => s + t.patients, 0).toLocaleString()}</p>
          <p className="text-[10px] text-[var(--medos-gray-400)] mt-1">FHIR Patient resources</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4">
          <p className="text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider mb-1">Avg Error Rate</p>
          <p className="text-xl font-bold text-emerald-600">
            {(TENANT_HEALTH_DATA.reduce((s, t) => s + t.errorRate, 0) / TENANT_HEALTH_DATA.length).toFixed(2)}%
          </p>
          <p className="text-[10px] text-emerald-500 font-medium mt-1">below 1% threshold</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[var(--medos-gray-100)] rounded-lg p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all",
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
      {activeTab === "directory" && <DirectoryTab />}
      {activeTab === "onboarding" && <OnboardingTab />}
      {activeTab === "health" && <HealthTab />}
    </div>
  );
}
