# 🧠 Dream Session: MedOS Platform Technical Brainstorming
**Date:** March 1, 2026
**Target Audience:** Engineering & Architecture Team
**Context:** Aligning the technical platform with the needs of a scaled telemedicine and post-acute care provider (inspired by Dr. Justin Di Rezze's operations).

---

## 🛠️ Technical Additions & Agent Workflows

### 1. LangGraph Agents for RPM (Remote Patient Monitoring)
We need a specialized LangGraph workflow for continuous data streams, not just episodic encounters.
- **Trigger:** Incoming FHIR `Observation` resource (e.g., Blood Pressure 180/110 from an RPM device).
- **Agent Node 1 (Triage):** Checks patient history (FHIR `Condition`) for baseline. Is this normal for them?
- **Agent Node 2 (Action):** If abnormal, cross-references current medications (FHIR `MedicationRequest`).
- **Agent Node 3 (Drafting):** Drafts a recommended intervention (e.g., "Increase Amlodipine to 10mg") and alerts the on-call physician with a high-confidence score.

### 2. WebRTC + Whisper Streaming Pipeline
- **Current State:** Architecture mentions Whisper v3 for speech.
- **Missing Piece:** Real-time WebRTC audio extraction for telemedicine calls.
- **Implementation Idea:** A sidecar container in the AWS ECS cluster that accepts WebRTC audio streams, chunks them every 5 seconds, processes via Whisper, and feeds the text into a real-time Claude summarization agent. This creates the SOAP note *while the doctor is still on the video call*.

### 3. FHIR Resources to Prioritize
Given the focus on SNFs and CCM:
- `CarePlan`: Absolutely critical for Chronic Care Management billing.
- `Device` and `DeviceMetric`: For the RPM integrations.
- `Communication`: To track the async back-and-forth between the remote doctor and the on-site SNF nurse (for the 20-minute CCM time tracking).

### 4. EventBridge "Time-Tracking" Rules for CCM
- Use AWS EventBridge to listen to all API actions (read, write, message) performed by a provider on a specific patient's chart.
- Route these events to a Redis timeseries DB.
- A scheduled cron agent runs nightly, aggregates the time spent per patient, and if it exceeds 20 minutes for a calendar month, pushes a trigger to the Revenue Cycle module to drop a CPT 99490 claim.

### 5. Multi-Tenant Architecture Enhancement
- **ADR-002** specifies Schema-per-tenant.
- **Add:** "Facility-Level Row Level Security (RLS)". Since doctors will be treating patients across dozens of different Skilled Nursing Facilities, we need an RLS policy that ensures a nurse logging in from "Facility A" only sees patients currently admitted to "Facility A", even though they share the same provider tenant schema.

---
*Technical constraints and expansions dreamed autonomously.*
