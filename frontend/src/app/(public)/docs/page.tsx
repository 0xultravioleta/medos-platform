import Link from "next/link";
import { Code2, Bot, Network, Shield, ArrowRight } from "lucide-react";
import { MermaidDiagram } from "@/components/docs/mermaid-diagram";

const SYSTEM_ARCHITECTURE = `graph TB
    Client[Next.js Frontend] --> API[FastAPI Backend]
    API --> Gateway[MCP Gateway<br/>Auth + PHI + Audit]
    Gateway --> FHIR[FHIR MCP Server<br/>12 tools]
    Gateway --> Scribe[Scribe MCP Server<br/>6 tools]
    Gateway --> Billing[Billing MCP Server<br/>8 tools]
    Gateway --> Schedule[Scheduling MCP Server<br/>6 tools]
    Gateway --> Device[Device MCP Server<br/>6 tools]
    Gateway --> Context[Context MCP Server<br/>6 tools]
    API --> Agents[LangGraph Agents]
    Agents --> ClinicalScribe[Clinical Scribe]
    Agents --> PriorAuth[Prior Auth]
    Agents --> DenialMgmt[Denial Management]
    API --> A2A[A2A Protocol]
    A2A --> ExternalAgents[External Agents]
    API --> DB[(PostgreSQL<br/>FHIR JSONB)]
    API --> Redis[(Redis Cache)]

    style Client fill:#EFF6FF,stroke:#0066FF,color:#0F172A
    style API fill:#F0FDF4,stroke:#16A34A,color:#0F172A
    style Gateway fill:#FFF7ED,stroke:#EA580C,color:#0F172A
    style Agents fill:#FAF5FF,stroke:#9333EA,color:#0F172A
    style A2A fill:#FDF2F8,stroke:#EC4899,color:#0F172A
    style DB fill:#F1F5F9,stroke:#475569,color:#0F172A
    style Redis fill:#FEF2F2,stroke:#DC2626,color:#0F172A`;

const QUICK_LINKS = [
  {
    title: "API Reference",
    description: "Complete endpoint documentation with request/response examples for all FHIR, MCP, and agent APIs.",
    href: "/docs/api",
    icon: Code2,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Agent Workflows",
    description: "State machine diagrams and confidence routing for Clinical Scribe, Prior Auth, and Denial Management.",
    href: "/docs/agents",
    icon: Bot,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "MCP Protocol",
    description: "Model Context Protocol implementation with 44 tools across 6 MCP servers, A2A protocol for agent-to-agent communication.",
    href: "/docs/mcp",
    icon: Network,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Security",
    description: "HIPAA compliance pipeline, PHI access policies, credential injection, and safety layer architecture.",
    href: "/docs/security",
    icon: Shield,
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function DocsOverviewPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--medos-navy)]">
          MedOS Documentation
        </h1>
        <p className="mt-2 text-[var(--medos-gray-600)] max-w-2xl leading-relaxed">
          Complete technical reference for MedOS Healthcare OS -- the AI-native
          operating system for mid-size specialty practices. Built with FastAPI,
          Next.js 15, FHIR R4, and 10 LangGraph agents.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            FHIR R4
          </span>
          <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
            LangGraph Agents
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            MCP Protocol
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            HIPAA Compliant
          </span>
          <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            SOC 2 Ready
          </span>
        </div>
      </div>

      {/* System Architecture */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-4">
          System Architecture
        </h2>
        <MermaidDiagram chart={SYSTEM_ARCHITECTURE} />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-4">
          Explore the Platform
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex gap-4 rounded-xl border border-[var(--medos-gray-200)] bg-white p-5 transition-all hover:shadow-md hover:border-[var(--medos-primary)]"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${link.color}`}
              >
                <link.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--medos-navy)]">
                    {link.title}
                  </h3>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--medos-gray-400)] transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-1 text-xs text-[var(--medos-gray-600)] leading-relaxed">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-4">
          Technology Stack
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { layer: "Backend", tech: "FastAPI (Python 3.12+), SQLAlchemy 2.0, Pydantic v2" },
            { layer: "Frontend", tech: "Next.js 15, App Router, Server Components" },
            { layer: "Database", tech: "PostgreSQL 17 + pgvector, FHIR JSONB native" },
            { layer: "Cache", tech: "Redis 7+" },
            { layer: "AI / LLM", tech: "Claude API (HIPAA BAA), LangGraph agents" },
            { layer: "Speech", tech: "Whisper v3 (self-hosted GPU)" },
            { layer: "Cloud", tech: "AWS (HIPAA BAA), Terraform IaC" },
            { layer: "Events", tech: "AWS EventBridge" },
            { layer: "Observability", tech: "Langfuse (LLM), CloudWatch (infra)" },
          ].map((item) => (
            <div key={item.layer} className="flex gap-3">
              <div className="w-1 rounded-full bg-[var(--medos-primary)] flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--medos-gray-400)]">
                  {item.layer}
                </p>
                <p className="text-sm text-[var(--medos-gray-600)]">
                  {item.tech}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
