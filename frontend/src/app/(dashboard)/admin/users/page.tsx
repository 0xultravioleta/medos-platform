"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  MoreHorizontal,
  Mail,
  Clock,
  Key,
  Lock,
  Unlock,
  Eye,
  Edit,
  Trash2,
  Send,
  RotateCw,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Globe,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =============================================
   TYPES
   ============================================= */

type UserRole = "physician" | "nurse" | "ma" | "biller" | "front_desk" | "admin";
type UserStatus = "active" | "inactive";
type AuditAction = "login" | "read" | "search" | "export" | "write" | "failed_login";
type AuditOutcome = "success" | "failure";
type TabKey = "directory" | "roles" | "abac" | "invite" | "audit";

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLogin: string;
  location: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  sentAt: string;
  expiresAt: string;
}

interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  active: boolean;
  scope: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  resourceType: string;
  ipAddress: string;
  outcome: AuditOutcome;
  detail: string;
}

/* =============================================
   MOCK DATA
   ============================================= */

const MOCK_USERS: MockUser[] = [
  { id: "U-001", name: "Dr. Sarah Chen", email: "sarah.chen@sunshine-ortho.com", role: "physician", status: "active", mfaEnabled: true, lastLogin: "2026-03-01T09:12:00Z", location: "Sunshine Orthopedics" },
  { id: "U-002", name: "Maria Rodriguez", email: "maria.r@sunshine-ortho.com", role: "biller", status: "active", mfaEnabled: true, lastLogin: "2026-03-01T08:45:00Z", location: "Sunshine Orthopedics" },
  { id: "U-003", name: "James Wilson", email: "james.w@sunshine-ortho.com", role: "nurse", status: "active", mfaEnabled: false, lastLogin: "2026-02-28T16:30:00Z", location: "Sunshine Orthopedics" },
  { id: "U-004", name: "Emily Park", email: "emily.p@sunshine-ortho.com", role: "admin", status: "active", mfaEnabled: true, lastLogin: "2026-03-01T10:00:00Z", location: "Sunshine Orthopedics" },
  { id: "U-005", name: "Dr. Michael Torres", email: "m.torres@sunshine-ortho.com", role: "physician", status: "active", mfaEnabled: true, lastLogin: "2026-02-28T14:20:00Z", location: "Sunshine Orthopedics" },
  { id: "U-006", name: "Amanda Reed", email: "a.reed@palmbeach-derm.com", role: "front_desk", status: "active", mfaEnabled: true, lastLogin: "2026-03-01T07:55:00Z", location: "Palm Beach Dermatology" },
];

const PERMISSIONS = [
  "patient/*.read",
  "patient/*.write",
  "encounter/*.read",
  "encounter/*.write",
  "observation/*.write",
  "claim/*.read",
  "claim/*.write",
  "system/*.*",
  "agent.trigger",
  "admin.users",
  "admin.config",
] as const;

type Permission = (typeof PERMISSIONS)[number];
type PermissionLevel = "yes" | "no" | "partial";

