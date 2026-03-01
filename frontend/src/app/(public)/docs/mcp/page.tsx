import { MermaidDiagram } from "@/components/docs/mermaid-diagram";
import { CodeBlock } from "@/components/docs/code-block";

const MCP_SEQUENCE_DIAGRAM = `sequenceDiagram
    participant Client as Claude Code / Agent
    participant GW as MCP Gateway
    participant Auth as Auth Layer
    participant PHI as PHI Policy
    participant Tool as Tool Handler
    participant Audit as Audit Log

    Client->>GW: tools/call (JSON-RPC)
    GW->>Auth: Validate Agent JWT
    Auth-->>GW: Agent Context
    GW->>PHI: Check PHI Access Level
    PHI-->>GW: Allowed
    GW->>Tool: Execute Handler
    Tool-->>GW: Result
    GW->>Audit: Log Event
    GW-->>Client: JSON-RPC Response`;

const MCP_TOOLS: {
  server: string;
  serverColor: string;
  tools: {
    name: string;
    description: string;
    phi: string;
    approval: boolean;
  }[];
}[] = [
  {
    server: "FHIR MCP Server",
    serverColor: "bg-blue-50 text-blue-700",
    tools: [
      { name: "fhir_read", description: "Read a FHIR resource by type and ID", phi: "Full", approval: false },
      { name: "fhir_search", description: "Search FHIR resources with parameters", phi: "Full", approval: false },
      { name: "fhir_create", description: "Create a new FHIR resource", phi: "Full", approval: true },
      { name: "fhir_update", description: "Update an existing FHIR resource", phi: "Full", approval: true },
      { name: "fhir_history", description: "Get version history for a resource", phi: "Full", approval: false },
      { name: "fhir_validate", description: "Validate a FHIR resource against profiles", phi: "None", approval: false },
      { name: "fhir_bundle", description: "Execute a FHIR Bundle transaction", phi: "Full", approval: true },
      { name: "fhir_everything", description: "Patient $everything operation", phi: "Full", approval: false },
      { name: "fhir_encounter_summary", description: "Generate encounter summary", phi: "Full", approval: false },
      { name: "fhir_audit_log", description: "Query FHIR AuditEvent resources", phi: "Metadata", approval: false },
      { name: "fhir_provenance", description: "Track resource provenance chain", phi: "Metadata", approval: false },
      { name: "fhir_batch", description: "Execute batch of FHIR operations", phi: "Full", approval: true },
    ],
  },
  {
    server: "Scribe MCP Server",
    serverColor: "bg-purple-50 text-purple-700",
    tools: [
      { name: "scribe_start_session", description: "Initialize a new scribe recording session", phi: "Full", approval: false },
      { name: "scribe_submit_audio", description: "Submit audio chunk for transcription", phi: "Full", approval: false },
      { name: "scribe_get_transcript", description: "Retrieve current transcript", phi: "Full", approval: false },
      { name: "scribe_get_soap_note", description: "Generate SOAP note from transcript", phi: "Full", approval: false },
      { name: "scribe_submit_review", description: "Submit provider review of SOAP note", phi: "Full", approval: false },
      { name: "scribe_session_status", description: "Get session status and metadata", phi: "Metadata", approval: false },
    ],
  },
  {
    server: "Billing MCP Server",
    serverColor: "bg-emerald-50 text-emerald-700",
    tools: [
      { name: "billing_check_eligibility", description: "Verify patient insurance eligibility (X12 270/271)", phi: "Full", approval: false },
      { name: "billing_generate_claim", description: "Generate X12 837P professional claim", phi: "Full", approval: true },
      { name: "billing_submit_claim", description: "Submit claim to clearinghouse", phi: "Full", approval: true },
      { name: "billing_check_status", description: "Check claim adjudication status (X12 276/277)", phi: "Full", approval: false },
      { name: "billing_parse_eob", description: "Parse X12 835 remittance/EOB", phi: "Full", approval: false },
      { name: "billing_suggest_codes", description: "AI-assisted ICD-10 and CPT code suggestion", phi: "Full", approval: false },
      { name: "billing_validate_claim", description: "Pre-submission claim scrubbing", phi: "Full", approval: false },
      { name: "billing_appeal_denial", description: "Generate denial appeal with clinical evidence", phi: "Full", approval: true },
    ],
  },
  {
    server: "Scheduling MCP Server",
    serverColor: "bg-amber-50 text-amber-700",
    tools: [
      { name: "schedule_find_slots", description: "Find available appointment slots", phi: "None", approval: false },
      { name: "schedule_book", description: "Book a patient appointment", phi: "Limited", approval: false },
      { name: "schedule_cancel", description: "Cancel an existing appointment", phi: "Limited", approval: true },
      { name: "schedule_reschedule", description: "Reschedule an appointment to new slot", phi: "Limited", approval: true },
      { name: "schedule_waitlist", description: "Add patient to cancellation waitlist", phi: "Limited", approval: false },
      { name: "schedule_provider_calendar", description: "Get provider availability calendar", phi: "None", approval: false },
    ],
  },
];

