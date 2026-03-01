"""Tests for agent base infrastructure (confidence routing, safety, audit)."""

import pytest

from medos.agents.base import (
    create_agent_context,
    emit_agent_event,
    get_pending_tasks,
    get_task,
    review_task,
    route_by_confidence,
)
from medos.core.audit_agent import build_agent_audit_event, build_agent_provenance
from medos.core.safety_layer import SafetyLayer
from medos.schemas.agent import (
    AgentContext,
    AgentEvent,
    AgentType,
    ConfidenceScore,
    SafetyAction,
)


# ---------------------------------------------------------------------------
# AgentContext creation
# ---------------------------------------------------------------------------


def test_create_agent_context():
    ctx = create_agent_context(
        AgentType.CLINICAL_SCRIBE,
        "tenant-001",
        user_id="dr-001",
        encounter_id="enc-001",
    )
    assert ctx.agent_type == AgentType.CLINICAL_SCRIBE
    assert ctx.tenant_id == "tenant-001"
    assert ctx.user_id == "dr-001"
    assert ctx.encounter_id == "enc-001"
    assert len(ctx.session_id) > 0
    assert len(ctx.fhir_scopes) > 0


def test_create_agent_context_default_scopes():
    ctx = create_agent_context(AgentType.PRIOR_AUTH, "t-001")
    assert "patient/Claim.read" in ctx.fhir_scopes


# ---------------------------------------------------------------------------
# Confidence routing
# ---------------------------------------------------------------------------


def test_route_high_confidence_auto_approves():
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    confidence = ConfidenceScore(score=0.96)
    result = route_by_confidence(
        content="SOAP note content",
        confidence=confidence,
        agent_ctx=ctx,
    )
    assert result["action"] == "auto_approved"
    assert result["task_id"] is None


def test_route_medium_confidence_passes():
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    confidence = ConfidenceScore(score=0.88)
    result = route_by_confidence(
        content="SOAP note content",
        confidence=confidence,
        agent_ctx=ctx,
    )
    assert result["action"] == "passed"


def test_route_low_confidence_creates_review_task():
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    confidence = ConfidenceScore(score=0.72)
    result = route_by_confidence(
        content="Low confidence SOAP note",
        confidence=confidence,
        agent_ctx=ctx,
        task_title="Review SOAP note",
    )
    assert result["action"] == "review_required"
    assert result["task_id"] is not None


# ---------------------------------------------------------------------------
# Agent task management
# ---------------------------------------------------------------------------


def test_task_review_workflow():
    # Create a review task via low confidence routing
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-review")
    confidence = ConfidenceScore(score=0.70)
    result = route_by_confidence(
        content="Needs review",
        confidence=confidence,
        agent_ctx=ctx,
    )
    task_id = result["task_id"]

    # Verify task exists
    task = get_task(task_id)
    assert task is not None
    assert task.status.value == "pending"

    # List pending tasks
    pending = get_pending_tasks("t-review")
    assert len(pending) >= 1

    # Review task
    reviewed = review_task(task_id, approved=True, reviewer_id="dr-001", notes="Looks good")
    assert reviewed.status.value == "approved"
    assert reviewed.reviewed_by == "dr-001"


def test_review_nonexistent_task():
    result = review_task("nonexistent", approved=True, reviewer_id="dr-001")
    assert result is None


# ---------------------------------------------------------------------------
# Event emission
# ---------------------------------------------------------------------------


def test_emit_agent_event():
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    event = emit_agent_event(
        ctx,
        "tool.invoked",
        tool_name="fhir_read",
        resource_type="Patient",
        resource_id="p-001",
    )
    assert event.event_type == "tool.invoked"
    assert event.tool_name == "fhir_read"
    assert event.tenant_id == "t-001"


# ---------------------------------------------------------------------------
# FHIR AuditEvent builder
# ---------------------------------------------------------------------------


def test_build_agent_audit_event():
    event = AgentEvent(
        event_type="tool.invoked",
        agent_type=AgentType.CLINICAL_SCRIBE,
        tenant_id="t-001",
        session_id="s-001",
        tool_name="fhir_read",
        resource_type="Patient",
        resource_id="p-001",
    )
    audit = build_agent_audit_event(event)
    assert audit["resourceType"] == "AuditEvent"
    assert audit["action"] == "E"
    assert audit["outcome"] == "0"
    # Check agent identity
    agent_who = audit["agent"][0]["who"]["identifier"]["value"]
    assert "clinical_scribe" in agent_who


def test_build_agent_audit_event_error():
    event = AgentEvent(
        event_type="tool.error",
        agent_type=AgentType.SYSTEM,
        tenant_id="t-001",
    )
    audit = build_agent_audit_event(event)
    assert audit["outcome"] == "8"  # serious failure


# ---------------------------------------------------------------------------
# Provenance builder
# ---------------------------------------------------------------------------


def test_build_agent_provenance():
    confidence = ConfidenceScore(score=0.88, model_id="claude-sonnet-4", prompt_hash="abc123")
    prov = build_agent_provenance(
        target_resource_type="DocumentReference",
        target_resource_id="doc-001",
        agent_type="clinical_scribe",
        agent_version="1.0.0",
        tenant_id="t-001",
        confidence=confidence,
    )
    assert prov["resourceType"] == "Provenance"
    assert prov["target"][0]["reference"] == "DocumentReference/doc-001"
    # Check confidence extension
    conf_ext = [e for e in prov["extension"] if "confidence-score" in e.get("url", "")]
    assert len(conf_ext) == 1
    assert conf_ext[0]["valueDecimal"] == 0.88


# ---------------------------------------------------------------------------
# Safety layer
# ---------------------------------------------------------------------------


def test_safety_pass():
    safety = SafetyLayer()
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    result = safety.check("Normal clinical text with no issues", ctx)
    assert result.action == SafetyAction.PASS


def test_safety_block_medication_order():
    safety = SafetyLayer()
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    result = safety.check("Please prescribe amoxicillin 500mg for the patient", ctx)
    assert result.action == SafetyAction.BLOCK


def test_safety_phi_sanitize_for_non_clinical():
    safety = SafetyLayer()
    ctx = create_agent_context(AgentType.PATIENT_COMMS, "t-001")
    result = safety.check("Patient SSN is 123-45-6789 and phone is 555-123-4567", ctx)
    assert result.action == SafetyAction.SANITIZE
    assert result.phi_detected is True
    assert "[REDACTED" in result.sanitized_content


def test_safety_phi_allowed_for_clinical():
    safety = SafetyLayer()
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    result = safety.check("Patient SSN is 123-45-6789", ctx)
    # Clinical scribe can see PHI, so it passes
    assert result.action == SafetyAction.PASS
    assert result.phi_detected is True


def test_safety_low_confidence_review():
    safety = SafetyLayer()
    ctx = create_agent_context(AgentType.CLINICAL_SCRIBE, "t-001")
    confidence = ConfidenceScore(score=0.60)
    result = safety.check("Some clinical content", ctx, confidence)
    assert result.action == SafetyAction.REVIEW
    assert result.confidence_below_threshold is True


# ---------------------------------------------------------------------------
# ConfidenceScore
# ---------------------------------------------------------------------------


def test_confidence_above_threshold():
    cs = ConfidenceScore(score=0.90)
    assert cs.check_threshold(0.85) is True
    assert cs.requires_review is False


def test_confidence_below_threshold():
    cs = ConfidenceScore(score=0.70)
    assert cs.check_threshold(0.85) is False
    assert cs.requires_review is True
