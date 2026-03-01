import { MermaidDiagram } from "@/components/docs/mermaid-diagram";
import { CodeBlock } from "@/components/docs/code-block";
import { Shield, Lock, Eye, FileCheck, AlertTriangle } from "lucide-react";

const SAFETY_PIPELINE_DIAGRAM = `flowchart TD
    Input[Agent Output] --> Block{Dangerous Content?}
    Block -->|Yes| Blocked[BLOCK - Reject]
    Block -->|No| Warn{Potential Issues?}
    Warn -->|Yes| Warning[WARN - Flag for Review]
    Warn -->|No| Review{Low Confidence?}
    Review -->|Yes| HumanReview[REVIEW - Create Task]
    Review -->|No| Sanitize{Contains PHI?}
    Sanitize -->|Yes, Non-Clinical Agent| Sanitized[SANITIZE - Remove PHI]
    Sanitize -->|No| Pass[PASS - Allow]

    style Blocked fill:#FEE2E2,stroke:#DC2626,color:#991B1B
    style Warning fill:#FEF3C7,stroke:#D97706,color:#92400E
    style HumanReview fill:#DBEAFE,stroke:#2563EB,color:#1E40AF
    style Sanitized fill:#FFF7ED,stroke:#EA580C,color:#9A3412
    style Pass fill:#DCFCE7,stroke:#16A34A,color:#166534`;

const PHI_ACCESS_MATRIX: {
  agentType: string;
  full: boolean;
  limited: boolean;
  metadata: boolean;
  none: boolean;
  description: string;
}[] = [
  {
    agentType: "Clinical Scribe",
    full: true,
    limited: true,
    metadata: true,
    none: true,
    description: "Full PHI access for documentation generation",
  },
  {
    agentType: "Prior Auth",
    full: true,
    limited: true,
    metadata: true,
    none: true,
    description: "Full PHI access for clinical evidence gathering",
  },
  {
    agentType: "Denial Management",
    full: true,
    limited: true,
    metadata: true,
    none: true,
    description: "Full PHI access for appeal letter generation",
  },
  {
    agentType: "Scheduling",
    full: false,
    limited: true,
    metadata: true,
    none: true,
    description: "Name and DOB only -- no clinical data",
  },
  {
    agentType: "Analytics",
    full: false,
    limited: false,
    metadata: true,
    none: true,
    description: "De-identified aggregate data only",
  },
  {
    agentType: "External / Third-party",
    full: false,
    limited: false,
    metadata: false,
    none: true,
    description: "No PHI access -- public data only",
  },
];

const HIPAA_IDENTIFIERS = [
  "Names", "Geographic data", "Dates (except year)", "Phone numbers",
  "Fax numbers", "Email addresses", "SSN", "Medical record numbers",
  "Health plan beneficiary numbers", "Account numbers", "Certificate/license numbers",
  "Vehicle identifiers", "Device identifiers", "Web URLs", "IP addresses",
  "Biometric identifiers", "Full-face photos", "Any other unique identifier",
];

const CREDENTIAL_INJECTION_CODE = `# Agent requests tool execution
async def execute_tool(agent_context: AgentContext, tool_name: str, args: dict):
    # 1. Validate agent identity (JWT)
    agent = await validate_agent_jwt(agent_context.token)

    # 2. Check PHI access policy
    phi_level = get_phi_policy(agent.type, tool_name)
    if not has_sufficient_access(agent, phi_level):
        raise PermissionError("Insufficient PHI access level")

    # 3. Inject credentials (agent never sees raw credentials)
    credentials = await inject_credentials(
        agent_type=agent.type,
        tenant_id=agent_context.tenant_id,
        tool_name=tool_name,
    )

    # 4. Execute with injected credentials
    result = await tool_registry.call(tool_name, args, credentials)

    # 5. Audit log (FHIR AuditEvent)
    await create_audit_event(
        agent=agent,
        tool=tool_name,
        phi_accessed=phi_level != "none",
        outcome="success",
    )

    return result`;

