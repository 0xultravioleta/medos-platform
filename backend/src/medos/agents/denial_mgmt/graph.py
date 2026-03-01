"""Denial Management LangGraph state machine definition.

Pipeline: analyze_denial -> assess_appeal_viability -> [viable?]
    -> No: report_no_appeal -> END
    -> Yes: gather_evidence -> draft_appeal_letter -> submit_for_approval -> END

The graph enforces deterministic state transitions with mandatory
checkpoints at each stage for HIPAA auditing.
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, StateGraph

from medos.agents.denial_mgmt.nodes import (
    analyze_denial,
    assess_appeal_viability,
    draft_appeal_letter,
    gather_evidence,
    handle_error,
    report_no_appeal,
    route_appeal_viable,
    route_post_analysis,
    submit_for_approval,
)
from medos.agents.denial_mgmt.state import DenialManagementState

logger = logging.getLogger(__name__)


def build_denial_mgmt_graph() -> StateGraph:
    """Build the Denial Management LangGraph state machine.

    Returns a StateGraph ready for compilation.

    Nodes:
        analyze_denial          - Parse CARC/RARC codes, classify root cause
        assess_appeal_viability - Determine if appeal is viable (>= 30% probability)
        gather_evidence         - Gather supporting clinical evidence
        draft_appeal_letter     - Generate professional appeal letter
        submit_for_approval     - Create human review task (always required)
        report_no_appeal        - Generate no-appeal report with corrective actions
        handle_error            - Error handling

    Edges:
        analyze_denial -> [conditional]:
            - "continue" -> assess_appeal_viability
            - "error" -> handle_error -> END
        assess_appeal_viability -> [conditional]:
            - "viable" -> gather_evidence -> draft_appeal_letter -> submit_for_approval -> END
            - "not_viable" -> report_no_appeal -> END
            - "error" -> handle_error -> END
    """
    graph = StateGraph(DenialManagementState)

    # Add nodes
    graph.add_node("analyze_denial", analyze_denial)
    graph.add_node("assess_appeal_viability", assess_appeal_viability)
    graph.add_node("gather_evidence", gather_evidence)
    graph.add_node("draft_appeal_letter", draft_appeal_letter)
    graph.add_node("submit_for_approval", submit_for_approval)
    graph.add_node("report_no_appeal", report_no_appeal)
    graph.add_node("handle_error", handle_error)

    # Entry point
    graph.set_entry_point("analyze_denial")

    # Conditional: Did analysis succeed?
    graph.add_conditional_edges(
        "analyze_denial",
        route_post_analysis,
        {
            "continue": "assess_appeal_viability",
            "error": "handle_error",
        },
    )

    # Conditional: Appeal viable?
    graph.add_conditional_edges(
        "assess_appeal_viability",
        route_appeal_viable,
        {
            "viable": "gather_evidence",
            "not_viable": "report_no_appeal",
            "error": "handle_error",
        },
    )

    # Linear appeal workflow
    graph.add_edge("gather_evidence", "draft_appeal_letter")
    graph.add_edge("draft_appeal_letter", "submit_for_approval")

    # Terminal edges
    graph.add_edge("report_no_appeal", END)
    graph.add_edge("submit_for_approval", END)
    graph.add_edge("handle_error", END)

    return graph


async def run_denial_management(
    claim_id: str,
    tenant_id: str = "dev-tenant-001",
) -> dict[str, Any]:
    """Convenience function to run the Denial Management pipeline.

    Returns the final state after the graph completes.
    """
    graph = build_denial_mgmt_graph()
    compiled = graph.compile()

    initial_state: dict[str, Any] = {
        "claim_id": claim_id,
        "tenant_id": tenant_id,
        "status": "starting",
        "messages": [],
        "metadata": {},
    }

    result = await compiled.ainvoke(initial_state)
    logger.info(
        "Denial Management completed for claim=%s status=%s",
        claim_id,
        result.get("status", "unknown"),
    )
    return dict(result)
