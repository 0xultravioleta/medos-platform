"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  UserPlus,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { MOCK_PATIENTS, type MockPatient } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type SortField = "name" | "mrn" | "birthDate" | "lastVisit" | "riskScore";
type SortDirection = "asc" | "desc";

const riskOrder: Record<string, number> = { low: 0, moderate: 1, high: 2 };

function RiskBadge({ risk }: { risk: MockPatient["riskScore"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        risk === "low" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
        risk === "moderate" && "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
        risk === "high" && "bg-red-50 text-red-700 ring-1 ring-red-600/20"
      )}
    >
      {risk}
    </span>
  );
}

function StatusBadge({ status }: { status: MockPatient["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        status === "active" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
        status === "scheduled" && "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
        status === "discharged" && "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20"
      )}
    >
      {status}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PatientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let filtered = MOCK_PATIENTS;
    if (q) {
      filtered = MOCK_PATIENTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.conditions.some((c) => c.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.lastName.localeCompare(b.lastName);
          break;
        case "mrn":
          cmp = a.mrn.localeCompare(b.mrn);
          break;
        case "birthDate":
          cmp = a.birthDate.localeCompare(b.birthDate);
          break;
        case "lastVisit":
          cmp = a.lastVisit.localeCompare(b.lastVisit);
          break;
        case "riskScore":
          cmp = riskOrder[a.riskScore] - riskOrder[b.riskScore];
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [searchQuery, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function SortableHeader({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) {
    const isActive = sortField === field;
    return (
      <th
        className={cn(
          "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--medos-gray-500)] cursor-pointer select-none hover:text-[var(--medos-navy)] transition-colors",
          className
        )}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <ArrowUpDown
            className={cn(
              "h-3.5 w-3.5 transition-colors",
              isActive ? "text-[var(--medos-primary)]" : "text-[var(--medos-gray-300)]"
            )}
          />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--medos-primary-light)]">
            <Users className="h-5 w-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">
              Patients
            </h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              {filteredAndSorted.length} of {MOCK_PATIENTS.length} patients
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--medos-gray-400)]" />
            <input
              type="text"
              placeholder="Search by name, MRN, or condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--medos-gray-200)] bg-white pl-9 pr-4 text-sm text-[var(--medos-navy)] placeholder:text-[var(--medos-gray-400)] focus:border-[var(--medos-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)]/20 sm:w-80"
            />
          </div>

          {/* Add Patient */}
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--medos-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--medos-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)]/40 focus:ring-offset-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Patient
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--medos-gray-200)] bg-white shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)] bg-[var(--medos-gray-50)]">
                <SortableHeader field="name">Patient Name</SortableHeader>
                <SortableHeader field="mrn">MRN</SortableHeader>
                <SortableHeader field="birthDate" className="hidden md:table-cell">
                  DOB
                </SortableHeader>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--medos-gray-500)]">
                  Insurance
                </th>
                <SortableHeader field="riskScore">Risk Score</SortableHeader>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--medos-gray-500)]">
                  Status
                </th>
                <SortableHeader field="lastVisit" className="hidden lg:table-cell">
                  Last Visit
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-[var(--medos-gray-500)]"
                  >
                    No patients match your search.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[var(--medos-primary-50)]"
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--medos-primary-light)] text-sm font-semibold text-[var(--medos-primary)]">
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--medos-navy)]">
                            {patient.name}
                          </p>
                          <p className="text-xs text-[var(--medos-gray-500)] md:hidden">
                            {patient.mrn}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* MRN */}
                    <td className="px-4 py-3.5 text-sm text-[var(--medos-gray-700)] font-mono">
                      {patient.mrn}
                    </td>

                    {/* DOB */}
                    <td className="hidden md:table-cell px-4 py-3.5 text-sm text-[var(--medos-gray-600)]">
                      {formatDate(patient.birthDate)}
                    </td>

                    {/* Insurance */}
                    <td className="hidden lg:table-cell px-4 py-3.5 text-sm text-[var(--medos-gray-600)] max-w-[200px] truncate">
                      {patient.insurance}
                    </td>

                    {/* Risk Score */}
                    <td className="px-4 py-3.5">
                      <RiskBadge risk={patient.riskScore} />
                    </td>

                    {/* Status */}
                    <td className="hidden md:table-cell px-4 py-3.5">
                      <StatusBadge status={patient.status} />
                    </td>

                    {/* Last Visit */}
                    <td className="hidden lg:table-cell px-4 py-3.5 text-sm text-[var(--medos-gray-600)]">
                      {formatDate(patient.lastVisit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
