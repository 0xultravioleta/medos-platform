"use client";

import { DollarSign, Send, AlertTriangle, CheckCircle2, Clock, Search, Filter } from "lucide-react";

const MOCK_CLAIMS = [
  {
    id: "CLM-2026-0847",
    patient: "Maria Garcia",
    cpt: "99214",
    icd10: "E11.65, I10",
    amount: 285.0,
    payer: "Blue Cross Blue Shield",
    status: "submitted",
    date: "Feb 28, 2026",
  },
  {
    id: "CLM-2026-0846",
    patient: "Robert Chen",
    cpt: "99215",
    icd10: "I48.91, N18.3, I10",
    amount: 375.0,
    payer: "Medicare Part B",
    status: "approved",
    date: "Feb 27, 2026",
  },
  {
    id: "CLM-2026-0845",
    patient: "James Rodriguez",
    cpt: "99214",
    icd10: "J44.1, G47.33, E66.01",
    amount: 285.0,
    payer: "Aetna",
    status: "pending",
    date: "Feb 27, 2026",
  },
  {
    id: "CLM-2026-0844",
    patient: "William Torres",
    cpt: "99215",
    icd10: "I50.22, E11.65, G62.9",
    amount: 375.0,
    payer: "Humana Gold Plus",
    status: "denied",
    date: "Feb 26, 2026",
  },
  {
    id: "CLM-2026-0843",
    patient: "Ana Flores",
    cpt: "99203",
    icd10: "G43.909, F41.1",
    amount: 225.0,
    payer: "Cigna",
    status: "approved",
    date: "Feb 25, 2026",
  },
];

const STATUS_MAP: Record<string, { label: string; style: string; icon: typeof CheckCircle2 }> = {
  approved: {
    label: "Approved",
    style: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: CheckCircle2,
  },
  submitted: {
    label: "Submitted",
    style: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: Send,
  },
  pending: {
    label: "Pending",
    style: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Clock,
  },
  denied: {
    label: "Denied",
    style: "bg-red-50 text-red-700 border border-red-200",
    icon: AlertTriangle,
  },
};

export default function ClaimsPage() {
  const totalRevenue = MOCK_CLAIMS.filter((c) => c.status === "approved").reduce(
    (sum, c) => sum + c.amount,
    0
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <DollarSign className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Claims</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              Revenue cycle management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--medos-gray-300)] text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
            <Send className="w-4 h-4" />
            Submit Claim
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">38</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Pending Claims</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-emerald-600">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--medos-gray-500)]">Approved This Week</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">4.2%</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Denial Rate</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">12</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Prior Auths Pending</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
        <input
          type="text"
          placeholder="Search by claim ID, patient, or CPT code..."
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm placeholder:text-[var(--medos-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
        />
      </div>

      {/* Claims table */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--medos-gray-100)]">
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Claim ID
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Patient
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                CPT / ICD-10
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Payer
              </th>
              <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--medos-gray-100)]">
            {MOCK_CLAIMS.map((claim) => {
              const statusInfo = STATUS_MAP[claim.status];
              const StatusIcon = statusInfo?.icon;
              return (
                <tr
                  key={claim.id}
                  className="hover:bg-[var(--medos-gray-50)] transition-default cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-mono font-medium text-[var(--medos-primary)]">
                    {claim.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[var(--medos-gray-900)]">
                    {claim.patient}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[var(--medos-gray-900)]">
                      CPT: {claim.cpt}
                    </p>
                    <p className="text-xs text-[var(--medos-gray-500)]">
                      {claim.icd10}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--medos-gray-600)]">
                    {claim.payer}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[var(--medos-gray-900)] text-right tabular-nums">
                    ${claim.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo?.style || ""}`}
                    >
                      {StatusIcon && <StatusIcon className="w-3 h-3" />}
                      {statusInfo?.label || claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--medos-gray-500)]">
                    {claim.date}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
