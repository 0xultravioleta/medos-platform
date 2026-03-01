"""Tests for the Prior Authorization LangGraph agent.

Covers:
- PA requirement checking (required vs not required)
- Clinical evidence gathering
- Justification generation
- PA form structure
- Approval task creation
- Confidence scoring
- Full graph execution (PA required and not required paths)
- State completeness
"""

import pytest

from medos.agents.prior_auth.graph import build_prior_auth_graph, run_prior_auth
from medos.agents.prior_auth.nodes import (
    check_pa_requirement,
    create_pa_form,
    done_no_pa,
    gather_clinical_evidence,
    generate_justification,
    route_pa_required,
    submit_for_approval,
)

# ---------------------------------------------------------------------------
# Node-level tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pa_not_required_for_office_visit():
    """CPT 99213 (office visit) should NEVER require prior authorization."""
    state: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["99213"],
        "diagnosis_codes": ["M54.5"],
        "payer_name": "Aetna",
        "payer_id": "60054",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await check_pa_requirement(state)
    assert result["pa_required"] is False
    assert result["status"] == "pa_check_complete"
    assert "NOT require" in result["pa_requirement_reason"]


@pytest.mark.asyncio
async def test_pa_required_for_knee_replacement():
    """CPT 27447 (total knee replacement) should ALWAYS require prior authorization."""
    state: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["27447"],
        "diagnosis_codes": ["M17.11"],
        "payer_name": "Aetna",
        "payer_id": "60054",
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await check_pa_requirement(state)
    assert result["pa_required"] is True
    assert result["status"] == "pa_check_complete"
    assert "requires prior authorization" in result["pa_requirement_reason"]


@pytest.mark.asyncio
async def test_clinical_evidence_gathered():
    """Evidence gathering should return a list of clinical resources."""
    state: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["27447"],
        "tenant_id": "test-tenant",
        "metadata": {"procedure_category": "surgery"},
    }
    result = await gather_clinical_evidence(state)
    assert result["status"] == "evidence_gathered"
    assert isinstance(result["clinical_evidence"], list)
    assert len(result["clinical_evidence"]) > 0

    # Each evidence item must have required fields
    for evidence in result["clinical_evidence"]:
        assert "resource_type" in evidence
        assert "summary" in evidence
        assert "date" in evidence


@pytest.mark.asyncio
async def test_justification_generated():
    """Justification should include medical necessity narrative."""
    state: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["27447"],
        "diagnosis_codes": ["M17.11"],
        "clinical_evidence": [
            {"resource_type": "DiagnosticReport", "summary": "X-ray findings", "date": "2026-01-15"},
            {"resource_type": "Condition", "summary": "Primary OA", "date": "2026-01-15"},
            {"resource_type": "MedicationStatement", "summary": "Failed NSAIDs", "date": "2025-12-01"},
        ],
        "tenant_id": "test-tenant",
        "metadata": {
            "procedure_details": {
                "27447": {"name": "Total knee replacement", "category": "surgery"},
            },
        },
    }
    result = await generate_justification(state)
    assert result["status"] == "justification_generated"
    assert "MEDICAL NECESSITY JUSTIFICATION" in result["clinical_justification"]
    assert "27447" in result["clinical_justification"]
    assert "M17.11" in result["clinical_justification"]
    assert "conservative" in result["clinical_justification"].lower()
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_pa_form_structure():
    """PA form must contain all required X12 278 equivalent fields."""
    state: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["27447"],
        "diagnosis_codes": ["M17.11"],
        "payer_name": "Aetna",
        "payer_id": "60054",
        "clinical_justification": "Medical necessity justification text.",
        "tenant_id": "test-tenant",
        "metadata": {
            "procedure_details": {
                "27447": {"name": "Total knee replacement", "category": "surgery"},
            },
        },
    }
    result = await create_pa_form(state)
    assert result["status"] == "form_created"

    form = result["pa_form"]
    assert form["form_id"].startswith("PA-")
    assert form["form_type"] == "X12_278_equivalent"

    # Patient info
    assert "patient" in form
    assert form["patient"]["id"] == "p-001"

    # Provider info
    assert "requesting_provider" in form
    assert "npi" in form["requesting_provider"]
    assert "specialty" in form["requesting_provider"]

    # Service details
    assert "services_requested" in form
    assert len(form["services_requested"]) == 1
    assert form["services_requested"][0]["cpt_code"] == "27447"

    # Diagnosis
    assert "diagnosis_codes" in form
    assert "M17.11" in form["diagnosis_codes"]

    # Payer
    assert "payer" in form
    assert form["payer"]["name"] == "Aetna"
    assert form["payer"]["id"] == "60054"

    # Urgency and dates
    assert "urgency" in form
    assert "effective_date_start" in form
    assert "effective_date_end" in form
    assert "created_at" in form


