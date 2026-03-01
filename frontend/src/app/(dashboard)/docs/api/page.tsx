import { ApiEndpoint } from "@/components/docs/api-endpoint";

const API_GROUPS = [
  {
    title: "Health",
    description: "System health and readiness endpoints",
    endpoints: [
      {
        method: "GET" as const,
        path: "/health",
        description: "Basic health check",
        responseExample: `{
  "status": "healthy",
  "timestamp": "2026-02-28T15:30:00Z",
  "version": "0.1.0"
}`,
      },
      {
        method: "GET" as const,
        path: "/health/ready",
        description: "Deep readiness check (DB, Redis, MCP)",
        responseExample: `{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "mcp_gateway": "ok"
  }
}`,
      },
    ],
  },
  {
    title: "FHIR R4",
    description: "HL7 FHIR R4 compliant patient resource endpoints",
    endpoints: [
      {
        method: "GET" as const,
        path: "/fhir/r4/Patient",
        description: "Search patients with FHIR parameters",
        responseExample: `{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 1,
  "entry": [{
    "resource": {
      "resourceType": "Patient",
      "id": "p-001",
      "name": [{ "given": ["Sarah"], "family": "Chen" }],
      "birthDate": "1985-03-15",
      "gender": "female"
    }
  }]
}`,
      },
      {
        method: "POST" as const,
        path: "/fhir/r4/Patient",
        description: "Create a new patient resource",
        requestExample: `{
  "resourceType": "Patient",
  "name": [{ "given": ["Sarah"], "family": "Chen" }],
  "birthDate": "1985-03-15",
  "gender": "female",
  "telecom": [{ "system": "phone", "value": "555-0101" }]
}`,
        responseExample: `{
  "resourceType": "Patient",
  "id": "p-007",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2026-02-28T15:30:00Z"
  }
}`,
      },
      {
        method: "GET" as const,
        path: "/fhir/r4/Patient/:id",
        description: "Read a specific patient by ID",
        responseExample: `{
  "resourceType": "Patient",
  "id": "p-001",
  "name": [{ "given": ["Sarah"], "family": "Chen" }],
  "birthDate": "1985-03-15",
  "gender": "female"
}`,
      },
      {
        method: "PUT" as const,
        path: "/fhir/r4/Patient/:id",
        description: "Update an existing patient resource",
        requestExample: `{
  "resourceType": "Patient",
  "id": "p-001",
  "name": [{ "given": ["Sarah"], "family": "Chen-Martinez" }]
}`,
      },
      {
        method: "GET" as const,
        path: "/fhir/r4/Patient/:id/_history",
        description: "Get version history for a patient resource",
      },
      {
        method: "POST" as const,
        path: "/fhir/r4/Patient/_search",
        description: "Advanced search using POST body parameters",
        requestExample: `{
  "name": "Chen",
  "birthdate": "ge1985-01-01",
  "_count": 10
}`,
      },
    ],
  },
  {
    title: "Mock API",
    description: "Demo data endpoints for frontend development",
    endpoints: [
      {
        method: "GET" as const,
        path: "/api/v1/patients",
        description: "List all patients with demographics",
        responseExample: `{
  "patients": [{
    "id": "p-001",
    "name": "Sarah Chen",
    "dob": "1985-03-15",
    "insurance": "BCBS PPO",
    "nextAppt": "2026-03-01T09:00:00Z"
  }],
  "total": 24
}`,
      },
      {
        method: "GET" as const,
        path: "/api/v1/appointments",
        description: "List today's appointments",
      },
      {
        method: "GET" as const,
        path: "/api/v1/claims",
        description: "List claims with status tracking",
      },
      {
        method: "GET" as const,
        path: "/api/v1/analytics/summary",
        description: "Dashboard analytics summary data",
      },
    ],
  },
  {
    title: "MCP (Model Context Protocol)",
    description: "Agent-to-server communication via MCP",
    endpoints: [
      {
        method: "GET" as const,
        path: "/mcp/tools",
        description: "List all registered MCP tools across servers",
        responseExample: `{
  "tools": [
    {
      "name": "fhir_read",
      "server": "fhir",
      "description": "Read a FHIR resource by type and ID",
      "phi_level": "full",
      "requires_approval": false
    }
  ],
  "total": 32
}`,
      },
      {
        method: "POST" as const,
        path: "/mcp/messages",
        description: "Send JSON-RPC message to MCP server",
        requestExample: `{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "fhir_read",
    "arguments": {
      "resource_type": "Patient",
      "id": "p-001"
    }
  },
  "id": 1
}`,
        responseExample: `{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "{ \\"resourceType\\": \\"Patient\\", ... }"
    }]
  },
  "id": 1
}`,
      },
      {
        method: "GET" as const,
        path: "/mcp/sse",
        description: "Server-Sent Events stream for real-time MCP updates",
      },
    ],
  },
  {
    title: "Agent Tasks",
    description: "AI agent task management and human-in-the-loop review",
    endpoints: [
      {
        method: "GET" as const,
        path: "/api/v1/agent-tasks",
        description: "List agent tasks with status filtering",
        responseExample: `{
  "tasks": [{
    "id": "task-001",
    "agent": "clinical_scribe",
    "type": "soap_note",
    "status": "pending_review",
    "confidence": 0.82,
    "created_at": "2026-02-28T14:30:00Z"
  }]
}`,
      },
      {
        method: "POST" as const,
        path: "/api/v1/agent-tasks/:id/review",
        description: "Submit human review for an agent task",
        requestExample: `{
  "action": "approve",
  "reviewer_notes": "SOAP note looks accurate",
  "modifications": null
}`,
      },
    ],
  },
  {
    title: "Approvals",
    description: "Human-in-the-loop approval workflow for high-risk actions",
    endpoints: [
      {
        method: "GET" as const,
        path: "/api/v1/approvals",
        description: "List all pending approvals",
        responseExample: `{
  "approvals": [{
    "id": "apr-001",
    "type": "prior_auth",
    "patient_id": "p-002",
    "urgency": "high",
    "agent": "prior_auth",
    "confidence": 0.78,
    "created_at": "2026-02-28T14:00:00Z"
  }]
}`,
      },
      {
        method: "GET" as const,
        path: "/api/v1/approvals/:id",
        description: "Get detailed approval with full context",
      },
      {
        method: "POST" as const,
        path: "/api/v1/approvals/:id/approve",
        description: "Approve a pending action",
        requestExample: `{
  "reviewer_id": "dr-smith",
  "notes": "Approved - medical necessity confirmed"
}`,
      },
      {
        method: "POST" as const,
        path: "/api/v1/approvals/:id/reject",
        description: "Reject a pending action",
        requestExample: `{
  "reviewer_id": "dr-smith",
  "reason": "Insufficient documentation for PA request"
}`,
      },
      {
        method: "GET" as const,
        path: "/api/v1/approvals/stats",
        description: "Approval workflow statistics",
        responseExample: `{
  "pending": 5,
  "approved_today": 12,
  "rejected_today": 2,
  "avg_review_time_minutes": 8.3
}`,
      },
    ],
  },
  {
    title: "A2A (Agent-to-Agent)",
    description: "Agent card discovery for inter-agent communication",
    endpoints: [
      {
        method: "GET" as const,
        path: "/.well-known/agent.json",
        description: "A2A agent card with capabilities and auth info",
        responseExample: `{
  "name": "MedOS Platform Agent",
  "version": "0.1.0",
  "description": "Healthcare OS AI agent",
  "capabilities": {
    "fhir": true,
    "billing": true,
    "scheduling": true
  },
  "authentication": {
    "type": "bearer",
    "scheme": "jwt"
  },
  "compliance": ["HIPAA", "SOC2"]
}`,
      },
    ],
  },
];