export default function SecurityPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-[var(--medos-navy)]">
          Security
        </h1>
        <p className="mt-2 text-[var(--medos-gray-600)] max-w-2xl">
          MedOS is designed HIPAA-first. Every agent output passes through a
          multi-stage safety pipeline, PHI access is policy-controlled per agent
          type, and all actions produce immutable FHIR AuditEvent records.
        </p>
      </div>

      {/* Key Principles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Shield,
            title: "HIPAA Compliant",
            description: "BAA with AWS and Anthropic. PHI encrypted at rest (AES-256) and in transit (TLS 1.3).",
            color: "bg-blue-50 text-blue-600",
          },
          {
            icon: Lock,
            title: "Zero Trust",
            description: "Every agent request is authenticated via JWT. No implicit trust between services.",
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            icon: Eye,
            title: "Full Auditability",
            description: "Every PHI access creates a FHIR AuditEvent. Immutable, queryable, exportable.",
            color: "bg-purple-50 text-purple-600",
          },
          {
            icon: FileCheck,
            title: "Tenant Isolation",
            description: "Schema-per-tenant with RLS. Per-tenant KMS keys. No data leakage possible.",
            color: "bg-amber-50 text-amber-600",
          },
        ].map((principle) => (
          <div
            key={principle.title}
            className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-5"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${principle.color} mb-3`}
            >
              <principle.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
              {principle.title}
            </h3>
            <p className="mt-1 text-xs text-[var(--medos-gray-600)] leading-relaxed">
              {principle.description}
            </p>
          </div>
        ))}
      </div>

      {/* Safety Pipeline */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-2">
          Safety Pipeline
        </h2>
        <p className="text-sm text-[var(--medos-gray-600)] mb-4">
          Every agent output passes through this 4-stage pipeline before
          reaching the user or being persisted. The pipeline is configurable
          per agent type and action severity.
        </p>
        <MermaidDiagram chart={SAFETY_PIPELINE_DIAGRAM} />

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { stage: "BLOCK", description: "Dangerous, harmful, or clearly incorrect content", color: "border-red-200 bg-red-50 text-red-700" },
            { stage: "WARN", description: "Potentially problematic content flagged for review", color: "border-amber-200 bg-amber-50 text-amber-700" },
            { stage: "REVIEW", description: "Low confidence output queued for human approval", color: "border-blue-200 bg-blue-50 text-blue-700" },
            { stage: "SANITIZE", description: "PHI stripped for non-clinical agent contexts", color: "border-orange-200 bg-orange-50 text-orange-700" },
            { stage: "PASS", description: "Output approved and forwarded to consumer", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
          ].map((stage) => (
            <div
              key={stage.stage}
              className={`rounded-lg border p-3 ${stage.color}`}
            >
              <p className="text-xs font-bold uppercase tracking-wider">
                {stage.stage}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed opacity-80">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* PHI Access Matrix */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-2">
          PHI Access Matrix
        </h2>
        <p className="text-sm text-[var(--medos-gray-600)] mb-4">
          Each agent type has a predefined PHI access level. The MCP Gateway
          enforces these policies at the tool invocation boundary.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--medos-gray-200)] text-left text-xs font-medium uppercase tracking-wider text-[var(--medos-gray-400)]">
                <th className="pb-3 pr-4">Agent Type</th>
                <th className="pb-3 px-4 text-center">Full PHI</th>
                <th className="pb-3 px-4 text-center">Limited PHI</th>
                <th className="pb-3 px-4 text-center">Metadata</th>
                <th className="pb-3 px-4 text-center">Public</th>
                <th className="pb-3 pl-4 hidden sm:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--medos-gray-50)]">
              {PHI_ACCESS_MATRIX.map((row) => (
                <tr key={row.agentType}>
                  <td className="py-3 pr-4 font-medium text-[var(--medos-navy)]">
                    {row.agentType}
                  </td>
                  {[row.full, row.limited, row.metadata, row.none].map(
                    (allowed, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        {allowed ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">
                            Y
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs">
                            N
                          </span>
                        )}
                      </td>
                    )
                  )}
                  <td className="py-3 pl-4 text-xs text-[var(--medos-gray-500)] hidden sm:table-cell">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HIPAA 18 Identifiers */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-semibold text-[var(--medos-navy)]">
            HIPAA 18 Identifiers
          </h2>
        </div>
        <p className="text-sm text-[var(--medos-gray-600)] mb-4">
          These 18 data elements are classified as Protected Health Information
          (PHI) under HIPAA. The safety pipeline sanitizes all of these from
          agent outputs when the consuming context does not have Full PHI
          access.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {HIPAA_IDENTIFIERS.map((id, i) => (
            <div
              key={id}
              className="flex items-center gap-2 rounded-lg bg-[var(--medos-gray-50)] px-3 py-2 text-xs text-[var(--medos-gray-600)]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 flex-shrink-0">
                {i + 1}
              </span>
              {id}
            </div>
          ))}
        </div>
      </div>

      {/* Credential Injection */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-2">
          Credential Injection
        </h2>
        <p className="text-sm text-[var(--medos-gray-600)] mb-4">
          Agents never handle raw credentials. The MCP Gateway injects
          credentials at the tool execution boundary, sourced from AWS Secrets
          Manager with per-tenant KMS encryption. This prevents credential
          leakage through agent context or logs.
        </p>
        <CodeBlock
          code={CREDENTIAL_INJECTION_CODE}
          language="python"
          title="credential_injection.py"
        />
      </div>

      {/* Compliance Summary */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-4">
          Compliance Roadmap
        </h2>
        <div className="space-y-3">
          {[
            {
              framework: "HIPAA",
              status: "Day 1",
              detail: "BAA with AWS + Anthropic, encryption, audit logging, PHI policies",
              color: "border-emerald-200 bg-emerald-50",
              statusColor: "bg-emerald-100 text-emerald-700",
            },
            {
              framework: "SOC 2 Type I",
              status: "Month 3",
              detail: "Security controls documented, access policies, change management",
              color: "border-blue-200 bg-blue-50",
              statusColor: "bg-blue-100 text-blue-700",
            },
            {
              framework: "SOC 2 Type II",
              status: "Month 9",
              detail: "6-month observation period, continuous monitoring, penetration testing",
              color: "border-amber-200 bg-amber-50",
              statusColor: "bg-amber-100 text-amber-700",
            },
            {
              framework: "HITRUST CSF",
              status: "Month 12",
              detail: "Comprehensive framework covering HIPAA, SOC 2, NIST, and ISO 27001",
              color: "border-purple-200 bg-purple-50",
              statusColor: "bg-purple-100 text-purple-700",
            },
          ].map((item) => (
            <div
              key={item.framework}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border p-4 ${item.color}`}
            >
              <span className="text-sm font-bold text-[var(--medos-navy)] min-w-[120px]">
                {item.framework}
              </span>
              <span
                className={`inline-flex self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${item.statusColor}`}
              >
                {item.status}
              </span>
              <span className="text-sm text-[var(--medos-gray-600)]">
                {item.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