const A2A_CARD = `{
  "name": "MedOS Platform Agent",
  "version": "0.1.0",
  "description": "AI-native Healthcare OS for mid-size specialty practices",
  "url": "https://api.medos.health",
  "authentication": {
    "schemes": ["bearer"],
    "credentials": "JWT issued by Auth0 / Cognito"
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "stateTransitionHistory": true
  },
  "skills": [
    {
      "id": "clinical_scribe",
      "name": "Clinical Scribe",
      "description": "Ambient AI documentation with SOAP note generation"
    },
    {
      "id": "prior_auth",
      "name": "Prior Authorization",
      "description": "Automated PA workflow with X12 278 generation"
    },
    {
      "id": "denial_management",
      "name": "Denial Management",
      "description": "Claim denial analysis, classification, and appeal"
    }
  ],
  "compliance": ["HIPAA", "SOC2", "HITRUST"],
  "defaultInputModes": ["application/json"],
  "defaultOutputModes": ["application/json"]
}`;

export default function McpProtocolPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-[var(--medos-navy)]">
          MCP Protocol
        </h1>
        <p className="mt-2 text-[var(--medos-gray-600)] max-w-2xl">
          MedOS implements the Model Context Protocol (MCP) for structured
          agent-to-tool communication. All 44 tools are registered through a
          central MCP Gateway that enforces authentication, PHI access
          policies, and audit logging.
        </p>
      </div>

      {/* Protocol Flow */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-4">
          Protocol Flow
        </h2>
        <p className="text-sm text-[var(--medos-gray-600)] mb-4">
          Every MCP tool invocation passes through the Gateway, which validates
          the agent identity, checks PHI access policies, executes the tool, and
          creates an immutable audit log entry (FHIR AuditEvent).
        </p>
        <MermaidDiagram chart={MCP_SEQUENCE_DIAGRAM} />
      </div>

      {/* Tool Reference */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[var(--medos-navy)]">
            Tool Reference
          </h2>
          <p className="text-sm text-[var(--medos-gray-500)]">
            44 tools across 6 MCP servers
          </p>
        </div>

        {MCP_TOOLS.map((server) => (
          <div
            key={server.server}
            className="rounded-xl border border-[var(--medos-gray-200)] bg-white overflow-hidden"
          >
            <div className="px-6 py-3 border-b border-[var(--medos-gray-100)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
                {server.server}
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${server.serverColor}`}
              >
                {server.tools.length} tools
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--medos-gray-100)] text-left text-xs font-medium uppercase tracking-wider text-[var(--medos-gray-400)]">
                    <th className="px-6 py-2.5">Tool Name</th>
                    <th className="px-6 py-2.5 hidden sm:table-cell">Description</th>
                    <th className="px-6 py-2.5 text-center">PHI Level</th>
                    <th className="px-6 py-2.5 text-center">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--medos-gray-50)]">
                  {server.tools.map((tool) => (
                    <tr key={tool.name} className="hover:bg-[var(--medos-gray-50)]">
                      <td className="px-6 py-2.5">
                        <code className="text-xs font-mono text-[var(--medos-primary)]">
                          {tool.name}
                        </code>
                      </td>
                      <td className="px-6 py-2.5 text-[var(--medos-gray-600)] hidden sm:table-cell">
                        {tool.description}
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            tool.phi === "Full"
                              ? "bg-red-50 text-red-600"
                              : tool.phi === "Limited"
                                ? "bg-amber-50 text-amber-600"
                                : tool.phi === "Metadata"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {tool.phi}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        {tool.approval ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--medos-gray-400)]">
                            --
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* A2A Agent Card */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-2">
          A2A Agent Card
        </h2>
        <p className="text-sm text-[var(--medos-gray-600)] mb-4">
          Served at <code className="text-xs bg-[var(--medos-gray-50)] px-1.5 py-0.5 rounded">/.well-known/agent.json</code>.
          Enables discovery by other agents and orchestration platforms.
        </p>
        <CodeBlock code={A2A_CARD} language="json" title="agent.json" />
      </div>
    </div>
  );
}