export default function ApiReferencePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-[var(--medos-navy)]">
          API Reference
        </h1>
        <p className="mt-2 text-[var(--medos-gray-600)] max-w-2xl">
          Complete endpoint documentation for the MedOS FastAPI backend.
          Click any endpoint with examples to expand request/response details.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Endpoints", value: "26" },
          { label: "FHIR Resources", value: "6" },
          { label: "MCP Channels", value: "3" },
          { label: "Auth Required", value: "JWT" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-4 text-center"
          >
            <p className="text-2xl font-bold text-[var(--medos-navy)]">
              {stat.value}
            </p>
            <p className="text-xs text-[var(--medos-gray-500)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Endpoint Groups */}
      {API_GROUPS.map((group) => (
        <div key={group.title}>
          <div className="mb-3">
            <h2 className="text-xl font-semibold text-[var(--medos-navy)]">
              {group.title}
            </h2>
            <p className="text-sm text-[var(--medos-gray-500)]">
              {group.description}
            </p>
          </div>
          <div className="space-y-2">
            {group.endpoints.map((endpoint) => (
              <ApiEndpoint
                key={`${endpoint.method}-${endpoint.path}`}
                method={endpoint.method}
                path={endpoint.path}
                description={endpoint.description}
                requestExample={endpoint.requestExample}
                responseExample={endpoint.responseExample}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
