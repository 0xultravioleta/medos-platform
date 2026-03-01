"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ToggleLeft,
  Stethoscope,
  DollarSign,
  Layers,
  Wrench,
  AlertOctagon,
  Building2,
  Clock,
  User,
  ShieldAlert,
} from "lucide-react";

// --- Types ---

type FlagScope = "global" | "per-tenant";

interface TenantOverride {
  slug: string;
  value: boolean | string;
}

interface FeatureFlag {
  key: string;
  enabled: boolean | string;
  description: string;
  scope: FlagScope;
  overrides: TenantOverride[];
  lastChanged: string;
  changedBy: string;
  critical?: boolean;
}

interface FlagSection {
  title: string;
  icon: typeof Stethoscope;
  iconBg: string;
  iconColor: string;
  flags: FeatureFlag[];
}

// --- Mock Data ---

const INITIAL_SECTIONS: FlagSection[] = [
  {
    title: "Clinical",
    icon: Stethoscope,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    flags: [
      {
        key: "ai_scribe_enabled",
        enabled: true,
        description: "Enable AI-powered clinical scribe for encounter documentation",
        scope: "per-tenant",
        overrides: [
          { slug: "sunshine", value: true },
          { slug: "palm-beach", value: true },
          { slug: "miami", value: false },
        ],
        lastChanged: "2026-02-28 14:30",
        changedBy: "admin@medos.health",
      },
      {
        key: "ai_coding_suggestions",
        enabled: true,
        description: "AI-generated ICD-10 and CPT code suggestions during documentation",
        scope: "per-tenant",
        overrides: [
          { slug: "sunshine", value: true },
          { slug: "palm-beach", value: true },
          { slug: "miami", value: true },
        ],
        lastChanged: "2026-02-25 10:15",
        changedBy: "admin@medos.health",
      },
      {
        key: "ai_coding_auto_approve",
        enabled: false,
        description: "Auto-approve AI-suggested codes without human review (requires confidence >= 0.95)",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-20 09:00",
        changedBy: "admin@medos.health",
      },
      {
        key: "whisper_v3_gpu",
        enabled: true,
        description: "Use Whisper v3 GPU-accelerated transcription for ambient capture",
        scope: "global",
        overrides: [],
        lastChanged: "2026-02-18 16:45",
        changedBy: "devops@medos.health",
      },
      {
        key: "clinical_decision_support",
        enabled: false,
        description: "Real-time clinical decision support alerts during encounters",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-15 11:30",
        changedBy: "admin@medos.health",
      },
      {
        key: "ambient_capture_mode",
        enabled: "manual",
        description: "Ambient audio capture mode: manual (button press), auto (voice-activated), or continuous",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-22 08:00",
        changedBy: "admin@medos.health",
      },
    ],
  },
  {
    title: "Revenue Cycle",
    icon: DollarSign,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    flags: [
      {
        key: "auto_eligibility_check",
        enabled: true,
        description: "Automatic patient eligibility verification (270/271) before appointments",
        scope: "per-tenant",
        overrides: [
          { slug: "sunshine", value: true },
          { slug: "palm-beach", value: true },
          { slug: "miami", value: true },
        ],
        lastChanged: "2026-02-27 13:20",
        changedBy: "admin@medos.health",
      },
      {
        key: "claims_auto_submit",
        enabled: false,
        description: "Automatically submit claims after scrubbing passes without human review",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-20 10:00",
        changedBy: "admin@medos.health",
      },
      {
        key: "denial_auto_appeal",
        enabled: false,
        description: "Auto-generate and submit appeal letters for denied claims",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-18 15:30",
        changedBy: "admin@medos.health",
      },
      {
        key: "underpayment_detection",
        enabled: true,
        description: "Detect underpayments by comparing ERA amounts against fee schedules",
        scope: "per-tenant",
        overrides: [
          { slug: "sunshine", value: true },
          { slug: "palm-beach", value: true },
        ],
        lastChanged: "2026-02-25 09:45",
        changedBy: "admin@medos.health",
      },
      {
        key: "x12_835_auto_post",
        enabled: false,
        description: "Automatically post ERA (835) payments without manual review",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-22 14:00",
        changedBy: "admin@medos.health",
      },
    ],
  },
  {
    title: "Platform",
    icon: Layers,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    flags: [
      {
        key: "device_integration",
        enabled: true,
        description: "Enable wearable device integration (Oura Ring, Apple Watch, Dexcom CGM)",
        scope: "per-tenant",
        overrides: [
          { slug: "sunshine", value: true },
          { slug: "palm-beach", value: true },
        ],
        lastChanged: "2026-02-28 11:00",
        changedBy: "admin@medos.health",
      },
      {
        key: "context_rehydration",
        enabled: true,
        description: "System-wide context rehydration with tiered cache invalidation",
        scope: "global",
        overrides: [],
        lastChanged: "2026-02-26 16:00",
        changedBy: "devops@medos.health",
      },
      {
        key: "a2a_protocol",
        enabled: false,
        description: "Agent-to-Agent communication protocol for inter-department coordination",
        scope: "global",
        overrides: [],
        lastChanged: "2026-02-28 09:30",
        changedBy: "devops@medos.health",
      },
      {
        key: "third_party_mcp_apps",
        enabled: false,
        description: "Allow third-party MCP server integrations through the gateway",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-15 10:00",
        changedBy: "admin@medos.health",
      },
      {
        key: "patient_portal",
        enabled: false,
        description: "Patient-facing portal for appointment booking, records access, and messaging",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-12 14:30",
        changedBy: "admin@medos.health",
      },
      {
        key: "telehealth",
        enabled: false,
        description: "Built-in telehealth video visits with ambient AI documentation",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-10 09:00",
        changedBy: "admin@medos.health",
      },
      {
        key: "bulk_fhir_export",
        enabled: false,
        description: "FHIR Bulk Data Access ($export) for population health and reporting",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-14 11:15",
        changedBy: "devops@medos.health",
      },
    ],
  },
  {
    title: "Operational",
    icon: Wrench,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    flags: [
      {
        key: "maintenance_mode",
        enabled: false,
        description: "Put the entire platform in maintenance mode. All API requests return 503.",
        scope: "global",
        overrides: [],
        lastChanged: "2026-02-01 02:00",
        changedBy: "devops@medos.health",
        critical: true,
      },
      {
        key: "read_only_mode",
        enabled: false,
        description: "Disable all write operations. Read operations continue normally.",
        scope: "global",
        overrides: [],
        lastChanged: "2026-02-01 02:00",
        changedBy: "devops@medos.health",
        critical: true,
      },
      {
        key: "enhanced_logging",
        enabled: false,
        description: "Enable verbose logging for all API requests and agent executions",
        scope: "global",
        overrides: [],
        lastChanged: "2026-02-27 08:00",
        changedBy: "devops@medos.health",
      },
      {
        key: "synthetic_data_mode",
        enabled: false,
        description: "Use synthetic patient data instead of real PHI for demos and testing",
        scope: "per-tenant",
        overrides: [],
        lastChanged: "2026-02-25 15:00",
        changedBy: "admin@medos.health",
      },
    ],
  },
];

