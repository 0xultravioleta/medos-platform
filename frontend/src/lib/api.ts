/**
 * API client for MedOS backend.
 * Falls back to null when the backend is unavailable, allowing mock data fallback.
 */

import type {
  MockPatient,
  MockAppointment,
  MockDashboardStats,
  MockRecentActivity,
} from "./mock-data";

// -- Claim & Note types (match backend response shapes) ---------------------

export interface Claim {
  id: string;
  patient: string;
  cpt: string;
  icd10: string;
  amount: number;
  payer: string;
  status: string;
  date: string;
}

export interface Note {
  id: string;
  patient: string;
  type: string;
  date: string;
  confidence: number;
  status: string;
  preview: string;
}

// -- Core fetch helper ------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchAPI<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// -- Public API functions ---------------------------------------------------

export async function getPatients() {
  return fetchAPI<MockPatient[]>("/api/v1/patients");
}

export async function getPatient(id: string) {
  return fetchAPI<MockPatient>(`/api/v1/patients/${id}`);
}

export async function getDashboardStats() {
  return fetchAPI<MockDashboardStats>("/api/v1/dashboard/stats");
}

export async function getTodayAppointments() {
  return fetchAPI<MockAppointment[]>("/api/v1/appointments/today");
}

export async function getRecentActivity() {
  return fetchAPI<MockRecentActivity[]>("/api/v1/dashboard/activity");
}

export async function getClaims() {
  return fetchAPI<Claim[]>("/api/v1/claims");
}

export async function getAINotes() {
  return fetchAPI<Note[]>("/api/v1/notes");
}

// -- Approval types & API (Sprint 2 backend) --------------------------------

export interface ApprovalTask {
  task_id: string;
  title: string;
  agent_type: string;
  status: string;
  confidence: number | null;
  resource_type: string;
  created_at: string;
  description: string;
}

export interface ApprovalStats {
  total_tasks: number;
  by_status: Record<string, number>;
  by_agent_type: Record<string, number>;
  pending_count: number;
  avg_confidence: number;
  oldest_pending: string | null;
}

export interface ApprovalDetail extends ApprovalTask {
  confidence_detail: { score: number | null; requires_review: boolean | null; model_id: string | null };
  resource_id: string;
  payload: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export async function getApprovals(agentType?: string) {
  const query = agentType ? `?agent_type=${agentType}` : "";
  return fetchAPI<{ approvals: ApprovalTask[]; total: number }>(`/api/v1/approvals${query}`);
}

export async function getApprovalStats() {
  return fetchAPI<ApprovalStats>("/api/v1/approvals/stats");
}

export async function getApprovalDetail(taskId: string) {
  return fetchAPI<ApprovalDetail>(`/api/v1/approvals/${taskId}`);
}

// -- Claims Analytics API (Sprint 4 backend) --------------------------------

export interface ClaimsAnalytics {
  summary: {
    total_claims: number;
    clean_claim_rate: number;
    denial_rate: number;
    collection_rate: number;
  };
  financial: {
    total_billed: number;
    total_collected: number;
    total_denied: number;
    outstanding_ar: number;
  };
  status_breakdown: Record<string, number>;
  denial_by_code: Record<string, number>;
  ar_aging: Record<string, number>;
  top_denial_reasons: Array<{
    code: string;
    reason: string;
    common_fix: string;
    count: number;
    appeal_success_rate: number;
  }>;
  kpis: {
    avg_days_to_payment: number;
    first_pass_resolution_rate: number;
    claims_per_provider_per_day: number;
  };
}

export async function getClaimsAnalytics() {
  return fetchAPI<ClaimsAnalytics>("/api/v1/billing/analytics");
}

// -- Agent runner API (Sprint 3 backend) ------------------------------------

export interface AgentRunResult {
  status: string;
  [key: string]: unknown;
}

export async function runAgent(agentType: string, params: Record<string, unknown>) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/agents/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_type: agentType, params }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<AgentRunResult>;
  } catch {
    return null;
  }
}