const RBAC_MATRIX: Record<UserRole, Record<Permission, PermissionLevel>> = {
  physician: { "patient/*.read": "yes", "patient/*.write": "yes", "encounter/*.read": "yes", "encounter/*.write": "yes", "observation/*.write": "yes", "claim/*.read": "yes", "claim/*.write": "no", "system/*.*": "no", "agent.trigger": "yes", "admin.users": "no", "admin.config": "no" },
  nurse: { "patient/*.read": "yes", "patient/*.write": "partial", "encounter/*.read": "yes", "encounter/*.write": "partial", "observation/*.write": "yes", "claim/*.read": "no", "claim/*.write": "no", "system/*.*": "no", "agent.trigger": "partial", "admin.users": "no", "admin.config": "no" },
  ma: { "patient/*.read": "yes", "patient/*.write": "partial", "encounter/*.read": "yes", "encounter/*.write": "no", "observation/*.write": "yes", "claim/*.read": "no", "claim/*.write": "no", "system/*.*": "no", "agent.trigger": "no", "admin.users": "no", "admin.config": "no" },
  biller: { "patient/*.read": "partial", "patient/*.write": "no", "encounter/*.read": "partial", "encounter/*.write": "no", "observation/*.write": "no", "claim/*.read": "yes", "claim/*.write": "yes", "system/*.*": "no", "agent.trigger": "partial", "admin.users": "no", "admin.config": "no" },
  front_desk: { "patient/*.read": "partial", "patient/*.write": "partial", "encounter/*.read": "partial", "encounter/*.write": "no", "observation/*.write": "no", "claim/*.read": "no", "claim/*.write": "no", "system/*.*": "no", "agent.trigger": "no", "admin.users": "no", "admin.config": "no" },
  admin: { "patient/*.read": "yes", "patient/*.write": "yes", "encounter/*.read": "yes", "encounter/*.write": "yes", "observation/*.write": "yes", "claim/*.read": "yes", "claim/*.write": "yes", "system/*.*": "yes", "agent.trigger": "yes", "admin.users": "yes", "admin.config": "yes" },
};

const ABAC_POLICIES: ABACPolicy[] = [
  { id: "ABAC-001", name: "Care Relationship", description: "Users can only access patients assigned to their care team or with an active encounter", active: true, scope: "Patient, Encounter, Observation" },
  { id: "ABAC-002", name: "Location Restriction", description: "Access restricted to resources at the user's assigned practice location(s)", active: true, scope: "All FHIR Resources" },
  { id: "ABAC-003", name: "Break-the-Glass", description: "Emergency override requiring documented reason; triggers immediate audit alert", active: true, scope: "Patient, MedicationRequest" },
  { id: "ABAC-004", name: "Billing Scope", description: "Billing staff can only view demographic and insurance data, not clinical notes", active: true, scope: "Patient, Coverage, Claim" },
  { id: "ABAC-005", name: "Time-Based Access", description: "Non-physician users restricted to business hours (7 AM - 7 PM) unless on-call", active: false, scope: "All Resources" },
];

const PENDING_INVITES: PendingInvite[] = [
  { id: "INV-001", email: "new.provider@sunshine-ortho.com", role: "physician", sentAt: "2026-02-28T10:30:00Z", expiresAt: "2026-03-07T10:30:00Z" },
];

const AUDIT_LOG: AuditEntry[] = [
  { id: "AUD-001", timestamp: "2026-03-01T10:00:12Z", user: "Emily Park", action: "login", resourceType: "Session", ipAddress: "10.0.1.42", outcome: "success", detail: "Admin login with MFA" },
  { id: "AUD-002", timestamp: "2026-03-01T09:58:30Z", user: "Dr. Sarah Chen", action: "read", resourceType: "Patient", ipAddress: "10.0.1.15", outcome: "success", detail: "Viewed patient P-2847 record" },
  { id: "AUD-003", timestamp: "2026-03-01T09:45:02Z", user: "Maria Rodriguez", action: "search", resourceType: "Claim", ipAddress: "10.0.1.33", outcome: "success", detail: "Search claims by date range" },
  { id: "AUD-004", timestamp: "2026-03-01T09:32:15Z", user: "Dr. Sarah Chen", action: "write", resourceType: "Encounter", ipAddress: "10.0.1.15", outcome: "success", detail: "Created encounter E-3201" },
  { id: "AUD-005", timestamp: "2026-03-01T09:15:44Z", user: "Unknown", action: "failed_login", resourceType: "Session", ipAddress: "203.0.113.42", outcome: "failure", detail: "Invalid credentials - 3rd attempt" },
  { id: "AUD-006", timestamp: "2026-03-01T09:12:00Z", user: "Dr. Sarah Chen", action: "login", resourceType: "Session", ipAddress: "10.0.1.15", outcome: "success", detail: "Physician login with MFA" },
  { id: "AUD-007", timestamp: "2026-03-01T08:55:20Z", user: "James Wilson", action: "read", resourceType: "Patient", ipAddress: "10.0.1.22", outcome: "success", detail: "Viewed patient P-1204 vitals" },
  { id: "AUD-008", timestamp: "2026-03-01T08:45:00Z", user: "Maria Rodriguez", action: "login", resourceType: "Session", ipAddress: "10.0.1.33", outcome: "success", detail: "Biller login with MFA" },
  { id: "AUD-009", timestamp: "2026-03-01T08:30:11Z", user: "Emily Park", action: "export", resourceType: "Report", ipAddress: "10.0.1.42", outcome: "success", detail: "Exported monthly claims report" },
  { id: "AUD-010", timestamp: "2026-03-01T07:55:00Z", user: "Amanda Reed", action: "login", resourceType: "Session", ipAddress: "10.0.2.10", outcome: "success", detail: "Front desk login with MFA" },
];

