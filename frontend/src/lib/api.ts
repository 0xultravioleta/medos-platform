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