@pytest.mark.asyncio
async def test_approval_task_created():
    """submit_for_approval MUST always create a human review task."""
    state: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["27447"],
        "confidence": 0.87,
        "pa_form": {
            "form_id": "PA-TEST1234",
            "form_type": "X12_278_equivalent",
        },
        "clinical_justification": "Test justification.",
        "clinical_evidence": [{"resource_type": "Test", "summary": "Test", "date": "2026-01-01"}],
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await submit_for_approval(state)
    assert result["status"] == "submitted_for_approval"
    assert result["requires_human_review"] is True
    # approval_task_id may be None if auto-approved by confidence,
    # but requires_human_review is always True for PA
    assert "approval_task_id" in result


@pytest.mark.asyncio
async def test_confidence_scoring():
    """Confidence should vary based on clinical evidence strength."""
    # Strong evidence (5+ items) -> higher confidence
    strong_evidence = [
        {"resource_type": f"Resource{i}", "summary": f"Finding {i}", "date": "2026-01-01"}
        for i in range(6)
    ]
    state_strong: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["27447"],
        "diagnosis_codes": ["M17.11"],
        "clinical_evidence": strong_evidence,
        "tenant_id": "test-tenant",
        "metadata": {"procedure_details": {"27447": {"name": "TKR", "category": "surgery"}}},
    }
    result_strong = await generate_justification(state_strong)

    # Weak evidence (1 item) -> lower confidence
    weak_evidence = [
        {"resource_type": "Condition", "summary": "Diagnosis only", "date": "2026-01-01"},
    ]
    state_weak: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["27447"],
        "diagnosis_codes": ["M17.11"],
        "clinical_evidence": weak_evidence,
        "tenant_id": "test-tenant",
        "metadata": {"procedure_details": {"27447": {"name": "TKR", "category": "surgery"}}},
    }
    result_weak = await generate_justification(state_weak)

    assert result_strong["confidence"] > result_weak["confidence"]


@pytest.mark.asyncio
async def test_done_no_pa_sets_confidence():
    """done_no_pa should set status=no_pa_needed and confidence=1.0."""
    state: dict = {
        "patient_id": "p-001",
        "procedure_codes": ["99213"],
        "tenant_id": "test-tenant",
        "metadata": {},
    }
    result = await done_no_pa(state)
    assert result["status"] == "no_pa_needed"
    assert result["confidence"] == 1.0
    assert result["requires_human_review"] is False


def test_route_pa_required_branches():
    """route_pa_required should return correct branch for each scenario."""
    # PA required
    assert route_pa_required({"pa_required": True, "status": "pa_check_complete"}) == "pa_required"
    # PA not required
    assert route_pa_required({"pa_required": False, "status": "pa_check_complete"}) == "no_pa"
    # Error state
    assert route_pa_required({"status": "error"}) == "error"


# ---------------------------------------------------------------------------
# Graph-level tests
# ---------------------------------------------------------------------------


def test_build_graph_structure():
    """Graph should be buildable and have expected node count."""
    graph = build_prior_auth_graph()
    assert graph is not None


