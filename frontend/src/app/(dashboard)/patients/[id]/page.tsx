"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  Clock,
  Activity,
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  ClipboardCheck,
  Sparkles,
  PlayCircle,
  FilePlus,
  Send,
  User,
  Hash,
  Heart,
} from "lucide-react";
import { MOCK_PATIENTS, type MockPatient } from "@/lib/mock-data";
import { getPatient } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Badges                                                             */
/* ------------------------------------------------------------------ */

function RiskBadge({ risk }: { risk: MockPatient["riskScore"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize",
        risk === "low" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
        risk === "moderate" && "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
        risk === "high" && "bg-red-50 text-red-700 ring-1 ring-red-600/20"
      )}
    >
      <Activity className="h-3 w-3" />
      {risk} risk
    </span>
  );
}

function StatusBadge({ status }: { status: MockPatient["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize",
        status === "active" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
        status === "scheduled" && "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
        status === "discharged" && "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20"
      )}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Mock timeline data                                                 */
/* ------------------------------------------------------------------ */

interface TimelineEntry {
  date: string;
  description: string;
  icon: React.ReactNode;
  type: "visit" | "lab" | "medication" | "screening";
}

const TIMELINE: TimelineEntry[] = [
  {
    date: "2026-02-28",
    description:
      "Follow-up visit with Dr. Di Reze. AI-generated SOAP note.",
    icon: <Stethoscope className="h-4 w-4" />,
    type: "visit",
  },
  {
    date: "2026-02-20",
    description: "Lab results reviewed. HbA1c: 7.2%",
    icon: <FlaskConical className="h-4 w-4" />,
    type: "lab",
  },
  {
    date: "2026-02-10",
    description:
      "Medication adjustment: Metformin 1000mg \u2192 1500mg",
    icon: <Pill className="h-4 w-4" />,
    type: "medication",
  },
  {
    date: "2026-01-15",
    description:
      "Annual physical. All screenings up to date.",
    icon: <ClipboardCheck className="h-4 w-4" />,
    type: "screening",
  },
];

const typeColors: Record<TimelineEntry["type"], string> = {
  visit: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
  lab: "bg-purple-50 text-purple-600 ring-1 ring-purple-200",
  medication: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  screening: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
};

/* ------------------------------------------------------------------ */
/*  Mock SOAP note                                                     */
/* ------------------------------------------------------------------ */

const MOCK_SOAP_NOTE = `Subjective: Patient reports improved blood sugar control since medication adjustment.
Occasional headaches in the morning. Denies chest pain or shortness of breath.

Objective: BP 128/82, HR 76, Temp 98.4\u00b0F, SpO2 98%
HbA1c: 7.2% (down from 7.8%)

Assessment: Type 2 Diabetes - improving. Hypertension - controlled.

Plan: Continue current medications. Recheck HbA1c in 3 months.
Follow up in 4 weeks. Referral to nutritionist.`;

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const mockPatient = MOCK_PATIENTS.find((p) => p.id === id) ?? null;
  const [patient, setPatient] = useState<MockPatient | null>(mockPatient);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatient(id).then((apiData) => {
      if (apiData) setPatient(apiData);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--medos-gray-200)] border-t-[var(--medos-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  /* ---- Not found ---- */
  if (!patient) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--medos-gray-100)]">
          <User className="h-8 w-8 text-[var(--medos-gray-400)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--medos-navy)]">
          Patient not found
        </h2>
        <p className="text-sm text-[var(--medos-gray-500)]">
          No patient exists with ID &ldquo;{id}&rdquo;.
        </p>
        <button
          onClick={() => router.push("/patients")}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--medos-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--medos-primary-hover)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </button>
      </div>
    );
  }

  /* ---- Main layout ---- */
  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <button
            onClick={() => router.push("/patients")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--medos-gray-500)] hover:text-[var(--medos-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patients
          </button>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--medos-primary-light)] text-lg font-bold text-[var(--medos-primary)]">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
                {patient.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={patient.status} />
                <RiskBadge risk={patient.riskScore} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--medos-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--medos-primary-hover)] transition-colors"
          >
            <PlayCircle className="h-4 w-4" />
            Start Visit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--medos-gray-200)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--medos-navy)] hover:bg-[var(--medos-gray-50)] transition-colors"
          >
            <FilePlus className="h-4 w-4" />
            New Note
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--medos-gray-200)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--medos-navy)] hover:bg-[var(--medos-gray-50)] transition-colors"
          >
            <Send className="h-4 w-4" />
            Submit Claim
          </button>
        </div>
      </div>

      {/* ---------- Patient Info Card ---------- */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="mb-4 text-base font-semibold text-[var(--medos-navy)]">
          Patient Information
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Left column */}
          <div className="space-y-4">
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date of Birth" value={formatDate(patient.birthDate)} />
            <InfoRow icon={<User className="h-4 w-4" />} label="Gender" value={patient.gender} />
            <InfoRow icon={<Hash className="h-4 w-4" />} label="MRN" value={patient.mrn} mono />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={patient.phone} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={patient.address} />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <InfoRow icon={<Shield className="h-4 w-4" />} label="Insurance" value={patient.insurance} />
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Last Visit" value={formatDateShort(patient.lastVisit)} />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Next Appointment"
              value={
                patient.nextAppointment
                  ? formatDateShort(patient.nextAppointment)
                  : "None scheduled"
              }
            />
          </div>
        </div>
      </div>

      {/* ---------- Conditions ---------- */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--medos-navy)]">
          <Heart className="h-4 w-4 text-[var(--medos-error)]" />
          Conditions
        </h2>
        <div className="flex flex-wrap gap-2">
          {patient.conditions.map((condition) => (
            <span
              key={condition}
              className="inline-flex items-center rounded-lg bg-[var(--medos-primary-50)] px-3 py-1.5 text-sm font-medium text-[var(--medos-primary)] ring-1 ring-[var(--medos-primary)]/15"
            >
              {condition}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Two-column: Timeline + AI Notes ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clinical Timeline */}
        <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-[var(--medos-navy)]">
            <FileText className="h-4 w-4 text-[var(--medos-accent)]" />
            Clinical Timeline
          </h2>

          <div className="relative space-y-0">
            {/* Vertical connector line */}
            <div className="absolute left-[17px] top-2 bottom-2 w-px bg-[var(--medos-gray-200)]" />

            {TIMELINE.map((entry, idx) => (
              <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Icon node */}
                <div
                  className={cn(
                    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    typeColors[entry.type]
                  )}
                >
                  {entry.icon}
                </div>

                {/* Content */}
                <div className="pt-1">
                  <p className="text-xs font-semibold text-[var(--medos-gray-400)]">
                    {formatDateShort(entry.date)}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--medos-gray-700)] leading-relaxed">
                    {entry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI-Generated Notes */}
        <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--medos-navy)]">
              <Sparkles className="h-4 w-4 text-[var(--medos-primary)]" />
              AI-Generated Notes
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--medos-primary-50)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--medos-primary)] ring-1 ring-[var(--medos-primary)]/15">
              <Sparkles className="h-3 w-3" />
              Confidence: 92%
            </span>
          </div>

          <div className="rounded-lg border border-[var(--medos-gray-100)] bg-[var(--medos-gray-50)] p-4">
            <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[var(--medos-gray-700)]">
              {MOCK_SOAP_NOTE}
            </pre>
          </div>

          <p className="mt-3 text-xs text-[var(--medos-gray-400)]">
            Generated by MedOS AI -- based on encounter data from{" "}
            {formatDateShort("2026-02-28")}. Review and sign to finalize.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info row sub-component                                             */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--medos-gray-50)] text-[var(--medos-gray-400)]">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--medos-gray-400)]">
          {label}
        </p>
        <p
          className={cn(
            "text-sm font-medium text-[var(--medos-navy)]",
            mono && "font-mono"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
