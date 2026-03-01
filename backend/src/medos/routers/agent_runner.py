"""Agent runner API endpoint.

Provides a generic endpoint for triggering LangGraph agents
(prior_auth, denial_management) via REST.

Endpoints:
    POST /api/v1/agents/run  - Run an agent with given parameters
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from medos.middleware.auth import get_current_user
from medos.schemas.auth import UserContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["Agent Runner"])


class AgentRunRequest(BaseModel):
    """Request body for running an agent."""

    agent_type: str  # "prior_auth" or "denial_management"
    params: dict  # Agent-specific parameters


@router.post("/run")
async def run_agent(
    body: AgentRunRequest,
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    """Run an AI agent and return the result.

    For prior_auth: params should include patient_id, procedure_code,
        diagnosis_codes, payer.
    For denial_management: params should include claim_id.
    """
    if body.agent_type == "prior_auth":
        required = ["patient_id", "procedure_code"]
        missing = [f for f in required if f not in body.params]
        if missing:
            raise HTTPException(400, f"Missing required params: {', '.join(missing)}")

        from medos.agents.prior_auth.graph import run_prior_auth

        result = await run_prior_auth(
            patient_id=body.params["patient_id"],
            procedure_code=body.params["procedure_code"],
            diagnosis_codes=body.params.get("diagnosis_codes", []),
            payer=body.params.get("payer", ""),
            tenant_id=user.tenant_id,
        )

        return {
            "agent_type": "prior_auth",
            "status": result.get("status", "completed"),
            "result": {
                k: v
                for k, v in result.items()
                if k not in ("messages",)
            },
        }

    if body.agent_type == "denial_management":
        if "claim_id" not in body.params:
            raise HTTPException(400, "Missing required param: claim_id")

        from medos.agents.denial_mgmt.graph import run_denial_management

        result = await run_denial_management(
            claim_id=body.params["claim_id"],
            tenant_id=user.tenant_id,
        )

        return {
            "agent_type": "denial_management",
            "status": result.get("status", "completed"),
            "result": {
                k: v
                for k, v in result.items()
                if k not in ("messages",)
            },
        }

    raise HTTPException(400, f"Unknown agent_type: {body.agent_type}. Supported: prior_auth, denial_management")
