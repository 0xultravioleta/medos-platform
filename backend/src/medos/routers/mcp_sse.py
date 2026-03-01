"""MCP REST endpoints.

The SSE/Streamable HTTP transport is handled by FastMCP mounted at /mcp.
This router provides supplementary REST endpoints for tool discovery.

Endpoints:
    GET  /mcp/tools        - List available MCP tools (REST convenience)
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from medos.mcp.gateway import mcp_gateway
from medos.middleware.auth import get_current_user
from medos.schemas.agent import AgentContext, AgentType
from medos.schemas.auth import UserContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcp", tags=["MCP"])


def _user_to_agent_ctx(user: UserContext) -> AgentContext:
    """Convert a user context to an agent context for MCP calls."""
    return AgentContext(
        agent_type=AgentType.SYSTEM,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        session_id=str(uuid.uuid4()),
        purpose_of_use="TREAT",
    )


@router.get("/tools")
async def mcp_list_tools(
    user: UserContext = Depends(get_current_user),  # noqa: B008
) -> JSONResponse:
    """List all available MCP tools for the authenticated user."""
    agent_ctx = _user_to_agent_ctx(user)
    tools = mcp_gateway.list_tools(agent_ctx)
    return JSONResponse(content={"tools": tools, "total": len(tools)})
