"use client";

import { useState } from "react";
import { Settings, User, Building2, Shield, Bell, Palette, Database, CheckCircle2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();

  // Form state - Profile
  const [name, setName] = useState("Dr. Justin");
  const [email, setEmail] = useState("justin@medos.ai");
  const [npi, setNpi] = useState("1234567890");
  const [specialty, setSpecialty] = useState("Internal Medicine");

  // Form state - Practice
  const [practiceName, setPracticeName] = useState("Sunshine Medical Group");
  const [address, setAddress] = useState("1200 Brickell Ave, Miami, FL 33131");
  const [phone, setPhone] = useState("(305) 555-0100");
  const [taxId, setTaxId] = useState("XX-XXXXXXX");

  // Toggle state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [aiAutoCoding, setAiAutoCoding] = useState(true);
  const [fhirDataSharing, setFhirDataSharing] = useState(true);

  // Save feedback
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const profileFields = [
    { label: "Full Name", value: name, onChange: (v: string) => setName(v), placeholder: "Dr. Di Reze" },
    { label: "Email", value: email, onChange: (v: string) => setEmail(v), placeholder: "dr.direze@sunshinemedical.com" },
    { label: "NPI Number", value: npi, onChange: (v: string) => setNpi(v), placeholder: "1234567890" },
    { label: "Specialty", value: specialty, onChange: (v: string) => setSpecialty(v), placeholder: "Internal Medicine" },
  ];

  const practiceFields = [
    { label: "Practice Name", value: practiceName, onChange: (v: string) => setPracticeName(v), placeholder: "Sunshine Medical Group" },
    { label: "Address", value: address, onChange: (v: string) => setAddress(v), placeholder: "1200 Brickell Ave, Miami, FL 33131" },
    { label: "Phone", value: phone, onChange: (v: string) => setPhone(v), placeholder: "(305) 555-0100" },
    { label: "Tax ID", value: taxId, onChange: (v: string) => setTaxId(v), placeholder: "XX-XXXXXXX" },
  ];

  const sections = [
    {
      icon: User,
      title: "Profile",
      description: "Manage your personal information and credentials",
      fields: profileFields,
    },
    {
      icon: Building2,
      title: "Practice",
      description: "Configure your practice settings",
      fields: practiceFields,
    },
  ];

  const toggles = [
    {
      icon: Bell,
      label: "Email Notifications",
      desc: "Receive alerts for appointments and claims updates",
      value: emailNotifications,
      toggle: () => setEmailNotifications(!emailNotifications),
    },
    {
      icon: Shield,
      label: "Two-Factor Authentication",
      desc: "Add an extra layer of security to your account",
      value: twoFactor,
      toggle: () => setTwoFactor(!twoFactor),
    },
    {
      icon: Palette,
      label: "AI Auto-Coding",
      desc: "Automatically suggest ICD-10 and CPT codes during encounters",
      value: aiAutoCoding,
      toggle: () => setAiAutoCoding(!aiAutoCoding),
    },
    {
      icon: Database,
      label: "FHIR Data Sharing",
      desc: "Enable interoperability with connected EHR systems",
      value: fhirDataSharing,
      toggle: () => setFhirDataSharing(!fhirDataSharing),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Save confirmation banner */}
      {saved && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Settings saved successfully
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Settings className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Settings</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Manage your account and practice configuration
          </p>
        </div>
      </div>

      {/* Settings sections */}
      {sections.map((section) => (
        <div
          key={section.title}
          className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--medos-gray-100)] flex items-center gap-3">
            <section.icon className="w-5 h-5 text-[var(--medos-gray-400)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--medos-navy)]">
                {section.title}
              </h2>
              <p className="text-xs text-[var(--medos-gray-500)]">
                {section.description}
              </p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((field) => (
              <div key={field.label}>
                <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-900)] placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Quick settings toggles */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--medos-gray-100)] flex items-center gap-3">
          <Bell className="w-5 h-5 text-[var(--medos-gray-400)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--medos-navy)]">
              Preferences
            </h2>
            <p className="text-xs text-[var(--medos-gray-500)]">
              Notifications and display settings
            </p>
          </div>
        </div>
        <div className="divide-y divide-[var(--medos-gray-100)]">
          {toggles.map((pref) => (
            <div key={pref.label} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <pref.icon className="w-4 h-4 text-[var(--medos-gray-400)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--medos-gray-900)]">
                    {pref.label}
                  </p>
                  <p className="text-xs text-[var(--medos-gray-500)]">{pref.desc}</p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={pref.value}
                onClick={pref.toggle}
                className={`relative w-10 h-6 rounded-full transition-all ${
                  pref.value
                    ? "bg-[var(--medos-primary)]"
                    : "bg-[var(--medos-gray-300)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                    pref.value ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
