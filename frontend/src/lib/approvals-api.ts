/**
 * API client for MedOS Approval Queue.
 * Uses mock data when backend is unavailable.
 */

// -- Types ------------------------------------------------------------------

export interface ApprovalTask {
  id: string;
  task_type: string;
  agent_type: "prior_auth" | "denial_management" | "billing" | "clinical_scribe";
  title: string;
  description: string;
  confidence_score: number;
  resource_type: string;
  patient_name: string;
  patient_id: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface ApprovalStats {
  total_pending: number;
  avg_confidence: number;
  by_agent: {
    prior_auth: number;
    denial_management: number;
    billing: number;
    clinical_scribe: number;
  };
  approved_today: number;
  rejected_today: number;
}

// -- Mock data for demo -----------------------------------------------------

const MOCK_APPROVALS: ApprovalTask[] = [
  {
    id: "apv-001",
    task_type: "prior_auth_submission",
    agent_type: "prior_auth",
    title: "Prior Auth: MRI Lumbar Spine",
    description: "AI-generated prior authorization request for MRI Lumbar Spine. Clinical documentation supports medical necessity based on 6-week conservative treatment failure.",
    confidence_score: 0.94,
    resource_type: "PriorAuthForm",
    patient_name: "James Rodriguez",
    patient_id: "p-002",
    payload: {
      procedure: "MRI Lumbar Spine (CPT 72148)",
      diagnosis: "M54.5 - Low back pain",
      payer: "Blue Cross Blue Shield",
      urgency: "routine",
      clinical_rationale: "Patient has completed 6 weeks of physical therapy without improvement. Progressive radiculopathy symptoms. MRI indicated to rule out disc herniation.",
      supporting_docs: ["PT notes (6 visits)", "Office visit 02/15", "X-ray results 01/28"],
    },
    status: "pending",
    created_at: "2026-02-28T09:15:00Z",
    updated_at: "2026-02-28T09:15:00Z",
  },
  {
    id: "apv-002",
    task_type: "appeal_letter",
    agent_type: "denial_management",
    title: "Appeal: Denied CT Abdomen",
    description: "AI-drafted appeal letter for denied CT Abdomen/Pelvis. Original denial reason: insufficient documentation of conservative treatment.",
    confidence_score: 0.87,
    resource_type: "AppealLetter",
    patient_name: "William Torres",
    patient_id: "p-004",
    payload: {
      original_claim: "CLM-2026-0844",
      denial_reason: "Medical necessity not established",
      appeal_text: "Dear Medical Director,\n\nI am writing to appeal the denial of CT Abdomen/Pelvis (CPT 74178) for patient William Torres (DOB: 03/15/1958).\n\nClinical Justification:\n- Patient presents with persistent abdominal pain x 4 weeks\n- Failed trial of PPI therapy (omeprazole 40mg x 14 days)\n- Abnormal labs: elevated lipase (312 U/L), mild leukocytosis\n- Physical exam reveals RLQ tenderness with guarding\n\nThe CT is medically necessary to evaluate for potential pancreatic pathology, appendicitis, or other acute abdominal process given the clinical presentation and lab abnormalities.\n\nSincerely,\nDr. Sarah Chen, MD",
      payer: "Humana Gold Plus",
      deadline: "2026-03-14",
    },
    status: "pending",
    created_at: "2026-02-28T08:30:00Z",
    updated_at: "2026-02-28T08:30:00Z",
  },
  {
    id: "apv-003",
    task_type: "claim_review",
    agent_type: "billing",
    title: "Claim Review: E/M Upcoding Risk",
    description: "AI flagged potential upcoding risk. Visit documentation supports 99214 but was coded as 99215. Recommending downcode to prevent audit risk.",
    confidence_score: 0.72,
    resource_type: "Claim",
    patient_name: "Maria Garcia",
    patient_id: "p-001",
    payload: {
      claim_id: "CLM-2026-0847",
      original_code: "99215",
      suggested_code: "99214",
      reason: "Documentation supports moderate complexity (99214). Key elements: 2 HPI elements documented (need 4+ for 99215), no data review documented, straightforward MDM.",
      financial_impact: "-$90.00 per encounter",
      audit_risk: "HIGH if submitted as 99215",
    },
    status: "pending",
    created_at: "2026-02-28T07:45:00Z",
    updated_at: "2026-02-28T07:45:00Z",
  },
  {
    id: "apv-004",
    task_type: "prior_auth_submission",
    agent_type: "prior_auth",
    title: "Prior Auth: Physical Therapy (12 visits)",
    description: "Prior authorization for 12 additional PT visits. Patient has shown measurable improvement and continued therapy is medically necessary.",
    confidence_score: 0.96,
    resource_type: "PriorAuthForm",
    patient_name: "Ana Flores",
    patient_id: "p-005",
    payload: {
      procedure: "Physical Therapy (CPT 97110, 97140)",
      diagnosis: "M25.511 - Pain in right shoulder",
      payer: "Cigna",
      urgency: "routine",
      clinical_rationale: "Patient s/p rotator cuff repair 01/15/2026. Completed initial 12 PT visits with documented improvement in ROM (abduction 90->145 degrees). Additional 12 visits needed to achieve full functional recovery.",
      supporting_docs: ["Surgical report 01/15", "PT progress note", "ROM measurements"],
    },
    status: "pending",
    created_at: "2026-02-27T16:20:00Z",
    updated_at: "2026-02-27T16:20:00Z",
  },
  {
    id: "apv-005",
    task_type: "appeal_letter",
    agent_type: "denial_management",
    title: "Appeal: Denied Specialist Referral",
    description: "Appeal for denied rheumatology referral. AI analysis indicates strong clinical basis for referral based on positive ANA and joint symptoms.",
    confidence_score: 0.91,
    resource_type: "AppealLetter",
    patient_name: "Robert Chen",
    patient_id: "p-003",
    payload: {
      original_claim: "REF-2026-0112",
      denial_reason: "Referral not medically necessary",
      appeal_text: "Dear Medical Director,\n\nI am appealing the denial of rheumatology referral for Robert Chen.\n\nClinical findings:\n- Positive ANA (1:320, speckled pattern)\n- Symmetric polyarthralgia x 3 months\n- Morning stiffness > 60 minutes\n- Elevated ESR (42) and CRP (2.8)\n- Failed NSAID therapy (naproxen 500mg BID x 4 weeks)\n\nThese findings are consistent with possible systemic lupus erythematosus or rheumatoid arthritis requiring specialist evaluation.\n\nSincerely,\nDr. Sarah Chen, MD",
      payer: "Medicare Part B",
      deadline: "2026-03-10",
    },
    status: "pending",
    created_at: "2026-02-27T14:00:00Z",
    updated_at: "2026-02-27T14:00:00Z",
  },
  {
    id: "apv-006",
    task_type: "claim_review",
    agent_type: "billing",
    title: "Claim Review: Missing Modifier",
    description: "AI detected missing modifier -25 on E/M service billed same day as procedure. Without modifier, E/M will be bundled and denied.",
    confidence_score: 0.98,
    resource_type: "Claim",
    patient_name: "Lisa Park",
    patient_id: "p-006",
    payload: {
      claim_id: "CLM-2026-0848",
      issue: "Missing modifier -25 on 99213",
      same_day_procedure: "11102 - Tangential biopsy of skin",
      recommendation: "Add modifier -25 to 99213 to indicate separately identifiable E/M service",
      financial_impact: "+$142.00 (E/M would be denied without modifier)",
    },
    status: "pending",
    created_at: "2026-02-27T11:30:00Z",
    updated_at: "2026-02-27T11:30:00Z",
  },
];

const MOCK_STATS: ApprovalStats = {
  total_pending: 6,
  avg_confidence: 0.897,
  by_agent: {
    prior_auth: 2,
    denial_management: 2,
    billing: 2,
    clinical_scribe: 0,
  },
  approved_today: 3,
  rejected_today: 1,
};

// -- API functions ----------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchApprovalAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getApprovals(
  agentType?: string
): Promise<ApprovalTask[]> {
  const query = agentType ? `?agent_type=${agentType}` : "";
  const data = await fetchApprovalAPI<ApprovalTask[]>(
    `/api/v1/approvals${query}`
  );
  if (data) return data;
  // Fallback to mock
  if (agentType) {
    return MOCK_APPROVALS.filter((a) => a.agent_type === agentType);
  }
  return MOCK_APPROVALS;
}

export async function getApprovalStats(): Promise<ApprovalStats> {
  const data = await fetchApprovalAPI<ApprovalStats>(
    "/api/v1/approvals/stats"
  );
  return data || MOCK_STATS;
}

export async function approveTask(
  taskId: string,
  notes?: string
): Promise<boolean> {
  const data = await fetchApprovalAPI<{ success: boolean }>(
    `/api/v1/approvals/${taskId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ notes: notes || "" }),
    }
  );
  return data?.success ?? true; // Optimistic for demo
}

export async function rejectTask(
  taskId: string,
  reason: string
): Promise<boolean> {
  const data = await fetchApprovalAPI<{ success: boolean }>(
    `/api/v1/approvals/${taskId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  );
  return data?.success ?? true;
}