/* =============================================
   HELPERS
   ============================================= */

const TABS = [
  { key: "directory" as const, label: "Directory", icon: Users },
  { key: "roles" as const, label: "Roles & Permissions", icon: Shield },
  { key: "abac" as const, label: "ABAC Policies", icon: Lock },
  { key: "invite" as const, label: "Invite", icon: UserPlus },
  { key: "audit" as const, label: "Access Audit", icon: FileSearch },
];

const ROLE_STYLES: Record<UserRole, { label: string; bg: string; text: string }> = {
  physician: { label: "Physician", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  nurse: { label: "Nurse", bg: "bg-violet-50 border-violet-200", text: "text-violet-700" },
  ma: { label: "MA", bg: "bg-cyan-50 border-cyan-200", text: "text-cyan-700" },
  biller: { label: "Biller", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  front_desk: { label: "Front Desk", bg: "bg-pink-50 border-pink-200", text: "text-pink-700" },
  admin: { label: "Admin", bg: "bg-red-50 border-red-200", text: "text-red-700" },
};

const ACTION_STYLES: Record<AuditAction, { label: string; bg: string; text: string }> = {
  login: { label: "Login", bg: "bg-blue-100", text: "text-blue-700" },
  read: { label: "Read", bg: "bg-emerald-100", text: "text-emerald-700" },
  search: { label: "Search", bg: "bg-violet-100", text: "text-violet-700" },
  export: { label: "Export", bg: "bg-cyan-100", text: "text-cyan-700" },
  write: { label: "Write", bg: "bg-amber-100", text: "text-amber-700" },
  failed_login: { label: "Failed Login", bg: "bg-red-100", text: "text-red-700" },
};

const PERM_STYLES: Record<PermissionLevel, { label: string; bg: string; text: string }> = {
  yes: { label: "Yes", bg: "bg-emerald-50", text: "text-emerald-700" },
  no: { label: "No", bg: "bg-gray-50", text: "text-gray-400" },
  partial: { label: "Partial", bg: "bg-amber-50", text: "text-amber-700" },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/* =============================================
   TAB COMPONENTS
   ============================================= */

function DirectoryTab() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_USERS.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 h-9 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent w-72"
          />
        </div>
        <p className="text-sm text-[var(--medos-gray-500)]">{filtered.length} users</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Email</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Role</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">MFA</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Last Login</th>
                <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {filtered.map((user) => {
                const roleStyle = ROLE_STYLES[user.role];
                return (
                  <tr key={user.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                    <td className="px-6 py-3">
                      <p className="text-sm font-semibold text-[var(--medos-navy)]">{user.name}</p>
                      <p className="text-xs text-[var(--medos-gray-500)]">{user.location}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-[var(--medos-gray-700)]">{user.email}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", roleStyle.bg, roleStyle.text)}>
                        {roleStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {user.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)]">
                      {formatTimestamp(user.lastLogin)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg text-[var(--medos-gray-400)] hover:text-[var(--medos-primary)] hover:bg-[var(--medos-gray-50)] transition-all" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-[var(--medos-gray-400)] hover:text-[var(--medos-primary)] hover:bg-[var(--medos-gray-50)] transition-all" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-[var(--medos-gray-400)] hover:text-red-600 hover:bg-red-50 transition-all" title="Deactivate">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RolesTab() {
  const roles: UserRole[] = ["physician", "nurse", "ma", "biller", "front_desk", "admin"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">RBAC permission matrix -- {roles.length} roles, {PERMISSIONS.length} permissions</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-4 py-3 sticky left-0 bg-white z-10 min-w-[180px]">
                  Permission
                </th>
                {roles.map((role) => {
                  const rs = ROLE_STYLES[role];
                  return (
                    <th key={role} className="text-center text-xs font-medium uppercase tracking-wider px-3 py-3 min-w-[100px]">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border", rs.bg, rs.text)}>
                        {rs.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {PERMISSIONS.map((perm) => (
                <tr key={perm} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                    <code className="text-xs font-mono text-[var(--medos-navy)]">{perm}</code>
                  </td>
                  {roles.map((role) => {
                    const level = RBAC_MATRIX[role][perm];
                    const style = PERM_STYLES[level];
                    return (
                      <td key={`${role}-${perm}`} className="px-3 py-2.5 text-center">
                        <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded text-[10px] font-semibold", style.bg, style.text)}>
                          {style.label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--medos-gray-500)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" /> Full access
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> Partial (scoped)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" /> No access
        </span>
      </div>
    </div>
  );
}

function ABACTab() {
  const [policies, setPolicies] = useState(ABAC_POLICIES);

  const togglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          Attribute-Based Access Control policies layered on top of RBAC
        </p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
          <Lock className="w-4 h-4" />
          Add Policy
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Policy Name</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Description</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Scope</th>
                <th className="text-center text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[var(--medos-primary)]" />
                      <span className="text-sm font-semibold text-[var(--medos-navy)]">{policy.name}</span>
                    </div>
                    <p className="text-[10px] text-[var(--medos-gray-400)] mt-0.5 ml-6">{policy.id}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-[var(--medos-gray-700)] max-w-md">{policy.description}</p>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {policy.scope.split(", ").map((s) => (
                        <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--medos-primary-light)] text-[var(--medos-primary)] text-[10px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => togglePolicy(policy.id)}
                      className="inline-flex items-center gap-1.5"
                    >
                      {policy.active ? (
                        <>
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-700">Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-6 h-6 text-[var(--medos-gray-400)]" />
                          <span className="text-xs font-medium text-[var(--medos-gray-500)]">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InviteTab() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("physician");
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["Sunshine Orthopedics"]);

  const LOCATIONS = ["Sunshine Orthopedics", "Palm Beach Dermatology", "Miami Spine Center"];

  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-6">
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">Invite New User</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-600)] mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
              <input
                type="email"
                placeholder="user@practice.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full pl-10 pr-4 h-10 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-[var(--medos-gray-600)] mb-1.5">Role</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full pl-10 pr-8 h-10 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-700)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="physician">Physician</option>
                <option value="nurse">Nurse</option>
                <option value="ma">Medical Assistant</option>
                <option value="biller">Biller</option>
                <option value="front_desk">Front Desk</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)] pointer-events-none" />
            </div>
          </div>

          {/* Locations */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[var(--medos-gray-600)] mb-1.5">Location Access</label>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => {
                const isSelected = selectedLocations.includes(loc);
                return (
                  <button
                    key={loc}
                    onClick={() => toggleLocation(loc)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      isSelected
                        ? "border-[var(--medos-primary)] bg-[var(--medos-primary-light)] text-[var(--medos-primary)]"
                        : "border-[var(--medos-gray-300)] text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-50)]"
                    )}
                  >
                    <MapPin className="w-3 h-3" />
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all">
            <Send className="w-4 h-4" />
            Send Invitation
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-3">Pending Invitations</h3>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--medos-gray-100)]">
                  <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Sent At</th>
                  <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Expires</th>
                  <th className="text-right text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--medos-gray-100)]">
                {PENDING_INVITES.map((invite) => {
                  const roleStyle = ROLE_STYLES[invite.role];
                  return (
                    <tr key={invite.id} className="hover:bg-[var(--medos-gray-50)] transition-all">
                      <td className="px-6 py-3">
                        <span className="text-sm text-[var(--medos-gray-700)]">{invite.email}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", roleStyle.bg, roleStyle.text)}>
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)]">{formatTimestamp(invite.sentAt)}</td>
                      <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)]">{formatTimestamp(invite.expiresAt)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--medos-primary)] text-[var(--medos-primary)] hover:bg-[var(--medos-primary-light)] text-xs font-medium transition-all">
                            <RotateCw className="w-3 h-3" />
                            Resend
                          </button>
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium transition-all">
                            <XCircle className="w-3 h-3" />
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--medos-gray-500)]">
          Recent access events -- last 24 hours
        </p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--medos-gray-300)] text-[var(--medos-gray-700)] text-sm font-medium hover:bg-[var(--medos-gray-50)] transition-all">
          <FileSearch className="w-4 h-4" />
          Export Log
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--medos-gray-100)]">
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Timestamp</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Action</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Resource</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">IP Address</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Outcome</th>
                <th className="text-left text-xs font-medium text-[var(--medos-gray-500)] uppercase tracking-wider px-6 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-100)]">
              {AUDIT_LOG.map((entry) => {
                const actionStyle = ACTION_STYLES[entry.action];
                return (
                  <tr
                    key={entry.id}
                    className={cn(
                      "transition-all",
                      entry.outcome === "failure" ? "bg-red-50/50" : "hover:bg-[var(--medos-gray-50)]"
                    )}
                  >
                    <td className="px-6 py-3 text-sm font-mono text-[var(--medos-gray-600)] whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn("text-sm font-medium", entry.outcome === "failure" ? "text-red-700" : "text-[var(--medos-navy)]")}>
                        {entry.user}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase", actionStyle.bg, actionStyle.text)}>
                        {actionStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-700)]">{entry.resourceType}</td>
                    <td className="px-6 py-3 text-sm font-mono text-[var(--medos-gray-600)]">{entry.ipAddress}</td>
                    <td className="px-6 py-3">
                      {entry.outcome === "success" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                          <XCircle className="w-3.5 h-3.5" />
                          Failure
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--medos-gray-600)] max-w-xs truncate">{entry.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =============================================
   MAIN PAGE
   ============================================= */

export default function UsersRolesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("directory");

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
            <Users className="w-5 h-5 text-[var(--medos-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--medos-navy)]">Users & Roles</h1>
            <p className="text-sm text-[var(--medos-gray-500)]">
              Manage user accounts, RBAC roles, ABAC policies, and access audit trails
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-all shadow-medos-sm">
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-[var(--medos-navy)]">{MOCK_USERS.length}</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Total Users</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-emerald-600">{MOCK_USERS.filter((u) => u.mfaEnabled).length}</p>
          <p className="text-xs text-[var(--medos-gray-500)]">MFA Enabled</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-amber-600">{MOCK_USERS.filter((u) => !u.mfaEnabled).length}</p>
          <p className="text-xs text-[var(--medos-gray-500)]">MFA Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] p-4 shadow-medos-sm">
          <p className="text-2xl font-bold text-[var(--medos-primary)]">{PENDING_INVITES.length}</p>
          <p className="text-xs text-[var(--medos-gray-500)]">Pending Invites</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--medos-gray-200)]">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all",
                  isActive
                    ? "border-[var(--medos-primary)] text-[var(--medos-primary)]"
                    : "border-transparent text-[var(--medos-gray-500)] hover:text-[var(--medos-gray-700)] hover:border-[var(--medos-gray-300)]"
                )}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "directory" && <DirectoryTab />}
      {activeTab === "roles" && <RolesTab />}
      {activeTab === "abac" && <ABACTab />}
      {activeTab === "invite" && <InviteTab />}
      {activeTab === "audit" && <AuditTab />}
    </div>
  );
}