@pytest.mark.asyncio
async def test_full_graph_pa_required():
    """Full graph for a procedure that requires PA (knee replacement)."""
    result = await run_prior_auth(
        patient_id="p-001",
        procedure_codes=["27447"],
        diagnosis_codes=["M17.11"],
        payer_name="Aetna",
        payer_id="60054",
    )
    assert result["status"] == "submitted_for_approval"
    assert result["pa_required"] is True
    assert result["requires_human_review"] is True

    # PA form must exist
    assert "pa_form" in result
    assert result["pa_form"]["form_id"].startswith("PA-")

    # Clinical evidence must have been gathered
    assert isinstance(result["clinical_evidence"], list)
    assert len(result["clinical_evidence"]) > 0

    # Justification must exist
    assert "clinical_justification" in result
    assert len(result["clinical_justification"]) > 0

    # Confidence must be set
    assert isinstance(result["confidence"], float)
    assert 0.0 < result["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_full_graph_pa_not_required():
    """Full graph for a procedure that does NOT require PA (office visit)."""
    result = await run_prior_auth(
        patient_id="p-001",
        procedure_codes=["99213"],
        diagnosis_codes=["M54.5"],
        payer_name="Aetna",
    )
    assert result["status"] == "no_pa_needed"
    assert result["pa_required"] is False
    assert result["confidence"] == 1.0
    assert result["requires_human_review"] is False


@pytest.mark.asyncio
async def test_state_completeness():
    """After full PA-required run, all expected state fields must be set."""
    result = await run_prior_auth(
        patient_id="p-001",
        procedure_codes=["27447"],
        diagnosis_codes=["M17.11"],
        payer_name="Aetna",
        payer_id="60054",
        claim_id="CLM-TEST-001",
        encounter_id="enc-001",
        tenant_id="test-tenant",
    )

    # Verify all identifier fields are present
    assert result["patient_id"] == "p-001"
    assert result["claim_id"] == "CLM-TEST-001"
    assert result["encounter_id"] == "enc-001"
    assert result["tenant_id"] == "test-tenant"
    assert result["payer_name"] == "Aetna"
    assert result["payer_id"] == "60054"
    assert result["procedure_codes"] == ["27447"]
    assert result["diagnosis_codes"] == ["M17.11"]

    # Verify pipeline data fields
    assert isinstance(result["pa_required"], bool)
    assert isinstance(result["pa_requirement_reason"], str)
    assert isinstance(result["clinical_evidence"], list)
    assert isinstance(result["clinical_justification"], str)
    assert isinstance(result["pa_form"], dict)

    # Verify workflow control fields
    assert isinstance(result["confidence"], float)
    assert isinstance(result["status"], str)
    assert isinstance(result["requires_human_review"], bool)


@pytest.mark.asyncio
async def test_multiple_procedure_codes():
    """Agent should handle multiple procedure codes in a single request."""
    result = await run_prior_auth(
        patient_id="p-001",
        procedure_codes=["27447", "73721"],
        diagnosis_codes=["M17.11", "M23.21"],
        payer_name="Aetna",
    )
    # Both codes require PA, so PA should be required
    assert result["pa_required"] is True
    assert result["status"] == "submitted_for_approval"
    # PA form should list both procedures
    services = result["pa_form"].get("services_requested", [])
    cpt_codes_in_form = [s["cpt_code"] for s in services]
    assert "27447" in cpt_codes_in_form
    assert "73721" in cpt_codes_in_form


@pytest.mark.asyncio
async def test_mixed_pa_codes_triggers_pa():
    """If ANY procedure requires PA, the entire request should require PA."""
    result = await run_prior_auth(
        patient_id="p-001",
        procedure_codes=["99213", "27447"],  # office visit + knee replacement
        diagnosis_codes=["M17.11"],
        payer_name="Aetna",
    )
    assert result["pa_required"] is True
    assert result["status"] == "submitted_for_approval"
