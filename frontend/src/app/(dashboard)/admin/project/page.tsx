"use client";

import { useState, useMemo } from "react";
import {
  LayoutGrid,
  List,
  Clock,
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Users,
  Target,
  Diamond,
  Filter,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type ViewKey = "board" | "list" | "timeline" | "stats";
type TaskStatus = "pending" | "in-progress" | "done";
type Owner = "A" | "B" | "BOTH";

interface Task {
  id: string;
  title: string;
  sprint: string;
  epic: string;
  owner: Owner;
  hours: number;
  status: TaskStatus;
  deps: string[];
}

// --- Constants ---

const SPRINT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  S0: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  S1: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  S2: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  S3: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  S4: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  S5: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200" },
  S6: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "S2.5": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  S3F: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; border: string; label: string }> = {
  done: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Done" },
  "in-progress": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "In Progress" },
  pending: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", label: "Pending" },
};

const EPIC_COLORS: Record<string, { bg: string; text: string }> = {
  "EPIC-001": { bg: "bg-violet-100", text: "text-violet-700" },
  "EPIC-002": { bg: "bg-sky-100", text: "text-sky-700" },
  "EPIC-003": { bg: "bg-teal-100", text: "text-teal-700" },
  "EPIC-004": { bg: "bg-orange-100", text: "text-orange-700" },
  "EPIC-005": { bg: "bg-pink-100", text: "text-pink-700" },
  "EPIC-006": { bg: "bg-rose-100", text: "text-rose-700" },
  "EPIC-007": { bg: "bg-blue-100", text: "text-blue-700" },
  "EPIC-008": { bg: "bg-emerald-100", text: "text-emerald-700" },
  "EPIC-009": { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  "EPIC-010": { bg: "bg-lime-100", text: "text-lime-700" },
  "EPIC-011": { bg: "bg-amber-100", text: "text-amber-700" },
  "EPIC-012": { bg: "bg-cyan-100", text: "text-cyan-700" },
  "EPIC-013": { bg: "bg-indigo-100", text: "text-indigo-700" },
  "EPIC-014": { bg: "bg-red-100", text: "text-red-700" },
};

const OWNER_STYLES: Record<Owner, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-blue-100", text: "text-blue-700", label: "A" },
  B: { bg: "bg-purple-100", text: "text-purple-700", label: "B" },
  BOTH: { bg: "bg-teal-100", text: "text-teal-700", label: "A+B" },
};

// --- Data ---

const EPICS = [
  { id: "EPIC-001", name: "AWS Infrastructure Foundation", sprint: "S0", status: "done" as const, tasks: 17, done: 17 },
  { id: "EPIC-002", name: "Auth & Identity System", sprint: "S0", status: "done" as const, tasks: 14, done: 14 },
  { id: "EPIC-003", name: "FHIR Data Layer", sprint: "S1", status: "done" as const, tasks: 15, done: 15 },
  { id: "EPIC-004", name: "AI Clinical Documentation", sprint: "S2", status: "done" as const, tasks: 14, done: 14 },
  { id: "EPIC-005", name: "Revenue Cycle MVP", sprint: "S3", status: "done" as const, tasks: 12, done: 12 },
  { id: "EPIC-006", name: "Pilot Readiness", sprint: "S5-S6", status: "in-progress" as const, tasks: 12, done: 9 },
  { id: "EPIC-007", name: "MCP SDK Refactoring", sprint: "S2", status: "done" as const, tasks: 8, done: 8 },
  { id: "EPIC-008", name: "Demo Polish", sprint: "S3", status: "done" as const, tasks: 10, done: 10 },
  { id: "EPIC-009", name: "Revenue Cycle Completion", sprint: "S4", status: "done" as const, tasks: 6, done: 6 },
  { id: "EPIC-010", name: "Security & Pilot Readiness", sprint: "S5", status: "done" as const, tasks: 12, done: 12 },
  { id: "EPIC-011", name: "Launch & Go-Live", sprint: "S6", status: "in-progress" as const, tasks: 9, done: 6 },
  { id: "EPIC-012", name: "Device Integration", sprint: "S2.5", status: "done" as const, tasks: 4, done: 4 },
  { id: "EPIC-013", name: "Context Rehydration", sprint: "S2.5", status: "done" as const, tasks: 4, done: 4 },
  { id: "EPIC-014", name: "Admin System Monitoring", sprint: "S3F", status: "done" as const, tasks: 9, done: 9 },
];

const SPRINTS = [
  { id: "S0", name: "Foundation", weeks: "W1-W2", dates: "Mar 1-14", totalTasks: 43, doneTasks: 43, plannedTasks: 40, status: "done" as const, owner_a: 24, owner_b: 17, owner_both: 2, hours: 130 },
  { id: "S1", name: "Core Data Layer", weeks: "W3-W4", dates: "Mar 15-28", totalTasks: 15, doneTasks: 15, plannedTasks: 15, status: "done" as const, owner_a: 8, owner_b: 6, owner_both: 1, hours: 58 },
  { id: "S2", name: "AI Clinical Docs", weeks: "W5-W6", dates: "Mar 29-Apr 11", totalTasks: 14, doneTasks: 14, plannedTasks: 12, status: "done" as const, owner_a: 8, owner_b: 5, owner_both: 1, hours: 58 },
  { id: "S3", name: "Revenue Cycle v1", weeks: "W7-W8", dates: "Apr 12-25", totalTasks: 12, doneTasks: 12, plannedTasks: 12, status: "done" as const, owner_a: 6, owner_b: 5, owner_both: 1, hours: 53 },
  { id: "S4", name: "Revenue Cycle v2", weeks: "W9-W10", dates: "Apr 26-May 9", totalTasks: 18, doneTasks: 18, plannedTasks: 15, status: "done" as const, owner_a: 10, owner_b: 7, owner_both: 1, hours: 76 },
  { id: "S5", name: "Pilot Prep", weeks: "W11-W12", dates: "May 10-23", totalTasks: 12, doneTasks: 12, plannedTasks: 12, status: "done" as const, owner_a: 6, owner_b: 5, owner_both: 1, hours: 54 },
  { id: "S6", name: "Launch", weeks: "W13", dates: "May 24-29", totalTasks: 9, doneTasks: 6, plannedTasks: 9, status: "in-progress" as const, owner_a: 4, owner_b: 4, owner_both: 1, hours: 33 },
  { id: "S2.5", name: "Device + Context", weeks: "W6.5", dates: "Feb 28", totalTasks: 8, doneTasks: 8, plannedTasks: 6, status: "done" as const, owner_a: 4, owner_b: 4, owner_both: 0, hours: 28 },
  { id: "S3F", name: "Admin Phase 1", weeks: "W8.5", dates: "Feb 28", totalTasks: 9, doneTasks: 9, plannedTasks: 8, status: "done" as const, owner_a: 7, owner_b: 1, owner_both: 1, hours: 20 },
];

