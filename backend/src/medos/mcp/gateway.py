"""MCP Gateway - auth, tenant isolation, audit, and rate limiting.

Sits between MCP clients (Claude Code, external agents) and the
MCP tool registry. Enforces security policies before any tool executes.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Any

from medos.core.audit_agent import log_agent_audit_event
from medos.mcp.registry import tool_registry
from medos.schemas.agent import AgentContext, AgentEvent, AgentType

logger = logging.getLogger(__name__)

# Simple in-memory rate limiter (per-agent, per-minute)
_rate_limit_buckets: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_PER_MINUTE = 60

# Minimum necessary PHI access policies per agent type
PHI_POLICIES: dict[AgentType, set[str]] = {
    AgentType.CLINICAL_SCRIBE: {"full", "limited", "none"},  # full clinical record for current encounter
    AgentType.PRIOR_AUTH: {"limited", "none"},  # claims + coverage + diagnoses only
    AgentType.DENIAL_MANAGEMENT: {"limited", "none"},
    AgentType.BILLING: {"limited", "none"},  # claims + coverage data
    AgentType.SCHEDULING: {"limited", "none"},  # appointment + patient contact info
    AgentType.PATIENT_COMMS: {"none", "limited"},  # name + contact + appointments
    AgentType.QUALITY_REPORTING: {"none"},  # aggregated/de-identified only
    AgentType.DEVICE_BRIDGE: {"limited", "none"},  # device readings + patient context
    AgentType.SYSTEM: {"full", "limited", "none"},
}


class MCPGatewayError(Exception):
    """Base error for MCP gateway failures."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


class MCPGateway:
    """Central gateway for MCP tool invocations.

    Responsibilities:
    1. Authenticate and validate agent context
    2. Check PHI access policies (minimum necessary)
    3. Rate limiting (per-agent)
    4. Audit logging (every tool call)
    5. Route to tool handler via registry
    """

    def __init__(self) -> None:
        self.registry = tool_registry

    async def handle_tool_call(
        self,
        tool_name: str,
        params: dict[str, Any],
        agent_ctx: AgentContext,
    ) -> dict[str, Any]:
        """Process an MCP tool call through the full security pipeline.

        Returns:
            {"result": <tool_output>} on success
            {"error": {"code": ..., "message": ...}} on failure
        """
        start_time = time.monotonic()

        try:
            # 1. Validate agent context
            self._validate_agent_context(agent_ctx)

            # 2. Check rate limit
            self._check_rate_limit(agent_ctx)

            # 3. Resolve tool
            tool = self.registry.get(tool_name)
            if not tool:
                raise MCPGatewayError("tool_not_found", f"Unknown tool: {tool_name}")

            # 4. Check PHI access policy
            self._check_phi_policy(agent_ctx, tool.definition.phi_access_level)

            # 5. Check agent type permissions
            allowed = tool.definition.allowed_agent_types
            if allowed and agent_ctx.agent_type not in allowed:
                raise MCPGatewayError(
                    "forbidden",
                    f"Agent type '{agent_ctx.agent_type}' not allowed for '{tool_name}'",
                )

            # 6. Execute tool
            result = await self.registry.invoke(tool_name, params, agent_ctx)

            # 7. Audit success
            duration_ms = (time.monotonic() - start_time) * 1000
            log_agent_audit_event(
                event=AgentEvent(
                    event_type="tool.invoked",
                    agent_type=agent_ctx.agent_type,
                    agent_version=agent_ctx.agent_version,
                    tenant_id=agent_ctx.tenant_id,
                    session_id=agent_ctx.session_id,
                    tool_name=tool_name,
                    metadata={"duration_ms": round(duration_ms, 2), "outcome": "success"},
                )
            )

            return {"result": result}

        except MCPGatewayError as exc:
            duration_ms = (time.monotonic() - start_time) * 1000
            log_agent_audit_event(
                event=AgentEvent(
                    event_type="tool.error",
                    agent_type=agent_ctx.agent_type,
                    tenant_id=agent_ctx.tenant_id,
                    session_id=agent_ctx.session_id,
                    tool_name=tool_name,
                    metadata={
                        "duration_ms": round(duration_ms, 2),
                        "error_code": exc.code,
                        "error_message": exc.message,
                    },
                )
            )
            return {"error": {"code": exc.code, "message": exc.message}}

        except Exception as exc:
            logger.exception("Unexpected error in MCP gateway for tool '%s'", tool_name)
            return {"error": {"code": "internal_error", "message": str(exc)}}

    def _validate_agent_context(self, ctx: AgentContext) -> None:
        """Ensure agent context has required fields."""
        if not ctx.tenant_id:
            raise MCPGatewayError("invalid_context", "Missing tenant_id in agent context")
        if not ctx.agent_type:
            raise MCPGatewayError("invalid_context", "Missing agent_type in agent context")

    def _check_rate_limit(self, ctx: AgentContext) -> None:
        """Simple per-agent rate limiting (in-memory, per-minute window)."""
        key = f"{ctx.tenant_id}:{ctx.agent_type}"
        now = time.time()
        window_start = now - 60

        # Clean old entries
        _rate_limit_buckets[key] = [
            t for t in _rate_limit_buckets[key] if t > window_start
        ]

        if len(_rate_limit_buckets[key]) >= RATE_LIMIT_PER_MINUTE:
            raise MCPGatewayError(
                "rate_limited",
                f"Rate limit exceeded: {RATE_LIMIT_PER_MINUTE}/min for {ctx.agent_type}",
            )

        _rate_limit_buckets[key].append(now)

    def _check_phi_policy(self, ctx: AgentContext, required_level: str) -> None:
        """Enforce minimum necessary PHI access per agent type."""
        if required_level == "none":
            return  # no PHI needed, always allowed

        allowed_levels = PHI_POLICIES.get(ctx.agent_type, set())
        if required_level not in allowed_levels:
            raise MCPGatewayError(
                "phi_access_denied",
                f"Agent '{ctx.agent_type}' not authorized for PHI level '{required_level}'",
            )

    def list_tools(self, agent_ctx: AgentContext | None = None) -> list[dict]:
        """List available tools, filtered by agent context."""
        agent_type = agent_ctx.agent_type if agent_ctx else None
        definitions = self.registry.list_tools(agent_type=agent_type)
        return [
            {
                "name": d.name,
                "description": d.description,
                "inputSchema": d.input_schema,
                "server": d.server,
            }
            for d in definitions
        ]


# Module-level singleton
mcp_gateway = MCPGateway()
