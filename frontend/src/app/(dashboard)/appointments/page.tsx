"use client";

import { Calendar, Clock, Plus, Filter } from "lucide-react";
import { MOCK_TODAYS_APPOINTMENTS } from "@/lib/mock-data";

const STATUS_STYLES: Record<string, string> = {
  completed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "in-progress":
    "bg-blue-50 text-blue-700 border border-blue-200",
  confirmed:
    "bg-violet-50 text-violet-700 border border-violet-200",
  pending:
    "bg-amber-50 text-amber-700 border border-amber-200",
};

export default function AppointmentsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <Calendar className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
              Appointments
            </h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              {MOCK_TODAYS_APPOINTMENTS.length} appointments today
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--medos-gray-300)] text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Today's appointments */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--medos-gray-100)]">
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">
            Today &mdash; February 28, 2026
          </h2>
        </div>

        <div className="divide-y divide-[var(--medos-gray-100)]">
          {MOCK_TODAYS_APPOINTMENTS.map((appt) => (
            <div
              key={appt.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--medos-gray-50)] transition-default cursor-pointer"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-gray-50)] text-[var(--medos-gray-600)]">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--medos-gray-900)]">
                  {appt.patientName}
                </p>
                <p className="text-xs text-[var(--medos-gray-500)]">
                  {appt.type} &middot; {appt.provider}
                </p>
              </div>
              <div className="text-sm font-medium text-[var(--medos-gray-700)] tabular-nums">
                {appt.time}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[appt.status] || ""}`}
              >
                {appt.status.replace("-", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
