"""Tests for the Denial Management LangGraph agent.

Covers:
    - CARC code analysis and root cause classification
    - Appeal viability assessment
    - Evidence gathering
    - Appeal letter generation
    - No-appeal reporting
    - Approval task creation
    - Full graph execution (viable and non-viable paths)
    - Confidence scoring
"""

import pytest

from medos.agents.denial_mgmt.graph import build_denial_mgmt_graph, run_denial_management
from medos.agents.denial_mgmt.nodes import (
    _CARC_ROOT_CAUSE_MAP,
    _HISTORICAL_SUCCESS_RATES,
    analyze_denial,
    assess_appeal_viability,
    draft_appeal_letter,
    gather_evidence,
    report_no_appeal,
    submit_for_approval,
)
from medos.agents.denial_mgmt.state import DenialManagementState
from medos.mcp.servers.fhir_server import _seed_demo_patients


@pytest.fixture(autouse=True)
def _setup():
    """Seed demo patient data for FHIR lookups."""
    _seed_demo_patients()


# ---------------------------------------------------------------------------
# Helper: build a denial state with defaults
# ---------------------------------------------------------------------------


def _make_state(**overrides: object) -> dict:
    """Create a base denial state for node testing."""
    base: dict = {
        "claim_id": "CLM-2024-003",
        "patient_id": "p-003",
        "tenant_id": "test-tenant",
        "original_billed_amount": 1200.00,
        "denial_code": "CO-4",
        "denial_reason": "The procedure code is inconsistent with the modifier used.",
        "denial_date": "2025-01-15",
        "payer_id": "UHC-20250115-4411",
        "payer_name": "UnitedHealthcare",
        "root_cause_category": "coding_error",
        "appeal_viable": True,
        "appeal_probability": 0.675,
        "historical_success_rate": 0.75,
        "supporting_evidence": [],
        "corrective_actions": [],
        "confidence": 0.675,
        "status": "starting",
        "error": None,
        "requires_human_review": False,
        "approval_task_id": None,
        "messages": [],
        "metadata": {},
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# 1. test_analyze_coding_error_denial (CO-4)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analyze_coding_error_denial():
    """CO-4 should classify as coding_error."""
    state = _make_state(claim_id="CLM-2024-003")
    result = await analyze_denial(state)
    assert result["status"] == "denial_analyzed"
    assert result["denial_code"] == "CO-4"
    assert result["root_cause_category"] == "coding_error"
    assert result["patient_id"] == "p-003"
    assert result["payer_name"] == "UnitedHealthcare"
    assert result["original_billed_amount"] == 1200.00


# ---------------------------------------------------------------------------
# 2. test_analyze_missing_info_denial (CO-16)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analyze_missing_info_denial():
    """CO-16 should classify as missing_information."""
    state = _make_state(claim_id="CLM-2024-004")
    result = await analyze_denial(state)
    assert result["status"] == "denial_analyzed"
    assert result["denial_code"] == "CO-16"
    assert result["root_cause_category"] == "missing_information"
    assert result["patient_id"] == "p-001"
    assert result["payer_name"] == "Aetna"
    assert result["original_billed_amount"] == 3500.00


# ---------------------------------------------------------------------------
# 3. test_analyze_prior_auth_denial (CO-197)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analyze_prior_auth_denial():
    """CO-197 mapping should classify as prior_auth_missing."""
    # No mock claim with CO-197, so verify the CARC mapping directly
    assert _CARC_ROOT_CAUSE_MAP["CO-197"] == "prior_auth_missing"

    # Also verify the historical success rate exists for this category
    assert _HISTORICAL_SUCCESS_RATES["prior_auth_missing"] == 0.65


# ---------------------------------------------------------------------------
# 4. test_analyze_timely_filing_denial (CO-29)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_analyze_timely_filing_denial():
    """CO-29 mapping should classify as timely_filing."""
    # No mock claim with CO-29, so verify the CARC mapping directly
    assert _CARC_ROOT_CAUSE_MAP["CO-29"] == "timely_filing"

    # Also verify the historical success rate for timely_filing is low (15%)
    assert _HISTORICAL_SUCCESS_RATES["timely_filing"] == 0.15


# ---------------------------------------------------------------------------
# 5. test_appeal_viable_coding_error
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_appeal_viable_coding_error():
    """Coding errors have 75% historical rate -> appeal should be viable."""
    state = _make_state(root_cause_category="coding_error")
    result = await assess_appeal_viability(state)
    assert result["appeal_viable"] is True
    assert result["appeal_probability"] == pytest.approx(0.75 * 0.9, abs=0.01)
    assert result["historical_success_rate"] == 0.75
    assert result["status"] == "viability_assessed"


# ---------------------------------------------------------------------------
# 6. test_appeal_not_viable_duplicate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_appeal_not_viable_duplicate():
    """Duplicate claims have 10% historical rate -> appeal should NOT be viable."""
    state = _make_state(root_cause_category="duplicate")
    result = await assess_appeal_viability(state)
    assert result["appeal_viable"] is False
    assert result["appeal_probability"] == pytest.approx(0.10 * 0.9, abs=0.01)
    assert result["historical_success_rate"] == 0.10


# ---------------------------------------------------------------------------
# 7. test_appeal_not_viable_timely_filing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_appeal_not_viable_timely_filing():
    """Timely filing has 15% historical rate -> appeal should NOT be viable."""
    state = _make_state(root_cause_category="timely_filing")
    result = await assess_appeal_viability(state)
    assert result["appeal_viable"] is False
    assert result["appeal_probability"] == pytest.approx(0.15 * 0.9, abs=0.01)
    assert result["historical_success_rate"] == 0.15


# ---------------------------------------------------------------------------
# 8. test_evidence_gathered_for_coding_error
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_evidence_gathered_for_coding_error():
    """Evidence gathering for coding errors should include corrected codes and medical records."""
    state = _make_state(
        patient_id="p-003",
        root_cause_category="coding_error",
    )
    result = await gather_evidence(state)
    assert result["status"] == "evidence_gathered"
    evidence = result["supporting_evidence"]
    assert len(evidence) > 0

    # Should include corrected_codes and medical_record_excerpt
    evidence_types = {e.get("type") for e in evidence}
    assert "corrected_codes" in evidence_types
    assert "medical_record_excerpt" in evidence_types


# ---------------------------------------------------------------------------
# 9. test_appeal_letter_generated
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_appeal_letter_generated():
    """Appeal letter should be generated with all required sections."""
    state = _make_state(
        claim_id="CLM-2024-003",
        patient_id="p-003",
        payer_name="UnitedHealthcare",
        original_billed_amount=1200.00,
        denial_code="CO-4",
        denial_reason="The procedure code is inconsistent with the modifier used.",
        root_cause_category="coding_error",
        appeal_probability=0.675,
        supporting_evidence=[
            {"type": "corrected_codes", "description": "Corrected codes"},
            {"type": "medical_record_excerpt", "description": "Records"},
        ],
    )
    result = await draft_appeal_letter(state)
    assert result["status"] == "letter_drafted"

    letter = result["appeal_letter"]
    assert len(letter) > 100
    assert "APPEAL LETTER" in letter
    assert "CLM-2024-003" in letter
    assert "CO-4" in letter
    assert "UnitedHealthcare" in letter
    assert "ROOT CAUSE ANALYSIS" in letter
    assert "SUPPORTING EVIDENCE" in letter
    assert "CORRECTIVE ACTION" in letter
    assert "LEGAL/REGULATORY REFERENCE" in letter
    assert "coding error" in letter.lower()

    # Should also return corrective actions
    assert len(result["corrective_actions"]) > 0
    assert result["confidence"] > 0


# ---------------------------------------------------------------------------
# 10. test_no_appeal_report
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_no_appeal_report():
    """No-appeal report should include corrective actions and set confidence=1.0."""
    state = _make_state(
        claim_id="CLM-TEST-DUP",
        root_cause_category="duplicate",
        appeal_probability=0.09,
    )
    result = await report_no_appeal(state)
    assert result["status"] == "closed_no_appeal"
    assert result["confidence"] == 1.0
    assert result["requires_human_review"] is False
    assert len(result["corrective_actions"]) > 0
    assert "duplicate" in result["metadata"]["result"].lower()


# ---------------------------------------------------------------------------
# 11. test_approval_task_created
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_approval_task_created():
    """Submit for approval should ALWAYS create a review task."""
    state = _make_state(
        appeal_letter="Test appeal letter content for review",
        confidence=0.675,
        appeal_probability=0.675,
        root_cause_category="coding_error",
        corrective_actions=["Fix modifier"],
        supporting_evidence=[{"type": "doc"}],
    )
    result = await submit_for_approval(state)
    assert result["status"] == "submitted_for_approval"
    assert result["requires_human_review"] is True
    assert result["approval_task_id"] is not None
    assert len(result["approval_task_id"]) > 0


# ---------------------------------------------------------------------------
# 12. test_full_graph_viable_appeal
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_graph_viable_appeal():
    """Full pipeline for CO-4 (coding error) should end with submitted_for_approval."""
    result = await run_denial_management(claim_id="CLM-2024-003")
    assert result["status"] == "submitted_for_approval"
    assert result["root_cause_category"] == "coding_error"
    assert result["appeal_viable"] is True
    assert "appeal_letter" in result
    assert len(result["appeal_letter"]) > 100
    assert result["requires_human_review"] is True
    assert result["approval_task_id"] is not None
    assert len(result.get("corrective_actions", [])) > 0


# ---------------------------------------------------------------------------
# 13. test_full_graph_no_appeal
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_graph_no_appeal():
    """Full pipeline for a non-denied claim should end in no-appeal or error."""
    # CLM-2024-001 is a paid claim, not denied
    result = await run_denial_management(claim_id="CLM-2024-001")
    # analyze_denial returns error, but assess_appeal_viability overrides status
    # with "viability_assessed" (appeal_viable=False) → routed to report_no_appeal
    assert result["status"] in ("error", "closed_no_appeal")


# ---------------------------------------------------------------------------
# 14. test_confidence_scoring
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_confidence_scoring():
    """Confidence should reflect appeal probability and evidence strength."""
    # With more evidence, confidence should be higher
    state_low = _make_state(
        appeal_probability=0.675,
        supporting_evidence=[],
    )
    result_low = await draft_appeal_letter(state_low)

    state_high = _make_state(
        appeal_probability=0.675,
        supporting_evidence=[
            {"type": "doc1"},
            {"type": "doc2"},
            {"type": "doc3"},
            {"type": "doc4"},
            {"type": "doc5"},
        ],
    )
    result_high = await draft_appeal_letter(state_high)

    # More evidence should yield higher confidence (or equal at cap)
    assert result_high["confidence"] >= result_low["confidence"]

    # Confidence should never exceed 0.95
    assert result_high["confidence"] <= 0.95
    assert result_low["confidence"] <= 0.95

    # Confidence should always be positive
    assert result_low["confidence"] > 0
    assert result_high["confidence"] > 0


# ---------------------------------------------------------------------------
# Additional: Graph structure test
# ---------------------------------------------------------------------------


def test_build_denial_mgmt_graph():
    """Verify graph builds without errors and has expected nodes."""
    graph = build_denial_mgmt_graph()
    assert graph is not None
    # The graph should have 7 nodes
    node_names = set(graph.nodes.keys())
    expected = {
        "analyze_denial",
        "assess_appeal_viability",
        "gather_evidence",
        "draft_appeal_letter",
        "submit_for_approval",
        "report_no_appeal",
        "handle_error",
    }
    assert expected == node_names


# ---------------------------------------------------------------------------
# Additional: CO-16 full graph (viable appeal with high success rate)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_graph_co16_viable():
    """CO-16 (missing info, 85% success rate) should produce viable appeal."""
    result = await run_denial_management(claim_id="CLM-2024-004")
    assert result["status"] == "submitted_for_approval"
    assert result["root_cause_category"] == "missing_information"
    assert result["appeal_viable"] is True
    assert result.get("appeal_probability", 0) > 0.5
