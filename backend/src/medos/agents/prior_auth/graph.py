"""Prior Authorization LangGraph state machine definition.

Pipeline: check_pa_requirement -> [PA required?]
    -> No: done_no_pa (status=no_pa_needed, confidence=1.0) -> END
    -> Yes: gather_clinical_evidence -> generate_justification
        -> create_pa_form -> submit_for_approval -> END
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, StateGraph

from medos.agents.prior_auth.nodes import (
    check_pa_requirement,
    create_pa_form,
    done_no_pa,
    gather_clinical_evidence,
    generate_justification,
    handle_error,
    route_pa_required,
    submit_for_approval,
)
from medos.agents.prior_auth.state import PriorAuthState

logger = logging.getLogger(__name__)


def build_prior_auth_graph() -> StateGraph:
    """Build the Prior Authorization LangGraph state machine.

    Returns a StateGraph ready for compilation and invocation.

    Nodes:
        check_pa_requirement    - Evaluate payer rules for PA necessity
        done_no_pa              - Quick exit when PA not required
        gather_clinical_evidence - Collect FHIR resources as evidence
        generate_justification  - AI-generated medical necessity narrative
        create_pa_form          - Build X12 278 equivalent form
        submit_for_approval     - Create human review task
        handle_error            - Error handling

    Edges:
        check_pa_requirement -> [conditional]:
            - "pa_required" -> gather_clinical_evidence -> generate_justification
                -> create_pa_form -> submit_for_approval -> END
            - "no_pa" -> done_no_pa -> END
            - "error" -> handle_error -> END
    """
    graph = StateGraph(PriorAuthState)

    # Add nodes
    graph.add_node("check_pa_requirement", check_pa_requirement)
    graph.add_node("done_no_pa", done_no_pa)
    graph.add_node("gather_clinical_evidence", gather_clinical_evidence)
    graph.add_node("generate_justification", generate_justification)
    graph.add_node("create_pa_form", create_pa_form)
    graph.add_node("submit_for_approval", submit_for_approval)
    graph.add_node("handle_error", handle_error)

    # Entry point
    graph.set_entry_point("check_pa_requirement")

    # Conditional: PA required?
    graph.add_conditional_edges(
        "check_pa_requirement",
        route_pa_required,
        {
            "pa_required": "gather_clinical_evidence",
            "no_pa": "done_no_pa",
            "error": "handle_error",
        },
    )

    # Linear PA workflow
    graph.add_edge("gather_clinical_evidence", "generate_justification")
    graph.add_edge("generate_justification", "create_pa_form")
    graph.add_edge("create_pa_form", "submit_for_approval")

    # Terminal edges
    graph.add_edge("done_no_pa", END)
    graph.add_edge("submit_for_approval", END)
    graph.add_edge("handle_error", END)

    return graph


async def run_prior_auth(
    patient_id: str,
    procedure_codes: list[str] | None = None,
    diagnosis_codes: list[str] | None = None,
    payer_name: str = "",
    payer_id: str = "",
    claim_id: str = "",
    encounter_id: str = "",
    tenant_id: str = "dev-tenant-001",
    # Backward-compatible aliases (used by agent_runner.py)
    procedure_code: str = "",
    payer: str = "",
) -> dict[str, Any]:
    """Convenience function to run the Prior Auth pipeline.

    Returns the final state after the graph completes.

    Supports legacy single-procedure_code and payer params for
    backward compatibility with the agent runner REST endpoint.
    """
    # Handle backward-compatible single procedure_code
    codes = list(procedure_codes or [])
    if procedure_code and procedure_code not in codes:
        codes.append(procedure_code)

    # Handle backward-compatible payer alias
    effective_payer_name = payer_name or payer

    graph = build_prior_auth_graph()
    compiled = graph.compile()

    initial_state: dict[str, Any] = {
        "claim_id": claim_id,
        "patient_id": patient_id,
        "procedure_codes": codes,
        "diagnosis_codes": diagnosis_codes or [],
        "payer_name": effective_payer_name,
        "payer_id": payer_id,
        "encounter_id": encounter_id,
        "tenant_id": tenant_id,
        "status": "starting",
        "messages": [],
        "metadata": {},
    }

    result = await compiled.ainvoke(initial_state)
    logger.info(
        "Prior Auth completed for patient=%s procedures=%s status=%s",
        patient_id,
        procedure_codes,
        result.get("status", "unknown"),
    )
    return dict(result)
