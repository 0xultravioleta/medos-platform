"""Prior Authorization LangGraph state machine definition.

Pipeline: check_pa_requirement -> [PA required?]
    -> No: done_no_pa -> END
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
    """Build the Prior Authorization LangGraph state machine."""
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
    procedure_code: str,
    diagnosis_codes: list[str] | None = None,
    payer: str = "",
    encounter_id: str = "",
    tenant_id: str = "dev-tenant-001",
) -> dict[str, Any]:
    """Convenience function to run the Prior Auth pipeline."""
    graph = build_prior_auth_graph()
    compiled = graph.compile()

    initial_state: dict[str, Any] = {
        "patient_id": patient_id,
        "procedure_code": procedure_code,
        "diagnosis_codes": diagnosis_codes or [],
        "payer": payer,
        "encounter_id": encounter_id,
        "tenant_id": tenant_id,
        "status": "starting",
        "messages": [],
        "metadata": {},
    }

    result = await compiled.ainvoke(initial_state)
    logger.info(
        "Prior Auth completed for patient=%s procedure=%s status=%s",
        patient_id,
        procedure_code,
        result.get("status", "unknown"),
    )
    return dict(result)
