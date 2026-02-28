"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Sparkles, Mic, Search } from "lucide-react";
import { getAINotes, type Note } from "@/lib/api";

const MOCK_NOTES: Note[] = [
  {
    id: "n-001",
    patient: "Robert Chen",
    type: "SOAP Note",
    date: "Feb 28, 2026",
    confidence: 94,
    status: "signed",
    preview:
      "Subjective: Patient reports improved blood sugar control since medication adjustment...",
  },
  {
    id: "n-002",
    patient: "Maria Garcia",
    type: "SOAP Note",
    date: "Feb 28, 2026",
    confidence: 91,
    status: "pending_review",
    preview:
      "Subjective: Follow-up for Type 2 Diabetes and Hypertension management...",
  },
  {
    id: "n-003",
    patient: "William Torres",
    type: "Cardiology Consult",
    date: "Feb 28, 2026",
    confidence: 88,
    status: "in_progress",
    preview:
      "Subjective: Patient presents for cardiology consultation regarding heart failure management...",
  },
  {
    id: "n-004",
    patient: "James Rodriguez",
    type: "SOAP Note",
    date: "Feb 27, 2026",
    confidence: 96,
    status: "signed",
    preview:
      "Subjective: COPD exacerbation follow-up. Patient reports decreased wheezing...",
  },
  {
    id: "n-005",
    patient: "Ana Flores",
    type: "New Patient Intake",
    date: "Feb 27, 2026",
    confidence: 89,
    status: "signed",
    preview:
      "Subjective: New patient intake. 27-year-old female presenting with chronic migraines...",
  },
];

const STATUS_MAP: Record<string, { label: string; style: string }> = {
  signed: {
    label: "Signed",
    style: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  pending_review: {
    label: "Pending Review",
    style: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  in_progress: {
    label: "In Progress",
    style: "bg-blue-50 text-blue-700 border border-blue-200",
  },
};

export default function AiNotesPage() {
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAINotes().then((apiData) => {
      if (apiData) setNotes(apiData);
      setLoading(false);
    });
  }, []);

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
            <FileText className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
              AI Notes
            </h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              AI-generated clinical documentation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ai-notes/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-default"
          >
            <Mic className="w-4 h-4" />
            Start AI Scribe
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--medos-primary)]" />
            <div>
              <p className="text-2xl font-bold text-[var(--medos-navy)]">156</p>
              <p className="text-xs text-[var(--medos-gray-500)]">
                Notes this month
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold text-[var(--medos-navy)]">92%</p>
              <p className="text-xs text-[var(--medos-gray-500)]">
                Avg. confidence score
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-violet-500" />
            <div>
              <p className="text-2xl font-bold text-[var(--medos-navy)]">
                2.4 min
              </p>
              <p className="text-xs text-[var(--medos-gray-500)]">
                Avg. generation time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
        <input
          type="text"
          placeholder="Search notes by patient, type, or content..."
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
        />
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.map((note) => {
          const statusInfo = STATUS_MAP[note.status];
          return (
            <div
              key={note.id}
              className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5 hover:border-[var(--medos-primary)] transition-default cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-[var(--medos-gray-900)]">
                      {note.patient}
                    </p>
                    <span className="text-xs text-[var(--medos-gray-400)]">
                      &middot;
                    </span>
                    <span className="text-xs text-[var(--medos-gray-500)]">
                      {note.type}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--medos-gray-600)] line-clamp-2">
                    {note.preview}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo?.style || ""}`}
                  >
                    {statusInfo?.label || note.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[var(--medos-primary)]" />
                    <span className="text-xs font-medium text-[var(--medos-gray-600)]">
                      {note.confidence}%
                    </span>
                  </div>
                  <span className="text-xs text-[var(--medos-gray-400)]">
                    {note.date}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
