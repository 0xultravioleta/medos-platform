"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ChevronRight,
  Brain,
} from "lucide-react";
import { MOCK_TODAYS_APPOINTMENTS } from "@/lib/mock-data";
import type { MockAppointment } from "@/lib/mock-data";
import { getTodayAppointments } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "in-progress": "bg-blue-50 text-blue-700 border border-blue-200",
  confirmed: "bg-violet-50 text-violet-700 border border-violet-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
};

// Mock scheduling stats (will come from backend scheduling MCP when connected)
const SCHEDULING_STATS = {
  totalToday: MOCK_TODAYS_APPOINTMENTS.length,
  availableSlots: 8,
  providers: [
    { name: "Dr. Sarah Chen", specialty: "Orthopedics", slotsLeft: 3, status: "available" },
    { name: "Dr. Michael Torres", specialty: "Orthopedics", slotsLeft: 2, status: "available" },
    { name: "Dr. Emily Watson", specialty: "Sports Medicine", slotsLeft: 3, status: "busy" },
  ],
  noShowRisk: {
    high: 1,
    medium: 2,
    low: MOCK_TODAYS_APPOINTMENTS.length - 3,
  },
};

// Mock no-show risk per patient (from scheduling_no_show_predict MCP tool)
const NO_SHOW_RISK: Record<string, { level: string; probability: number }> = {
  "p-001": { level: "low", probability: 0.08 },
  "p-002": { level: "low", probability: 0.12 },
  "p-003": { level: "medium", probability: 0.25 },
  "p-004": { level: "high", probability: 0.42 },
  "p-005": { level: "low", probability: 0.05 },
  "p-006": { level: "medium", probability: 0.22 },
};

function getRiskBadge(patientId: string) {
  const risk = NO_SHOW_RISK[patientId];
  if (!risk) return null;

  const styles: Record<string, string> = {
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-red-50 text-red-700 border-red-200",
  };

  if (risk.level === "low") return null; // Don't show badge for low risk

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${styles[risk.level]}`}
      title={`No-show probability: ${(risk.probability * 100).toFixed(0)}%`}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      {risk.level === "high" ? "High risk" : "Watch"}
    </span>
  );
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<MockAppointment[]>(MOCK_TODAYS_APPOINTMENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTodayAppointments().then((apiData) => {
      if (apiData) setAppointments(apiData);
      setLoading(false);
    });
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--medos-gray-200)] border-t-[var(--medos-primary)] rounded-full animate-spin" />
      </div>
    );
  }

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
              {appointments.length} appointments today
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

      {/* Provider Availability + Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-[var(--medos-gray-500)]">Today</p>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)] mt-1">
            {SCHEDULING_STATS.totalToday}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">Appointments</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-[var(--medos-gray-500)]">Available</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {SCHEDULING_STATS.availableSlots}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">Open Slots</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            <p className="text-xs text-[var(--medos-gray-500)]">Providers</p>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)] mt-1">
            {SCHEDULING_STATS.providers.length}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">On Schedule</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-[var(--medos-gray-500)]">AI Predicted</p>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {SCHEDULING_STATS.noShowRisk.high + SCHEDULING_STATS.noShowRisk.medium}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">No-Show Risk</p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SCHEDULING_STATS.providers.map((provider) => (
          <div
            key={provider.name}
            className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-4 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--medos-navy)]">
                  {provider.name}
                </p>
                <p className="text-xs text-[var(--medos-gray-500)]">
                  {provider.specialty}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  provider.status === "available"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  provider.status === "available" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`} />
                {provider.status === "available" ? "Available" : "In Session"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--medos-gray-500)]">
                {provider.slotsLeft} slots remaining
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-1.5 rounded-sm ${
                      i < 6 - provider.slotsLeft
                        ? "bg-blue-400"
                        : "bg-[var(--medos-gray-200)]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's appointments */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--medos-gray-100)] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--medos-navy)]">
            Today &mdash; {today}
          </h2>
          <div className="flex items-center gap-2 text-xs text-[var(--medos-gray-500)]">
            <Activity className="w-3.5 h-3.5" />
            {appointments.filter((a) => a.status === "completed").length} completed
          </div>
        </div>

        <div className="divide-y divide-[var(--medos-gray-100)]">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--medos-gray-50)] transition-default cursor-pointer group"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-gray-50)] text-[var(--medos-gray-600)]">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--medos-gray-900)]">
                    {appt.patientName}
                  </p>
                  {getRiskBadge(appt.patientId)}
                </div>
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
                {appt.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {appt.status.replace("-", " ")}
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--medos-gray-300)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
