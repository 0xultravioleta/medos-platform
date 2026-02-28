"use client";

import { Settings, User, Building2, Shield, Bell, Palette, Database } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const SETTINGS_SECTIONS = [
  {
    icon: User,
    title: "Profile",
    description: "Manage your personal information and credentials",
    fields: [
      { label: "Full Name", value: "", placeholder: "Dr. Di Reze" },
      { label: "Email", value: "", placeholder: "dr.direze@sunshinemedical.com" },
      { label: "NPI Number", value: "", placeholder: "1234567890" },
      { label: "Specialty", value: "", placeholder: "Internal Medicine" },
    ],
  },
  {
    icon: Building2,
    title: "Practice",
    description: "Configure your practice settings",
    fields: [
      { label: "Practice Name", value: "", placeholder: "Sunshine Medical Group" },
      { label: "Address", value: "", placeholder: "1200 Brickell Ave, Miami, FL 33131" },
      { label: "Phone", value: "", placeholder: "(305) 555-0100" },
      { label: "Tax ID", value: "", placeholder: "XX-XXXXXXX" },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
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
      {SETTINGS_SECTIONS.map((section) => (
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
                  defaultValue={
                    field.label === "Full Name"
                      ? user?.name || ""
                      : field.label === "Email"
                        ? user?.email || ""
                        : ""
                  }
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
          {[
            {
              icon: Bell,
              label: "Email Notifications",
              desc: "Receive alerts for appointments and claims updates",
              defaultOn: true,
            },
            {
              icon: Shield,
              label: "Two-Factor Authentication",
              desc: "Add an extra layer of security to your account",
              defaultOn: false,
            },
            {
              icon: Palette,
              label: "AI Auto-Coding",
              desc: "Automatically suggest ICD-10 and CPT codes during encounters",
              defaultOn: true,
            },
            {
              icon: Database,
              label: "FHIR Data Sharing",
              desc: "Enable interoperability with connected EHR systems",
              defaultOn: true,
            },
          ].map((pref) => (
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
                className={`relative w-10 h-6 rounded-full transition-default ${
                  pref.defaultOn
                    ? "bg-[var(--medos-primary)]"
                    : "bg-[var(--medos-gray-300)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    pref.defaultOn ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button className="px-6 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
          Save Changes
        </button>
      </div>
    </div>
  );
}
