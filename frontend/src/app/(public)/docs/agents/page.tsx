import { MermaidDiagram } from "@/components/docs/mermaid-diagram";
import { Bot, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";

const CLINICAL_SCRIBE_DIAGRAM = `stateDiagram-v2
    [*] --> ReceiveAudio
    ReceiveAudio --> Transcribe
    Transcribe --> GenerateSOAP
    GenerateSOAP --> ReviewCoding
    ReviewCoding --> Finalize: confidence >= 0.85
    ReviewCoding --> HumanReview: confidence < 0.85
    ReviewCoding --> HandleError: error
    Finalize --> [*]
    HumanReview --> [*]
    HandleError --> [*]`;

const PRIOR_AUTH_DIAGRAM = `stateDiagram-v2
    [*] --> ReceiveOrder
    ReceiveOrder --> CheckEligibility
    CheckEligibility --> DetermineRequirements
    DetermineRequirements --> NoAuthRequired: PA not needed
    DetermineRequirements --> GatherClinical: PA required
    GatherClinical --> GenerateX12_278
    GenerateX12_278 --> SubmitToPayer
    SubmitToPayer --> TrackResponse
    TrackResponse --> Approved: approved
    TrackResponse --> Denied: denied
    TrackResponse --> PendInfo: pend / info needed
    PendInfo --> GatherClinical
    Denied --> AutoAppeal: confidence >= 0.90
    Denied --> HumanReview: confidence < 0.90
    NoAuthRequired --> [*]
    Approved --> [*]
    AutoAppeal --> [*]
    HumanReview --> [*]`;

const DENIAL_MGMT_DIAGRAM = `stateDiagram-v2
    [*] --> ReceiveDenial
    ReceiveDenial --> ParseEOB
    ParseEOB --> ClassifyDenial
    ClassifyDenial --> TechnicalFix: coding error
    ClassifyDenial --> ClinicalAppeal: medical necessity
    ClassifyDenial --> AdminAppeal: admin / timely filing
    TechnicalFix --> ResubmitClaim
    ClinicalAppeal --> GatherEvidence
    GatherEvidence --> DraftAppealLetter
    DraftAppealLetter --> ReviewAppeal
    ReviewAppeal --> SubmitAppeal: confidence >= 0.85
    ReviewAppeal --> HumanReview: confidence < 0.85
    AdminAppeal --> DraftAppealLetter
    ResubmitClaim --> [*]
    SubmitAppeal --> [*]
    HumanReview --> [*]`;

const AGENTS = [
  {
    name: "Clinical Scribe",
    description:
      "Converts ambient audio from patient encounters into structured SOAP notes with ICD-10 and CPT coding. Uses Whisper v3 for transcription and Claude for clinical NLP.",
    diagram: CLINICAL_SCRIBE_DIAGRAM,
    icon: Bot,
    color: "border-purple-200 bg-purple-50",
    iconColor: "text-purple-600",
    capabilities: [
      "Real-time audio transcription via Whisper v3",
      "SOAP note generation (Subjective, Objective, Assessment, Plan)",
      "ICD-10-CM code suggestion with confidence scores",
      "CPT code recommendation based on documented services",
      "Speaker diarization (provider vs patient)",
    ],
    constraints: [
      "Cannot finalize notes without provider review when confidence < 0.85",
      "PHI access limited to current encounter context",
      "Cannot prescribe or order -- documentation only",
    ],
  },
  {
    name: "Prior Authorization",
    description:
      "Automates the prior authorization workflow from eligibility check through X12 278 submission and payer response tracking. Reduces turnaround from days to minutes.",
    diagram: PRIOR_AUTH_DIAGRAM,
    icon: Shield,
    color: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
    capabilities: [
      "Automatic PA requirement detection by payer + procedure",
      "Clinical evidence gathering from patient record",
      "X12 278 request generation (HIPAA compliant)",
      "Real-time payer response tracking",
      "Auto-appeal for high-confidence denials",
    ],
    constraints: [
      "Cannot submit to payer without human approval for first-time procedures",
      "Appeals require physician attestation",
      "Maximum 3 auto-retry attempts before escalation",
    ],
  },
  {
    name: "Denial Management",
    description:
      "Analyzes claim denials from X12 835 remittance data, classifies root causes, and generates appeal letters or corrected claims. Targets < 4% denial rate.",
    diagram: DENIAL_MGMT_DIAGRAM,
    icon: AlertTriangle,
    color: "border-amber-200 bg-amber-50",
    iconColor: "text-amber-600",
    capabilities: [
      "X12 835 EOB parsing and denial classification",
      "Root cause analysis (coding, clinical, admin)",
      "Automated corrected claim generation for technical errors",
      "Appeal letter drafting with clinical evidence",
      "Denial pattern analytics for prevention",
    ],
    constraints: [
      "Cannot submit appeals exceeding $10,000 without human review",
      "Clinical appeals always require physician review",
      "Time-barred denials are flagged but not auto-appealed",
    ],
  },
];

const CONFIDENCE_THRESHOLDS = [
  {
    range: ">= 0.95",
    action: "Auto-approve",
    description: "Agent output is finalized without human intervention",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    range: "0.85 - 0.94",
    action: "Pass with flag",
    description: "Output is accepted but flagged for optional review",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    range: "0.70 - 0.84",
    action: "Human review required",
    description: "Output queued in approval workflow before proceeding",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    range: "< 0.70",
    action: "Reject + escalate",
    description: "Output discarded, task escalated to human operator",
    color: "bg-red-50 text-red-700 border-red-200",
  },
];

export default function AgentWorkflowsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-[var(--medos-navy)]">
          Agent Workflows
        </h1>
        <p className="mt-2 text-[var(--medos-gray-600)] max-w-2xl">
          MedOS uses LangGraph state machines with bounded autonomy. Each agent
          operates within strict authority limits and uses confidence-based
          routing to determine when human review is required.
        </p>
      </div>

      {/* Agent Cards */}
      {AGENTS.map((agent) => (
        <div
          key={agent.name}
          className="rounded-xl border border-[var(--medos-gray-200)] bg-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--medos-gray-100)]">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${agent.color}`}
            >
              <agent.icon className={`h-5 w-5 ${agent.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--medos-navy)]">
                {agent.name}
              </h2>
              <p className="text-sm text-[var(--medos-gray-500)]">
                {agent.description}
              </p>
            </div>
          </div>

          {/* State Diagram */}
          <div className="p-6 border-b border-[var(--medos-gray-100)]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--medos-gray-400)] mb-3">
              State Machine
            </h3>
            <MermaidDiagram chart={agent.diagram} />
          </div>

          {/* Capabilities & Constraints */}
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <div className="p-6 border-b sm:border-b-0 sm:border-r border-[var(--medos-gray-100)]">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
                <CheckCircle2 className="h-4 w-4" />
                Capabilities
              </h3>
              <ul className="space-y-2">
                {agent.capabilities.map((cap) => (
                  <li
                    key={cap}
                    className="flex items-start gap-2 text-sm text-[var(--medos-gray-600)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-3">
                <Shield className="h-4 w-4" />
                Constraints
              </h3>
              <ul className="space-y-2">
                {agent.constraints.map((con) => (
                  <li
                    key={con}
                    className="flex items-start gap-2 text-sm text-[var(--medos-gray-600)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      {/* Confidence Thresholds */}
      <div className="rounded-xl border border-[var(--medos-gray-200)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--medos-navy)] mb-4">
          Confidence Thresholds
        </h2>
        <p className="text-sm text-[var(--medos-gray-600)] mb-4">
          All agent outputs include a confidence score (0.0 - 1.0) that
          determines the routing action. These thresholds apply across all three
          agents.
        </p>
        <div className="space-y-2">
          {CONFIDENCE_THRESHOLDS.map((threshold) => (
            <div
              key={threshold.range}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border p-3 ${threshold.color}`}
            >
              <span className="font-mono text-sm font-bold min-w-[100px]">
                {threshold.range}
              </span>
              <span className="text-sm font-semibold min-w-[180px]">
                {threshold.action}
              </span>
              <span className="text-sm opacity-80">{threshold.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