// --- Helpers ---

function ToggleSwitch({
  checked,
  onChange,
  critical,
  isString,
}: {
  checked: boolean;
  onChange: () => void;
  critical?: boolean;
  isString?: boolean;
}) {
  if (isString) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)] text-xs font-mono font-medium">
        mode
      </span>
    );
  }

  return (
    <button
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        checked
          ? critical
            ? "bg-red-500 focus:ring-red-400"
            : "bg-[var(--medos-primary)] focus:ring-[var(--medos-primary)]"
          : "bg-[var(--medos-gray-300)] focus:ring-[var(--medos-gray-400)]"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

// --- Main Page ---

export default function FeatureFlagsPage() {
  const [sections, setSections] = useState(INITIAL_SECTIONS);

  const toggleFlag = (sectionIdx: number, flagIdx: number) => {
    setSections((prev) =>
      prev.map((section, si) => {
        if (si !== sectionIdx) return section;
        return {
          ...section,
          flags: section.flags.map((flag, fi) => {
            if (fi !== flagIdx) return flag;
            if (typeof flag.enabled === "string") return flag;
            return { ...flag, enabled: !flag.enabled };
          }),
        };
      })
    );
  };

  const totalFlags = sections.reduce((s, sec) => s + sec.flags.length, 0);
  const enabledFlags = sections.reduce(
    (s, sec) => s + sec.flags.filter((f) => f.enabled === true).length,
    0
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <ToggleLeft className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Feature Flags</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            {enabledFlags} of {totalFlags} flags enabled &middot; Control feature rollout across tenants
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section, sectionIdx) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--medos-gray-100)]">
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", section.iconBg)}>
                  <SectionIcon className={cn("w-4 h-4", section.iconColor)} />
                </div>
                <h2 className="text-sm font-semibold text-[var(--medos-navy)]">{section.title}</h2>
                <span className="text-xs text-[var(--medos-gray-500)]">
                  {section.flags.filter((f) => f.enabled === true).length} / {section.flags.length} enabled
                </span>
              </div>

              {/* Flag rows */}
              <div className="divide-y divide-[var(--medos-gray-100)]">
                {section.flags.map((flag, flagIdx) => {
                  const isBooleanFlag = typeof flag.enabled === "boolean";
                  const isEnabled = flag.enabled === true;
                  const isCritical = flag.critical;

                  return (
                    <div
                      key={flag.key}
                      className={cn(
                        "flex items-start gap-4 px-6 py-4 transition-all",
                        isCritical && isEnabled && "bg-red-50/50",
                        isCritical && !isEnabled && "hover:bg-[var(--medos-gray-50)]",
                        !isCritical && "hover:bg-[var(--medos-gray-50)]"
                      )}
                    >
                      {/* Toggle */}
                      <div className="flex-shrink-0 pt-0.5">
                        <ToggleSwitch
                          checked={isEnabled}
                          onChange={() => toggleFlag(sectionIdx, flagIdx)}
                          critical={isCritical}
                          isString={!isBooleanFlag}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono font-semibold text-[var(--medos-navy)]">{flag.key}</span>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                            flag.scope === "global"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-blue-50 text-blue-700"
                          )}>
                            {flag.scope === "global" ? "Global" : "Per-tenant"}
                          </span>
                          {isCritical && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              Critical
                            </span>
                          )}
                          {!isBooleanFlag && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--medos-gray-100)] text-[var(--medos-gray-600)]">
                              {String(flag.enabled)}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--medos-gray-500)] mb-2 leading-relaxed">{flag.description}</p>

                        {/* Overrides */}
                        {flag.overrides.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-medium text-[var(--medos-gray-400)] uppercase tracking-wider">Overrides:</span>
                            {flag.overrides.map((ov) => (
                              <span
                                key={ov.slug}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                  ov.value === true || ov.value === "true"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                )}
                              >
                                <Building2 className="w-2.5 h-2.5" />
                                {ov.slug}={String(ov.value)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-[10px] text-[var(--medos-gray-400)]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{flag.lastChanged}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            <span>{flag.changedBy}</span>
                          </div>
                        </div>
                      </div>

                      {/* Emergency kill */}
                      {isCritical && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => {
                              if (!isEnabled) toggleFlag(sectionIdx, flagIdx);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                              isEnabled
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "border border-red-300 text-red-700 hover:bg-red-50"
                            )}
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            {isEnabled ? "Kill Switch" : "Emergency Enable"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
