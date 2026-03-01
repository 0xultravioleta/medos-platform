"""Clinical Scribe LangGraph state machine definition.

Pipeline: receive_audio -> transcribe -> generate_soap -> review_coding
              -> [confidence routing] -> finalize | human_review

The graph enforces deterministic state transitions with mandatory
checkpoints at each stage for HIPAA auditing.
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, StateGraph

from medos.agents.clinical_scribe.nodes import (
    finalize,
    generate_soap,
    handle_error,
    receive_audio,
    request_human_review,
    review_coding,
    route_confidence,
    transcribe,
)
from medos.agents.clinical_scribe.state import ScribeState

logger = logging.getLogger(__name__)


def build_clinical_scribe_graph() -> StateGraph:
    """Build the Clinical Scribe LangGraph state machine.

    Returns a compiled StateGraph ready for invocation.

    Nodes:
        receive_audio       - Initialize session, receive audio input
        transcribe          - Convert audio to text (Whisper v3)
        generate_soap       - Generate SOAP note (Claude via Bedrock)
        review_coding       - Validate ICD-10/CPT codes
        request_human_review - Create review task for low confidence
        finalize            - Mark session complete
        handle_error        - Error handling

    Edges:
        receive_audio -> transcribe -> generate_soap -> review_coding
        review_coding -> [confidence routing]:
            - "finalize" -> finalize -> END
            - "human_review" -> request_human_review -> END
            - "error" -> handle_error -> END
    """
    graph = StateGraph(ScribeState)

    # Add nodes
    graph.add_node("receive_audio", receive_audio)
    graph.add_node("transcribe", transcribe)
    graph.add_node("generate_soap", generate_soap)
    graph.add_node("review_coding", review_coding)
    graph.add_node("request_human_review", request_human_review)
    graph.add_node("finalize", finalize)
    graph.add_node("handle_error", handle_error)

    # Set entry point
    graph.set_entry_point("receive_audio")

    # Linear edges
    graph.add_edge("receive_audio", "transcribe")
    graph.add_edge("transcribe", "generate_soap")
    graph.add_edge("generate_soap", "review_coding")

    # Conditional routing after coding review
    graph.add_conditional_edges(
        "review_coding",
        route_confidence,
        {
            "finalize": "finalize",
            "human_review": "request_human_review",
            "error": "handle_error",
        },
    )

    # Terminal edges
    graph.add_edge("finalize", END)
    graph.add_edge("request_human_review", END)
    graph.add_edge("handle_error", END)

    return graph


async def run_clinical_scribe(
    patient_id: str,
    encounter_id: str = "",
    provider_id: str = "",
    tenant_id: str = "dev-tenant-001",
    audio_url: str = "",
) -> dict[str, Any]:
    """Convenience function to run the Clinical Scribe pipeline.

    Returns the final state after the graph completes.
    """
    graph = build_clinical_scribe_graph()
    compiled = graph.compile()

    initial_state: dict[str, Any] = {
        "patient_id": patient_id,
        "encounter_id": encounter_id,
        "provider_id": provider_id,
        "tenant_id": tenant_id,
        "audio_url": audio_url,
        "status": "starting",
        "messages": [],
        "metadata": {},
    }

    result = await compiled.ainvoke(initial_state)
    logger.info(
        "Clinical Scribe completed for patient=%s status=%s",
        patient_id,
        result.get("status", "unknown"),
    )
    return dict(result)