const MILESTONES = [
  { id: "M1", name: "Infrastructure operational", date: "Mar 14", sprint: "S0", status: "done" as const },
  { id: "M2", name: "First FHIR resource stored", date: "Mar 28", sprint: "S1", status: "done" as const },
  { id: "M3", name: "First AI-generated note", date: "Apr 11", sprint: "S2", status: "done" as const },
  { id: "M4", name: "First claim generated", date: "Apr 25", sprint: "S3", status: "done" as const },
  { id: "M5", name: "Prior auth submitted", date: "May 9", sprint: "S4", status: "done" as const },
  { id: "M6", name: "Security audit passed", date: "May 23", sprint: "S5", status: "done" as const },
  { id: "M7", name: "First pilot practice live", date: "May 29", sprint: "S6", status: "pending" as const },
];

const SPRINT_IDS = ["All", "S0", "S1", "S2", "S3", "S4", "S5", "S6", "S2.5", "S3F"];
const EPIC_IDS = ["All", ...EPICS.map((e) => e.id)];

// --- All 140 Tasks ---

const TASKS: Task[] = [
  // Sprint 0 -- Foundation (43 tasks)
  { id: "S0-T01", title: "Create AWS Organization + HIPAA SCPs", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: [] },
  { id: "S0-T02", title: "Create workload accounts (dev/staging/prod)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 2, status: "done", deps: ["S0-T01"] },
  { id: "S0-T03", title: "Create GitHub monorepo + branch protection", sprint: "S0", epic: "EPIC-001", owner: "B", hours: 2, status: "done", deps: [] },
  { id: "S0-T04", title: "Initialize Terraform backend (S3 + DynamoDB)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 2, status: "done", deps: ["S0-T01"] },
  { id: "S0-T05", title: "Create .env.example with all variables", sprint: "S0", epic: "EPIC-001", owner: "B", hours: 1, status: "done", deps: ["S0-T03"] },
  { id: "S0-T06", title: "Create Terraform module directory structure", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T04"] },
  { id: "S0-T07", title: "Implement Terraform tagging strategy module", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 2, status: "done", deps: ["S0-T06"] },
  { id: "S0-T08", title: "Create KMS module with auto-rotation", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T06"] },
  { id: "S0-T09", title: "Auth provider evaluation matrix", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 4, status: "done", deps: [] },
  { id: "S0-T10", title: "Create Terraform VPC module (3-AZ)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 4, status: "done", deps: ["S0-T06"] },
  { id: "S0-T11", title: "Configure VPC endpoints (S3, ECR, KMS)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T10"] },
  { id: "S0-T12", title: "Create S3 module + encrypted buckets", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 2, status: "done", deps: ["S0-T08"] },
  { id: "S0-T13", title: "Sign BAA + SMART on FHIR app registration", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 3, status: "done", deps: ["S0-T09"] },
  { id: "S0-T14", title: "Create Terraform RDS module (PostgreSQL 17)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 4, status: "done", deps: ["S0-T10"] },
  { id: "S0-T15", title: "Create Terraform ECS module (Fargate + ALB)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 4, status: "done", deps: ["S0-T10"] },
  { id: "S0-T16", title: "Design RBAC + ABAC permission model", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 4, status: "done", deps: ["S0-T13"] },
  { id: "S0-T17", title: "Enable CloudTrail, GuardDuty, Config, Security Hub", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T01"] },
  { id: "S0-T18", title: "Create FastAPI project scaffold", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T03"] },
  { id: "S0-T19", title: "Create Dockerfile + docker-compose.yml", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 2, status: "done", deps: ["S0-T18"] },
  { id: "S0-T20", title: "Set up Alembic migrations (schema-per-tenant)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T18"] },
  { id: "S0-T21", title: "Create GitHub Actions CI pipeline", sprint: "S0", epic: "EPIC-001", owner: "B", hours: 3, status: "done", deps: ["S0-T18"] },
  { id: "S0-T22", title: "Create GitHub Actions deploy pipeline", sprint: "S0", epic: "EPIC-001", owner: "B", hours: 3, status: "done", deps: ["S0-T15"] },
  { id: "S0-T23", title: "Create Terraform CI/CD pipeline (OIDC)", sprint: "S0", epic: "EPIC-001", owner: "B", hours: 2, status: "done", deps: ["S0-T06"] },
  { id: "S0-T24", title: "Implement SMART on FHIR OAuth2 flow", sprint: "S0", epic: "EPIC-002", owner: "A", hours: 4, status: "done", deps: ["S0-T13"] },
  { id: "S0-T25", title: "Implement JWT validation middleware", sprint: "S0", epic: "EPIC-002", owner: "A", hours: 3, status: "done", deps: ["S0-T24"] },
  { id: "S0-T26", title: "Create auth roles + SMART on FHIR scopes", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 3, status: "done", deps: ["S0-T16"] },
  { id: "S0-T27", title: "Implement MFA enforcement policies", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 2, status: "done", deps: ["S0-T13"] },
  { id: "S0-T28", title: "Deploy ElastiCache Redis (Terraform)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 2, status: "done", deps: ["S0-T10"] },
  { id: "S0-T29", title: "Implement server-side session management", sprint: "S0", epic: "EPIC-002", owner: "A", hours: 3, status: "done", deps: ["S0-T28"] },
  { id: "S0-T30", title: "Create User + Tenant SQLAlchemy models", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 2, status: "done", deps: ["S0-T20"] },
  { id: "S0-T31", title: "Implement RBAC middleware + decorators", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 3, status: "done", deps: ["S0-T25"] },
  { id: "S0-T32", title: "Create FHIR resource base tables (JSONB + GIN)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 4, status: "done", deps: ["S0-T20"] },
  { id: "S0-T33", title: "Implement schema-per-tenant provisioning", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T32"] },
  { id: "S0-T34", title: "Implement auth audit trail (AuditEvent)", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 4, status: "done", deps: ["S0-T30"] },
  { id: "S0-T35", title: "Implement API key management", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 3, status: "done", deps: ["S0-T31"] },
  { id: "S0-T36", title: "Implement FHIR Patient CRUD endpoints", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 4, status: "done", deps: ["S0-T32"] },
  { id: "S0-T37", title: "Implement FHIR Patient search parameters", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 3, status: "done", deps: ["S0-T36"] },
  { id: "S0-T38", title: "Implement break-the-glass emergency access", sprint: "S0", epic: "EPIC-002", owner: "B", hours: 4, status: "done", deps: ["S0-T31"] },
  { id: "S0-T39", title: "Set up AWS Budgets + anomaly detection", sprint: "S0", epic: "EPIC-001", owner: "B", hours: 2, status: "done", deps: ["S0-T01"] },
  { id: "S0-T40", title: "Sprint 0 integration testing (full stack)", sprint: "S0", epic: "EPIC-001", owner: "A", hours: 4, status: "done", deps: [] },
  { id: "S0-T41", title: "Cross-tenant security tests (12 scenarios)", sprint: "S0", epic: "EPIC-002", owner: "A", hours: 3, status: "done", deps: ["S0-T40"] },
  { id: "S0-T42", title: "Create environment separation Terraform configs", sprint: "S0", epic: "EPIC-001", owner: "B", hours: 2, status: "done", deps: ["S0-T06"] },
  { id: "S0-T43", title: "Sprint 0 review + retrospective", sprint: "S0", epic: "EPIC-001", owner: "BOTH", hours: 2, status: "done", deps: ["S0-T40"] },
  // Sprint 1 -- Core Data Layer (15 tasks)
  { id: "S1-T01", title: "Implement FHIR Encounter resource CRUD", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 4, status: "done", deps: ["S0-T36"] },
  { id: "S1-T02", title: "Implement FHIR Observation resource CRUD", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 4, status: "done", deps: ["S1-T01"] },
  { id: "S1-T03", title: "Implement FHIR Condition resource CRUD", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 4, status: "done", deps: ["S1-T01"] },
  { id: "S1-T04", title: "Implement FHIR Practitioner + PractitionerRole", sprint: "S1", epic: "EPIC-003", owner: "B", hours: 4, status: "done", deps: ["S0-T36"] },
  { id: "S1-T05", title: "Implement FHIR Organization resource", sprint: "S1", epic: "EPIC-003", owner: "B", hours: 3, status: "done", deps: ["S0-T36"] },
  { id: "S1-T06", title: "Build patient probabilistic matching engine", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 6, status: "done", deps: ["S0-T36"] },
  { id: "S1-T07", title: "Implement FHIR Bundle support (transaction)", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 4, status: "done", deps: ["S1-T01"] },
  { id: "S1-T08", title: "Deploy EventBridge event bus (Terraform)", sprint: "S1", epic: "EPIC-003", owner: "B", hours: 3, status: "done", deps: ["S0-T06"] },
  { id: "S1-T09", title: "Implement FHIR resource event publisher", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 3, status: "done", deps: ["S1-T08"] },
  { id: "S1-T10", title: "Implement FHIR Consent resource", sprint: "S1", epic: "EPIC-003", owner: "B", hours: 4, status: "done", deps: ["S0-T36"] },
  { id: "S1-T11", title: "Implement FHIR resource versioning + _history", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 3, status: "done", deps: ["S0-T32"] },
  { id: "S1-T12", title: "Create FHIR validation layer (R4 profiles)", sprint: "S1", epic: "EPIC-003", owner: "B", hours: 4, status: "done", deps: ["S1-T01"] },
  { id: "S1-T13", title: "Implement pgvector embeddings for clinical text", sprint: "S1", epic: "EPIC-003", owner: "A", hours: 4, status: "done", deps: ["S1-T02"] },
  { id: "S1-T14", title: "Build FHIR CapabilityStatement endpoint", sprint: "S1", epic: "EPIC-003", owner: "B", hours: 2, status: "done", deps: ["S1-T01"] },
  { id: "S1-T15", title: "Sprint 1 integration test (full workflow)", sprint: "S1", epic: "EPIC-003", owner: "BOTH", hours: 4, status: "done", deps: [] },
  // Sprint 2 -- AI Clinical Documentation (14 tasks)
  { id: "S2-T01", title: "Deploy Whisper v3 on ECS GPU (g5.xlarge)", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 6, status: "done", deps: ["S0-T15"] },
  { id: "S2-T02", title: "Build audio upload API (WAV/MP3/M4A)", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 3, status: "done", deps: ["S0-T12"] },
  { id: "S2-T03", title: "Build transcription pipeline (EventBridge)", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 4, status: "done", deps: ["S2-T01"] },
  { id: "S2-T04", title: "Build Claude clinical NLP pipeline", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 6, status: "done", deps: ["S2-T03"] },
  { id: "S2-T05", title: "Build SOAP note generator (DocumentReference)", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 4, status: "done", deps: ["S2-T04"] },
  { id: "S2-T06", title: "Implement confidence scoring for AI extractions", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 3, status: "done", deps: ["S2-T04"] },
  { id: "S2-T07", title: "Implement LangGraph agent for clinical docs", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 4, status: "done", deps: ["S2-T04"] },
  { id: "S2-T08", title: "Build Next.js provider workspace UI", sprint: "S2", epic: "EPIC-004", owner: "B", hours: 6, status: "done", deps: ["S2-T02"] },
  { id: "S2-T09", title: "Build note review UI (inline editing)", sprint: "S2", epic: "EPIC-004", owner: "B", hours: 6, status: "done", deps: ["S2-T05"] },
  { id: "S2-T10", title: "Build real-time transcription status (WebSocket)", sprint: "S2", epic: "EPIC-004", owner: "B", hours: 3, status: "done", deps: ["S2-T03"] },
  { id: "S2-T11", title: "Implement Langfuse integration (LLM observability)", sprint: "S2", epic: "EPIC-004", owner: "A", hours: 2, status: "done", deps: ["S2-T04"] },
  { id: "S2-T12", title: "Implement AI-generated ICD-10 + CPT suggestions", sprint: "S2", epic: "EPIC-004", owner: "B", hours: 4, status: "done", deps: ["S2-T05"] },
  { id: "S2-T13", title: "Build encounter summary dashboard", sprint: "S2", epic: "EPIC-004", owner: "B", hours: 3, status: "done", deps: ["S2-T08"] },
  { id: "S2-T14", title: "Sprint 2 end-to-end test (audio to signed note)", sprint: "S2", epic: "EPIC-004", owner: "BOTH", hours: 4, status: "done", deps: [] },
  // Sprint 3 -- Revenue Cycle v1 (12 tasks)
  { id: "S3-T01", title: "Build X12 270/271 eligibility parser", sprint: "S3", epic: "EPIC-005", owner: "B", hours: 6, status: "done", deps: ["S1-T01"] },
  { id: "S3-T02", title: "Integrate with eligibility clearinghouse", sprint: "S3", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: ["S3-T01"] },
  { id: "S3-T03", title: "Build eligibility verification UI", sprint: "S3", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: ["S3-T02"] },
  { id: "S3-T04", title: "Build AI coding engine (ICD-10 + CPT)", sprint: "S3", epic: "EPIC-005", owner: "A", hours: 6, status: "done", deps: ["S2-T05"] },
  { id: "S3-T05", title: "Build coding review UI", sprint: "S3", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: ["S3-T04"] },
  { id: "S3-T06", title: "Implement CMS-1500 claim generation", sprint: "S3", epic: "EPIC-005", owner: "A", hours: 6, status: "done", deps: ["S3-T04"] },
  { id: "S3-T07", title: "Build X12 837P claim generator", sprint: "S3", epic: "EPIC-005", owner: "A", hours: 4, status: "done", deps: ["S3-T06"] },
  { id: "S3-T08", title: "Build claims submission pipeline", sprint: "S3", epic: "EPIC-005", owner: "A", hours: 3, status: "done", deps: ["S3-T07"] },
  { id: "S3-T09", title: "Build X12 835 remittance parser", sprint: "S3", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: [] },
  { id: "S3-T10", title: "Build claims dashboard", sprint: "S3", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: ["S3-T08"] },
  { id: "S3-T11", title: "Implement AI denial prediction", sprint: "S3", epic: "EPIC-005", owner: "A", hours: 4, status: "done", deps: ["S3-T04"] },
  { id: "S3-T12", title: "Sprint 3 end-to-end test (encounter to claim)", sprint: "S3", epic: "EPIC-005", owner: "BOTH", hours: 4, status: "done", deps: [] },
  // Sprint 4 -- Revenue Cycle v2 (18 tasks)
  { id: "S4-T01", title: "Build prior auth requirements checker", sprint: "S4", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: ["S3-T02"] },
  { id: "S4-T02", title: "Build X12 278 prior auth request generator", sprint: "S4", epic: "EPIC-005", owner: "B", hours: 6, status: "done", deps: ["S4-T01"] },
  { id: "S4-T03", title: "Build AI clinical justification generator", sprint: "S4", epic: "EPIC-005", owner: "A", hours: 4, status: "done", deps: ["S2-T05"] },
  { id: "S4-T04", title: "Build prior auth submission pipeline", sprint: "S4", epic: "EPIC-005", owner: "B", hours: 3, status: "done", deps: ["S4-T02"] },
  { id: "S4-T05", title: "Build prior auth dashboard", sprint: "S4", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: ["S4-T04"] },
  { id: "S4-T06", title: "Build AI denial management agent", sprint: "S4", epic: "EPIC-005", owner: "A", hours: 6, status: "done", deps: ["S3-T09"] },
  { id: "S4-T07", title: "Build appeal letter generator", sprint: "S4", epic: "EPIC-005", owner: "A", hours: 4, status: "done", deps: ["S4-T06"] },
  { id: "S4-T08", title: "Build denial tracking dashboard", sprint: "S4", epic: "EPIC-005", owner: "B", hours: 4, status: "done", deps: ["S4-T06"] },
  { id: "S4-T09", title: "Build revenue analytics dashboard", sprint: "S4", epic: "EPIC-005", owner: "B", hours: 6, status: "done", deps: ["S3-T09"] },
  { id: "S4-T10", title: "Build AI underpayment detector", sprint: "S4", epic: "EPIC-005", owner: "A", hours: 4, status: "done", deps: ["S3-T09"] },
  { id: "S4-T11", title: "Implement FHIR ClaimResponse + EOB resources", sprint: "S4", epic: "EPIC-005", owner: "A", hours: 3, status: "done", deps: ["S3-T08"] },
  { id: "S4-T12", title: "Sprint 4 end-to-end test (PA + denial + analytics)", sprint: "S4", epic: "EPIC-005", owner: "BOTH", hours: 4, status: "done", deps: [] },
  { id: "S4-T13", title: "X12 837P Claims Generator (005010X222A1)", sprint: "S4", epic: "EPIC-009", owner: "A", hours: 6, status: "done", deps: [] },
  { id: "S4-T14", title: "Claims Scrubbing Rules Engine (18 rules)", sprint: "S4", epic: "EPIC-009", owner: "A", hours: 4, status: "done", deps: ["S4-T13"] },
  { id: "S4-T15", title: "X12 835 Remittance Parser (005010X221A1)", sprint: "S4", epic: "EPIC-009", owner: "A", hours: 4, status: "done", deps: [] },
  { id: "S4-T16", title: "Payment Posting Module", sprint: "S4", epic: "EPIC-009", owner: "A", hours: 3, status: "done", deps: ["S4-T15"] },
  { id: "S4-T17", title: "Claims Pipeline MCP Tools (4 new tools)", sprint: "S4", epic: "EPIC-009", owner: "A", hours: 4, status: "done", deps: ["S4-T13"] },
  { id: "S4-T18", title: "Claims Analytics Frontend Dashboard", sprint: "S4", epic: "EPIC-009", owner: "B", hours: 4, status: "done", deps: ["S4-T13"] },
  // Sprint 5 -- Pilot Preparation (12 tasks)
  { id: "S5-T01", title: "HIPAA Security Risk Assessment", sprint: "S5", epic: "EPIC-010", owner: "B", hours: 6, status: "done", deps: [] },
  { id: "S5-T02", title: "Third-party penetration test + remediation", sprint: "S5", epic: "EPIC-010", owner: "A", hours: 8, status: "done", deps: [] },
  { id: "S5-T03", title: "Security hardening (OWASP Top 10)", sprint: "S5", epic: "EPIC-010", owner: "A", hours: 4, status: "done", deps: ["S0-T15"] },
  { id: "S5-T04", title: "Implement field-level encryption (SSN, KMS)", sprint: "S5", epic: "EPIC-010", owner: "A", hours: 4, status: "done", deps: ["S0-T08"] },
  { id: "S5-T05", title: "Build tenant onboarding wizard", sprint: "S5", epic: "EPIC-010", owner: "B", hours: 6, status: "done", deps: ["S0-T33"] },
  { id: "S5-T06", title: "Build data migration tool (CSV/HL7v2)", sprint: "S5", epic: "EPIC-010", owner: "A", hours: 6, status: "done", deps: ["S1-T06"] },
  { id: "S5-T07", title: "Create EHR integration bridge (FHIR R4)", sprint: "S5", epic: "EPIC-010", owner: "A", hours: 6, status: "done", deps: ["S1-T01"] },
  { id: "S5-T08", title: "Create user training materials (3 workflows)", sprint: "S5", epic: "EPIC-010", owner: "B", hours: 6, status: "done", deps: [] },
  { id: "S5-T09", title: "Build practice configuration panel", sprint: "S5", epic: "EPIC-010", owner: "B", hours: 4, status: "done", deps: ["S5-T05"] },
  { id: "S5-T10", title: "Implement monitoring + alerting (CloudWatch)", sprint: "S5", epic: "EPIC-010", owner: "A", hours: 3, status: "done", deps: ["S0-T17"] },
  { id: "S5-T11", title: "Create incident response playbook", sprint: "S5", epic: "EPIC-010", owner: "B", hours: 3, status: "done", deps: [] },
  { id: "S5-T12", title: "Load testing (50 concurrent users)", sprint: "S5", epic: "EPIC-010", owner: "A", hours: 4, status: "done", deps: [] },
  // Sprint 6 -- Launch (9 tasks)
  { id: "S6-T01", title: "Deploy production environment (Terraform)", sprint: "S6", epic: "EPIC-011", owner: "A", hours: 4, status: "done", deps: [] },
  { id: "S6-T02", title: "Create demo environment + synthetic data", sprint: "S6", epic: "EPIC-011", owner: "A", hours: 3, status: "done", deps: ["S6-T01"] },
  { id: "S6-T03", title: "Pilot practice onboarding (Practice #1)", sprint: "S6", epic: "EPIC-011", owner: "B", hours: 4, status: "pending", deps: ["S5-T05"] },
  { id: "S6-T04", title: "Conduct on-site training session", sprint: "S6", epic: "EPIC-011", owner: "B", hours: 6, status: "pending", deps: ["S6-T03"] },
  { id: "S6-T05", title: "Configure pilot success metrics tracking", sprint: "S6", epic: "EPIC-011", owner: "B", hours: 3, status: "done", deps: ["S4-T09"] },
  { id: "S6-T06", title: "Set up daily monitoring rotation", sprint: "S6", epic: "EPIC-011", owner: "A", hours: 2, status: "done", deps: ["S5-T10"] },
  { id: "S6-T07", title: "Configure automated backup verification", sprint: "S6", epic: "EPIC-011", owner: "A", hours: 2, status: "done", deps: ["S0-T14"] },
  { id: "S6-T08", title: "Create pilot feedback channel", sprint: "S6", epic: "EPIC-011", owner: "BOTH", hours: 1, status: "done", deps: [] },
  { id: "S6-T09", title: "Launch day go-live support", sprint: "S6", epic: "EPIC-011", owner: "BOTH", hours: 8, status: "pending", deps: ["S6-T03"] },
  // Sprint 2.5 -- Device + Context (8 tasks)
  { id: "S2.5-T01", title: "Device MCP Server (8 wearable tools)", sprint: "S2.5", epic: "EPIC-012", owner: "A", hours: 6, status: "done", deps: [] },
  { id: "S2.5-T02", title: "Context Rehydration Engine (17 change types)", sprint: "S2.5", epic: "EPIC-013", owner: "A", hours: 6, status: "done", deps: ["S1-T08"] },
  { id: "S2.5-T03", title: "Context Freshness Monitor (scoring 0.0-1.0)", sprint: "S2.5", epic: "EPIC-013", owner: "A", hours: 4, status: "done", deps: ["S2.5-T02"] },
  { id: "S2.5-T04", title: "Context MCP Server (4 tools)", sprint: "S2.5", epic: "EPIC-013", owner: "A", hours: 3, status: "done", deps: ["S2.5-T02"] },
  { id: "S2.5-T05", title: "ADR-006: Patient Context Rehydration", sprint: "S2.5", epic: "EPIC-013", owner: "B", hours: 2, status: "done", deps: [] },
  { id: "S2.5-T06", title: "ADR-007: Wearable/IoT Integration", sprint: "S2.5", epic: "EPIC-012", owner: "B", hours: 2, status: "done", deps: [] },
  { id: "S2.5-T07", title: "ADR-008: A2A Agent Communication", sprint: "S2.5", epic: "EPIC-012", owner: "B", hours: 3, status: "done", deps: [] },
  { id: "S2.5-T08", title: "A2A Protocol reference guide", sprint: "S2.5", epic: "EPIC-012", owner: "B", hours: 2, status: "done", deps: ["S2.5-T07"] },
  // Sprint 3F -- Admin Phase 1 (9 tasks)
  { id: "S3F-T01", title: "Commit Sprint 2.5 backend files", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 0.5, status: "done", deps: [] },
  { id: "S3F-T02", title: "Fix E2E bug: claims analytics selector", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 0.5, status: "done", deps: [] },
  { id: "S3F-T03", title: "Device Management page (/settings/devices)", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 4, status: "done", deps: ["S3F-T01"] },
  { id: "S3F-T04", title: "Context Freshness Dashboard (/settings/context)", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 5, status: "done", deps: ["S3F-T01"] },
  { id: "S3F-T05", title: "System Health Dashboard (/settings/system)", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 5, status: "done", deps: ["S3F-T01"] },
  { id: "S3F-T06", title: "Update Settings landing with 3 new cards", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 1, status: "done", deps: ["S3F-T03"] },
  { id: "S3F-T07", title: "Update E2E demo for new pages", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 2, status: "done", deps: ["S3F-T06"] },
  { id: "S3F-T08", title: "Vault docs: EPIC-014, masterplan, exec plan", sprint: "S3F", epic: "EPIC-014", owner: "B", hours: 1, status: "done", deps: [] },
  { id: "S3F-T09", title: "Verify + deploy: build, E2E, push", sprint: "S3F", epic: "EPIC-014", owner: "A", hours: 1, status: "done", deps: [] },
];

// --- View Components ---

const VIEW_TABS: { key: ViewKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "list", label: "List", icon: List },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "stats", label: "Stats", icon: BarChart3 },
];

// --- Sprint Velocity Widget ---

function SprintVelocityWidget() {
  const avgVelocity = Math.round(
    SPRINTS.filter((s) => s.status === "done").reduce((sum, s) => sum + s.doneTasks, 0) /
    SPRINTS.filter((s) => s.status === "done").length
  );
  const maxPlanned = Math.max(...SPRINTS.map((s) => s.plannedTasks));

  return (
    <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--medos-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--medos-navy)]">Sprint Velocity</h3>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span className="text-[var(--medos-gray-500)]">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[var(--medos-gray-200)] border border-dashed border-[var(--medos-gray-400)]" />
            <span className="text-[var(--medos-gray-500)]">Planned</span>
          </div>
          <span className="text-[var(--medos-gray-400)]">|</span>
          <span className="font-semibold text-[var(--medos-navy)]">Avg: {avgVelocity} tasks/sprint</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-24">
        {SPRINTS.map((sprint) => {
          const sc = SPRINT_COLORS[sprint.id] || SPRINT_COLORS.S0;
          const completedHeight = Math.round((sprint.doneTasks / maxPlanned) * 100);
          const plannedHeight = Math.round((sprint.plannedTasks / maxPlanned) * 100);
          return (
            <div key={sprint.id} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative flex items-end justify-center" style={{ height: "80px" }}>
                <div
                  className="absolute bottom-0 w-full rounded-t border border-dashed border-[var(--medos-gray-300)] bg-[var(--medos-gray-50)]"
                  style={{ height: `${plannedHeight}%` }}
                />
                <div
                  className={cn(
                    "relative z-10 w-3/4 rounded-t transition-all",
                    sprint.status === "done" ? "bg-emerald-400" : "bg-amber-400"
                  )}
                  style={{ height: `${completedHeight}%` }}
                />
              </div>
              <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded", sc.bg, sc.text)}>{sprint.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Blocked Tasks Banner ---

function BlockedTasksBanner() {
  const blockedTasks = useMemo(() => {
    const doneIds = new Set(TASKS.filter((t) => t.status === "done").map((t) => t.id));
    return TASKS.filter(
      (t) => t.status === "pending" && t.deps.length > 0 && t.deps.some((d) => !doneIds.has(d))
    );
  }, []);

  const pendingWithDeps = TASKS.filter(
    (t) => t.status === "pending" && t.deps.length > 0
  );

  if (pendingWithDeps.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-amber-800">
              {pendingWithDeps.length} Tasks Waiting on Dependencies
            </h4>
            {blockedTasks.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                {blockedTasks.length} truly blocked
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {pendingWithDeps.map((task) => {
              const sc = SPRINT_COLORS[task.sprint] || SPRINT_COLORS.S0;
              return (
                <div
                  key={task.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-amber-200 shadow-sm"
                >
                  <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded", sc.bg, sc.text)}>
                    {task.id}
                  </span>
                  <span className="text-[11px] text-amber-800 font-medium truncate max-w-[200px]">
                    {task.title}
                  </span>
                  <span className="text-[9px] text-amber-500 font-mono">
                    needs {task.deps.join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const sc = SPRINT_COLORS[task.sprint] || SPRINT_COLORS.S0;
  const ec = EPIC_COLORS[task.epic] || EPIC_COLORS["EPIC-001"];
  const ow = OWNER_STYLES[task.owner];
  return (
    <div className="bg-white rounded-lg border border-[var(--medos-gray-200)] shadow-medos-sm p-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border", sc.bg, sc.text, sc.border)}>
          {task.id}
        </span>
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", ow.bg, ow.text)}>
          {ow.label}
        </span>
      </div>
      <p className="text-xs font-medium text-[var(--medos-gray-900)] leading-tight line-clamp-2 mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", ec.bg, ec.text)}>
          {task.epic.replace("EPIC-0", "E")}
        </span>
        <span className="text-[10px] text-[var(--medos-gray-500)] tabular-nums">{task.hours}h</span>
      </div>
    </div>
  );
}

function KanbanColumn({ title, tasks, icon: Icon, color }: { title: string; tasks: Task[]; icon: typeof Circle; color: string }) {
  const [showAll, setShowAll] = useState(false);
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  const displayed = showAll ? tasks : tasks.slice(0, 15);
  const remaining = tasks.length - 15;

  return (
    <div className="flex flex-col min-h-0">
      <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-t-xl border border-b-0 border-[var(--medos-gray-200)]", color)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-auto text-xs font-medium tabular-nums">{tasks.length} tasks</span>
        <span className="text-[10px] text-[var(--medos-gray-500)] tabular-nums">{totalHours}h</span>
      </div>
      <div className="flex-1 bg-[var(--medos-gray-50)] rounded-b-xl border border-t-0 border-[var(--medos-gray-200)] p-2 space-y-2 overflow-y-auto max-h-[600px]">
        {displayed.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {!showAll && remaining > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2 text-xs font-medium text-[var(--medos-primary)] hover:text-[var(--medos-primary-hover)] transition-colors"
          >
            Show {remaining} more...
          </button>
        )}
        {tasks.length === 0 && (
          <p className="text-xs text-[var(--medos-gray-400)] text-center py-4">No tasks</p>
        )}
      </div>
    </div>
  );
}

function BoardView({ sprintFilter, epicFilter }: { sprintFilter: string; epicFilter: string }) {
  const filtered = useMemo(() => {
    let t = TASKS;
    if (sprintFilter !== "All") t = t.filter((x) => x.sprint === sprintFilter);
    if (epicFilter !== "All") t = t.filter((x) => x.epic === epicFilter);
    return t;
  }, [sprintFilter, epicFilter]);

  const pending = filtered.filter((t) => t.status === "pending");
  const inProgress = filtered.filter((t) => t.status === "in-progress");
  const done = filtered.filter((t) => t.status === "done");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <KanbanColumn title="Pending" tasks={pending} icon={Circle} color="bg-gray-50 text-gray-700" />
      <KanbanColumn title="In Progress" tasks={inProgress} icon={Loader2} color="bg-amber-50 text-amber-700" />
      <KanbanColumn title="Done" tasks={done} icon={CheckCircle2} color="bg-emerald-50 text-emerald-700" />
    </div>
  );
}

type SortKey = "id" | "title" | "sprint" | "epic" | "owner" | "hours" | "status";

function ListView({ sprintFilter, epicFilter }: { sprintFilter: string; epicFilter: string }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let t = TASKS;
    if (sprintFilter !== "All") t = t.filter((x) => x.sprint === sprintFilter);
    if (epicFilter !== "All") t = t.filter((x) => x.epic === epicFilter);
    if (search) {
      const q = search.toLowerCase();
      t = t.filter((x) => x.id.toLowerCase().includes(q) || x.title.toLowerCase().includes(q) || x.epic.toLowerCase().includes(q));
    }
    return [...t].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sprintFilter, epicFilter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      onClick={() => toggleSort(col)}
      className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-3 py-2.5 cursor-pointer hover:text-[var(--medos-gray-700)] select-none whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === col && <span className="text-[var(--medos-primary)]">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
      </span>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
        <input
          type="text"
          placeholder="Search tasks by ID, title, or EPIC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--medos-gray-200)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent placeholder:text-[var(--medos-gray-400)]"
        />
      </div>
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="w-6 px-2" />
                <SortHeader label="ID" col="id" />
                <SortHeader label="Task" col="title" />
                <SortHeader label="Sprint" col="sprint" />
                <SortHeader label="EPIC" col="epic" />
                <SortHeader label="Owner" col="owner" />
                <SortHeader label="Est." col="hours" />
                <SortHeader label="Status" col="status" />
                <th className="text-left text-[10px] font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-3 py-2.5">Deps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((task) => {
                const sc = SPRINT_COLORS[task.sprint] || SPRINT_COLORS.S0;
                const ss = STATUS_STYLES[task.status];
                const ec = EPIC_COLORS[task.epic] || EPIC_COLORS["EPIC-001"];
                const ow = OWNER_STYLES[task.owner];
                const isOpen = expanded === task.id;
                return (
                  <tr
                    key={task.id}
                    onClick={() => setExpanded(isOpen ? null : task.id)}
                    className="hover:bg-[var(--medos-gray-50)] transition-all cursor-pointer"
                  >
                    <td className="px-2 text-[var(--medos-gray-400)]">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border", sc.bg, sc.text, sc.border)}>
                        {task.id}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-[var(--medos-gray-900)] max-w-[300px]">
                      <span className="line-clamp-1">{task.title}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", sc.bg, sc.text)}>
                        {task.sprint}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", ec.bg, ec.text)}>
                        {task.epic.replace("EPIC-0", "E")}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", ow.bg, ow.text)}>
                        {ow.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--medos-gray-700)] tabular-nums text-right">{task.hours}h</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", ss.bg, ss.text, ss.border)}>
                        {ss.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-[var(--medos-gray-500)] font-mono">
                      {task.deps.length > 0 ? task.deps.join(", ") : "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-[var(--medos-gray-100)] text-xs text-[var(--medos-gray-500)]">
          Showing {filtered.length} of {TASKS.length} tasks
        </div>
      </div>
    </div>
  );
}

function TimelineView() {
  const maxTasks = Math.max(...SPRINTS.map((s) => s.totalTasks));

  return (
    <div className="space-y-6">
      {/* Sprint bars */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Sprint Timeline</h3>
        <div className="space-y-3">
          {SPRINTS.map((sprint) => {
            const sc = SPRINT_COLORS[sprint.id] || SPRINT_COLORS.S0;
            const pct = Math.round((sprint.doneTasks / sprint.totalTasks) * 100);
            const barWidth = Math.round((sprint.totalTasks / maxTasks) * 100);
            const statusColor = sprint.status === "done" ? "bg-emerald-400" : sprint.status === "in-progress" ? "bg-amber-400" : "bg-gray-300";
            const trackColor = sprint.status === "done" ? "bg-emerald-100" : sprint.status === "in-progress" ? "bg-amber-100" : "bg-gray-100";

            return (
              <div key={sprint.id} className="flex items-center gap-3">
                <div className="w-12 flex-shrink-0">
                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border", sc.bg, sc.text, sc.border)}>
                    {sprint.id}
                  </span>
                </div>
                <div className="w-28 flex-shrink-0">
                  <p className="text-xs font-medium text-[var(--medos-gray-900)]">{sprint.name}</p>
                  <p className="text-[10px] text-[var(--medos-gray-500)]">{sprint.dates}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("h-7 rounded-lg overflow-hidden", trackColor)} style={{ width: `${barWidth}%` }}>
                    <div className={cn("h-full rounded-lg transition-all duration-500", statusColor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="w-24 flex-shrink-0 text-right">
                  <span className="text-xs font-semibold text-[var(--medos-gray-900)] tabular-nums">{sprint.doneTasks}/{sprint.totalTasks}</span>
                  <span className="text-[10px] text-[var(--medos-gray-500)] ml-1">({pct}%)</span>
                </div>
                <div className="w-6 flex-shrink-0 text-center">
                  {sprint.status === "done" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : sprint.status === "in-progress" ? (
                    <Loader2 className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Milestones</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--medos-gray-200)]" />
          <div className="space-y-4">
            {MILESTONES.map((m) => {
              const isDone = m.status === "done";
              return (
                <div key={m.id} className="flex items-start gap-4 relative">
                  <div className={cn("relative z-10 flex items-center justify-center w-8 h-8 rounded-lg", isDone ? "bg-emerald-100" : "bg-gray-100")}>
                    <Diamond className={cn("w-4 h-4", isDone ? "text-emerald-600" : "text-gray-400")} />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--medos-gray-900)]">{m.id}</span>
                      <span className="text-xs text-[var(--medos-gray-500)]">{m.date}</span>
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                        isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"
                      )}>
                        {isDone ? "Done" : "Pending"}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--medos-gray-700)] mt-0.5">{m.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsView() {
  const totalTasks = TASKS.length;
  const doneTasks = TASKS.filter((t) => t.status === "done").length;
  const inProgressTasks = TASKS.filter((t) => t.status === "in-progress").length;
  const pendingTasks = TASKS.filter((t) => t.status === "pending").length;
  const pctComplete = Math.round((doneTasks / totalTasks) * 100);
  const totalHours = TASKS.reduce((s, t) => s + t.hours, 0);

  const daysRemaining = Math.max(0, Math.ceil((new Date("2026-05-29").getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const epicsInProgress = EPICS.filter((e) => e.status === "in-progress").length;
  const epicsDone = EPICS.filter((e) => e.status === "done").length;

  const ownerA = TASKS.filter((t) => t.owner === "A").length;
  const ownerB = TASKS.filter((t) => t.owner === "B").length;
  const ownerBoth = TASKS.filter((t) => t.owner === "BOTH").length;

  const maxSprintTasks = Math.max(...SPRINTS.map((s) => s.totalTasks));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--medos-primary-light)]">
              <List className="w-4.5 h-4.5 text-[var(--medos-primary)]" />
            </div>
            <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Total Tasks</p>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{totalTasks}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span className="text-emerald-600 font-medium">{doneTasks} done</span>
            <span className="text-[var(--medos-gray-300)]">|</span>
            <span className="text-amber-600 font-medium">{inProgressTasks} active</span>
            <span className="text-[var(--medos-gray-300)]">|</span>
            <span className="text-gray-500 font-medium">{pendingTasks} pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Completion</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-[var(--medos-navy)]">{pctComplete}%</p>
            <p className="text-xs text-[var(--medos-gray-500)] mb-0.5">{totalHours}h total</p>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--medos-gray-100)] mt-3">
            <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${pctComplete}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50">
              <Target className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">EPICs</p>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{EPICS.length}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span className="text-emerald-600 font-medium">{epicsDone} done</span>
            <span className="text-[var(--medos-gray-300)]">|</span>
            <span className="text-amber-600 font-medium">{epicsInProgress} active</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50">
              <Clock className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <p className="text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider">Days Left</p>
          </div>
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{daysRemaining}</p>
          <p className="text-[10px] text-[var(--medos-gray-500)] mt-2">Target: May 29, 2026</p>
        </div>
      </div>

      {/* Sprint Velocity */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Sprint Velocity</h3>
        <div className="space-y-2.5">
          {SPRINTS.map((sprint) => {
            const sc = SPRINT_COLORS[sprint.id] || SPRINT_COLORS.S0;
            const barPct = Math.round((sprint.doneTasks / maxSprintTasks) * 100);
            return (
              <div key={sprint.id} className="flex items-center gap-3">
                <div className="w-10 flex-shrink-0">
                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold", sc.bg, sc.text)}>
                    {sprint.id}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-6 bg-[var(--medos-gray-100)] rounded-md overflow-hidden">
                    <div
                      className={cn("h-full rounded-md flex items-center px-2", sprint.status === "done" ? "bg-emerald-400" : "bg-amber-400")}
                      style={{ width: `${barPct}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{sprint.doneTasks}</span>
                    </div>
                  </div>
                </div>
                <div className="w-20 flex-shrink-0 text-right">
                  <span className="text-xs text-[var(--medos-gray-500)]">{sprint.hours}h</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EPIC Progress */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">EPIC Progress</h3>
        <div className="space-y-3">
          {EPICS.map((epic) => {
            const ec = EPIC_COLORS[epic.id] || EPIC_COLORS["EPIC-001"];
            const pct = Math.round((epic.done / epic.tasks) * 100);
            const ss = STATUS_STYLES[epic.status];
            return (
              <div key={epic.id} className="flex items-center gap-3">
                <div className="w-16 flex-shrink-0">
                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold", ec.bg, ec.text)}>
                    {epic.id.replace("EPIC-0", "E")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--medos-gray-900)] truncate">{epic.name}</span>
                    <span className="text-[10px] text-[var(--medos-gray-500)] tabular-nums ml-2">{epic.done}/{epic.tasks}</span>
                  </div>
                  <div className="h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-400" : "bg-amber-400")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 flex-shrink-0 text-right">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", ss.bg, ss.text, ss.border)}>
                    {ss.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Allocation */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Team Allocation</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex h-8 rounded-lg overflow-hidden mb-3">
              <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${Math.round((ownerA / totalTasks) * 100)}%` }}>
                <span className="text-[10px] font-bold text-white">A</span>
              </div>
              <div className="bg-purple-400 flex items-center justify-center" style={{ width: `${Math.round((ownerB / totalTasks) * 100)}%` }}>
                <span className="text-[10px] font-bold text-white">B</span>
              </div>
              <div className="bg-teal-400 flex items-center justify-center" style={{ width: `${Math.round((ownerBoth / totalTasks) * 100)}%` }}>
                <span className="text-[10px] font-bold text-white">A+B</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-400" />
                <span className="text-[var(--medos-gray-600)]">Person A: {ownerA} ({Math.round((ownerA / totalTasks) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-purple-400" />
                <span className="text-[var(--medos-gray-600)]">Person B: {ownerB} ({Math.round((ownerB / totalTasks) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-teal-400" />
                <span className="text-[var(--medos-gray-600)]">Both: {ownerBoth} ({Math.round((ownerBoth / totalTasks) * 100)}%)</span>
              </div>
            </div>
          </div>

          <div>
            <div className="space-y-1.5">
              {SPRINTS.map((s) => {
                const sc = SPRINT_COLORS[s.id] || SPRINT_COLORS.S0;
                return (
                  <div key={s.id} className="flex items-center gap-2 text-[10px]">
                    <span className={cn("inline-flex items-center px-1 py-0.5 rounded font-bold w-8 justify-center", sc.bg, sc.text)}>
                      {s.id}
                    </span>
                    <div className="flex h-4 flex-1 rounded overflow-hidden">
                      <div className="bg-blue-300" style={{ width: `${Math.round((s.owner_a / s.totalTasks) * 100)}%` }} />
                      <div className="bg-purple-300" style={{ width: `${Math.round((s.owner_b / s.totalTasks) * 100)}%` }} />
                      <div className="bg-teal-300" style={{ width: `${Math.round((s.owner_both / s.totalTasks) * 100)}%` }} />
                    </div>
                    <span className="text-[var(--medos-gray-500)] tabular-nums w-8 text-right">{s.totalTasks}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function AdminProjectPage() {
  const [view, setView] = useState<ViewKey>("board");
  const [sprintFilter, setSprintFilter] = useState("All");
  const [epicFilter, setEpicFilter] = useState("All");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <LayoutGrid className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Project Tracker</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            MedOS Phase 1 -- Foundation to Pilot (90 days, {TASKS.length} tasks)
          </p>
        </div>
      </div>

      {/* Sprint Velocity Widget */}
      <SprintVelocityWidget />

      {/* Blocked Tasks Banner */}
      <BlockedTasksBanner />

      {/* Controls: View Toggle + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* View Toggle */}
        <div className="flex items-center bg-[var(--medos-gray-100)] rounded-lg p-1">
          {VIEW_TABS.map((tab) => {
            const isActive = view === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  isActive
                    ? "bg-white text-[var(--medos-primary)] shadow-medos-sm"
                    : "text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)]"
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters (only for Board + List) */}
        {(view === "board" || view === "list") && (
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-4 h-4 text-[var(--medos-gray-400)]" />
            <div className="relative">
              <select
                value={sprintFilter}
                onChange={(e) => setSprintFilter(e.target.value)}
                className="appearance-none bg-white border border-[var(--medos-gray-200)] rounded-lg pl-3 pr-7 py-1.5 text-xs font-medium text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)]"
              >
                {SPRINT_IDS.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All Sprints" : s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--medos-gray-400)] pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={epicFilter}
                onChange={(e) => setEpicFilter(e.target.value)}
                className="appearance-none bg-white border border-[var(--medos-gray-200)] rounded-lg pl-3 pr-7 py-1.5 text-xs font-medium text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)]"
              >
                {EPIC_IDS.map((e) => (
                  <option key={e} value={e}>{e === "All" ? "All EPICs" : e}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--medos-gray-400)] pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Active View */}
      {view === "board" && <BoardView sprintFilter={sprintFilter} epicFilter={epicFilter} />}
      {view === "list" && <ListView sprintFilter={sprintFilter} epicFilter={epicFilter} />}
      {view === "timeline" && <TimelineView />}
      {view === "stats" && <StatsView />}
    </div>
  );
}
