"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  User,
  MapPin,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Location {
  name: string;
  address: string;
  phone: string;
}

interface Provider {
  name: string;
  npi: string;
  specialty: string;
}

const STEPS = [
  { label: "Organization", icon: Building2 },
  { label: "Admin Account", icon: User },
  { label: "Practice Setup", icon: MapPin },
  { label: "Payer Config", icon: CreditCard },
];

const ORG_TYPES = [
  { value: "solo_practice", label: "Solo Practice" },
  { value: "group_practice", label: "Group Practice" },
  { value: "hospital", label: "Hospital" },
];

const SPECIALTIES = [
  "Orthopedics",
  "Dermatology",
  "Cardiology",
  "General Practice",
  "Internal Medicine",
  "Pediatrics",
  "Neurology",
  "Oncology",
  "Psychiatry",
  "Ophthalmology",
];

const PAYER_OPTIONS = [
  { code: "BCBS", label: "Blue Cross Blue Shield" },
  { code: "Aetna", label: "Aetna" },
  { code: "Medicare", label: "Medicare" },
  { code: "Medicaid", label: "Medicaid" },
  { code: "Humana", label: "Humana" },
  { code: "Cigna", label: "Cigna" },
  { code: "UnitedHealthcare", label: "UnitedHealthcare" },
  { code: "TriCare", label: "TRICARE" },
  { code: "Molina", label: "Molina Healthcare" },
  { code: "Centene", label: "Centene / Ambetter" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [tenantId, setTenantId] = useState("");

  // Step 1 - Organization
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("group_practice");
  const [specialty, setSpecialty] = useState("Orthopedics");
  const [state, setState] = useState("FL");
  const [city, setCity] = useState("");

  // Step 2 - Admin
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Step 3 - Locations & Providers
  const [locations, setLocations] = useState<Location[]>([
    { name: "", address: "", phone: "" },
  ]);
  const [providers, setProviders] = useState<Provider[]>([
    { name: "", npi: "", specialty: "Orthopedics" },
  ]);

  // Step 4 - Payers
  const [selectedPayers, setSelectedPayers] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const addLocation = () =>
    setLocations([...locations, { name: "", address: "", phone: "" }]);

  const removeLocation = (i: number) =>
    setLocations(locations.filter((_, idx) => idx !== i));

  const updateLocation = (i: number, field: keyof Location, value: string) => {
    const updated = [...locations];
    updated[i] = { ...updated[i], [field]: value };
    setLocations(updated);
  };

  const addProvider = () =>
    setProviders([...providers, { name: "", npi: "", specialty: "Orthopedics" }]);

  const removeProvider = (i: number) =>
    setProviders(providers.filter((_, idx) => idx !== i));

  const updateProvider = (i: number, field: keyof Provider, value: string) => {
    const updated = [...providers];
    updated[i] = { ...updated[i], [field]: value };
    setProviders(updated);
  };

  const togglePayer = (code: string) => {
    setSelectedPayers((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleComplete = () => {
    // Mock API response
    const id = `tn-${Math.random().toString(16).slice(2, 10)}`;
    setTenantId(id);
    setCompleted(true);
  };

  // ---------------------------------------------------------------------------
  // Shared input class
  // ---------------------------------------------------------------------------

  const inputCls =
    "w-full h-10 px-3.5 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-900)] placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent";

  const selectCls =
    "w-full h-10 px-3 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent";

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------

  if (completed) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-8 text-center space-y-6">
          {/* Animated success icon */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-20" />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
              <Check className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
              Practice Created Successfully!
            </h1>
            <p className="mt-2 text-sm text-[var(--medos-gray-500)]">
              Tenant ID: <span className="font-mono font-semibold text-[var(--medos-primary)]">{tenantId}</span>
            </p>
          </div>

          {/* Sparkle decorations */}
          <div className="flex justify-center gap-3 py-2">
            {[...Array(5)].map((_, i) => (
              <Sparkles
                key={i}
                className="w-5 h-5 text-[var(--medos-primary)] opacity-60"
                style={{
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="bg-[var(--medos-gray-50)] rounded-lg p-4 text-left space-y-2">
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Setup Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[var(--medos-gray-500)]">Organization</span>
              <span className="text-[var(--medos-gray-900)] font-medium">{orgName}</span>
              <span className="text-[var(--medos-gray-500)]">Specialty</span>
              <span className="text-[var(--medos-gray-900)] font-medium">{specialty}</span>
              <span className="text-[var(--medos-gray-500)]">Locations</span>
              <span className="text-[var(--medos-gray-900)] font-medium">{locations.filter(l => l.name).length}</span>
              <span className="text-[var(--medos-gray-500)]">Providers</span>
              <span className="text-[var(--medos-gray-900)] font-medium">{providers.filter(p => p.name).length}</span>
              <span className="text-[var(--medos-gray-500)]">Payers</span>
              <span className="text-[var(--medos-gray-900)] font-medium">{selectedPayers.length}</span>
            </div>
          </div>

          {/* Next steps */}
          <div className="bg-blue-50 rounded-lg p-4 text-left space-y-2">
            <h3 className="text-sm font-semibold text-blue-900">Next Steps</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Import patient demographics</li>
              <li>Configure fee schedules</li>
              <li>Set up EHR integration</li>
            </ol>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all"
          >
            Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step content
  // ---------------------------------------------------------------------------

  const stepContent = [
    // Step 0: Organization Info
    <div key="org" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
          Organization Name *
        </label>
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Sunshine Medical Group"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
            Organization Type *
          </label>
          <select value={orgType} onChange={(e) => setOrgType(e.target.value)} className={selectCls}>
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
            Specialty *
          </label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={selectCls}>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
            State *
          </label>
          <select value={state} onChange={(e) => setState(e.target.value)} className={selectCls}>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
            City *
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Miami"
            className={inputCls}
          />
        </div>
      </div>
    </div>,

    // Step 1: Admin Account
    <div key="admin" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
          Admin Name *
        </label>
        <input
          type="text"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          placeholder="Dr. Maria Lopez"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
          Admin Email *
        </label>
        <input
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="admin@practice.com"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
          Role
        </label>
        <input
          type="text"
          value="Admin"
          disabled
          className={`${inputCls} bg-[var(--medos-gray-50)] text-[var(--medos-gray-500)] cursor-not-allowed`}
        />
      </div>
    </div>,

    // Step 2: Practice Setup (Locations + Providers)
    <div key="practice" className="space-y-6">
      {/* Locations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Locations</h3>
          <button
            onClick={addLocation}
            className="flex items-center gap-1 text-xs font-medium text-[var(--medos-primary)] hover:text-[var(--medos-primary-hover)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Location
          </button>
        </div>
        <div className="space-y-3">
          {locations.map((loc, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_1fr_auto] gap-2 items-end"
            >
              <input
                type="text"
                value={loc.name}
                onChange={(e) => updateLocation(i, "name", e.target.value)}
                placeholder="Office name"
                className={inputCls}
              />
              <input
                type="text"
                value={loc.address}
                onChange={(e) => updateLocation(i, "address", e.target.value)}
                placeholder="Address"
                className={inputCls}
              />
              <input
                type="text"
                value={loc.phone}
                onChange={(e) => updateLocation(i, "phone", e.target.value)}
                placeholder="Phone"
                className={inputCls}
              />
              {locations.length > 1 && (
                <button
                  onClick={() => removeLocation(i)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-[var(--medos-gray-400)] hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Providers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Providers</h3>
          <button
            onClick={addProvider}
            className="flex items-center gap-1 text-xs font-medium text-[var(--medos-primary)] hover:text-[var(--medos-primary-hover)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Provider
          </button>
        </div>
        <div className="space-y-3">
          {providers.map((prov, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
            >
              <input
                type="text"
                value={prov.name}
                onChange={(e) => updateProvider(i, "name", e.target.value)}
                placeholder="Provider name"
                className={inputCls}
              />
              <input
                type="text"
                value={prov.npi}
                onChange={(e) => updateProvider(i, "npi", e.target.value)}
                placeholder="NPI number"
                className={inputCls}
              />
              <select
                value={prov.specialty}
                onChange={(e) => updateProvider(i, "specialty", e.target.value)}
                className={selectCls}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {providers.length > 1 && (
                <button
                  onClick={() => removeProvider(i)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-[var(--medos-gray-400)] hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,

    // Step 3: Payer Configuration
    <div key="payers" className="space-y-3">
      <p className="text-sm text-[var(--medos-gray-500)]">
        Select the insurance payers your practice works with.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PAYER_OPTIONS.map((payer) => {
          const selected = selectedPayers.includes(payer.code);
          return (
            <button
              key={payer.code}
              onClick={() => togglePayer(payer.code)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left text-sm transition-all ${
                selected
                  ? "border-[var(--medos-primary)] bg-[var(--medos-primary-light)] text-[var(--medos-primary)] font-medium"
                  : "border-[var(--medos-gray-200)] bg-white text-[var(--medos-gray-700)] hover:border-[var(--medos-gray-300)]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  selected
                    ? "bg-[var(--medos-primary)] text-white"
                    : "border border-[var(--medos-gray-300)]"
                }`}
              >
                {selected && <Check className="w-3.5 h-3.5" />}
              </div>
              <div>
                <span className="block">{payer.label}</span>
                <span className="block text-xs text-[var(--medos-gray-400)]">{payer.code}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>,
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)] transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Building2 className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
            Practice Onboarding
          </h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Set up a new practice in MedOS
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full ${
                i === step
                  ? "bg-[var(--medos-primary)] text-white"
                  : i < step
                  ? "bg-[var(--medos-primary-light)] text-[var(--medos-primary)] cursor-pointer"
                  : "bg-[var(--medos-gray-100)] text-[var(--medos-gray-400)]"
              }`}
            >
              <s.icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`w-4 h-0.5 flex-shrink-0 ${
                  i < step ? "bg-[var(--medos-primary)]" : "bg-[var(--medos-gray-200)]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content card */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">
            Step {step + 1}: {STEPS[step].label}
          </h2>
        </div>
        <div className="p-6">{stepContent[step]}</div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            step === 0
              ? "text-[var(--medos-gray-300)] cursor-not-allowed"
              : "text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-100)]"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all"
          >
            <Check className="w-4 h-4" />
            Complete Setup
          </button>
        )}
      </div>
    </div>
  );
}
