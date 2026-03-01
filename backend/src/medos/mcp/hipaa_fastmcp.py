"""HIPAAFastMCP - FastMCP subclass with HIPAA security pipeline.

Combines the official MCP SDK (FastMCP) with MedOS security:
- Agent authentication and context validation
- PHI access policies (minimum necessary)
- Per-agent rate limiting
- HIPAA audit logging on every tool call

Architecture::

    External Agent / Claude Code
            |
            v
    FastMCP (protocol: JSON-RPC, SSE, Streamable HTTP)
            |
            v
    HIPAAFastMCP.call_tool() override
    [Auth -> PHI Policy -> Rate Limit -> Audit]
            |
            v
    Tool Handler (business logic)
            |
            v
    [Audit success/failure]
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from collections.abc import Sequence
from contextvars import ContextVar
from typing import Any

from mcp.server.fastmcp import FastMCP
from mcp.types import ContentBlock

from medos.core.audit_agent import log_agent_audit_event
from medos.mcp.decorators import HIPAAToolMeta, get_decorated_tools
from medos.mcp.registry import tool_registry
from medos.schemas.agent import (
    AgentContext,
    AgentEvent,
    AgentType,
    MCPToolDefinition,
)

logger = logging.getLogger(__name__)

# Context variable to carry agent context through tool calls
current_agent_context: ContextVar[AgentContext | None] = ContextVar(
    "current_agent_context",
    default=None,
)

_DEFAULT_AGENT_CONTEXT = AgentContext(
    agent_type=AgentType.SYSTEM,
    tenant_id="dev-tenant-001",
    session_id="default",
    purpose_of_use="TREAT",
)

# Rate limiting (in-memory, per-agent, per-minute)
_rate_limit_buckets: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_PER_MINUTE = 60

# PHI access policies per agent type
PHI_POLICIES: dict[AgentType, set[str]] = {
    AgentType.CLINICAL_SCRIBE: {"full", "limited", "none"},
    AgentType.PRIOR_AUTH: {"limited", "none"},
    AgentType.DENIAL_MANAGEMENT: {"limited", "none"},
    AgentType.BILLING: {"limited", "none"},
    AgentType.SCHEDULING: {"limited", "none"},
    AgentType.PATIENT_COMMS: {"none", "limited"},
    AgentType.QUALITY_REPORTING: {"none"},
    AgentType.DEVICE_BRIDGE: {"limited", "none"},
    AgentType.SYSTEM: {"full", "limited", "none"},
}


class HIPAAFastMCP(FastMCP):
    """FastMCP with HIPAA security pipeline injected into call_tool()."""

    def __init__(self, name: str = "MedOS Healthcare OS", **kwargs):
        super().__init__(name=name, **kwargs)
        # Store HIPAA metadata for each tool (tool_name -> HIPAAToolMeta)
        self._hipaa_meta: dict[str, HIPAAToolMeta] = {}

    def register_hipaa_tools(self) -> None:
        """Register all @hipaa_tool decorated functions with FastMCP and our registry."""
        tools = get_decorated_tools()
        for fn, meta in tools:
            tool_name = fn.__name__
            self._hipaa_meta[tool_name] = meta

            # Register with FastMCP (handles JSON-RPC, input schema generation)
            self.add_tool(fn, name=tool_name, description=fn.__doc__ or "")

            # Also register with our internal registry for gateway compatibility
            tool_registry.register(
                MCPToolDefinition(
                    name=tool_name,
                    description=fn.__doc__ or "",
                    server=meta.server,
                    input_schema={},  # FastMCP generates this from type hints
                    phi_access_level=meta.phi_level,
                    requires_approval=meta.requires_approval,
                    allowed_agent_types=meta.allowed_agents,
                ),
                _make_registry_handler(fn),
            )

        logger.info("Registered %d HIPAA tools with FastMCP", len(tools))

    async def call_tool(
        self, name: str, arguments: dict[str, Any]
    ) -> Sequence[ContentBlock] | dict[str, Any]:
        """Override call_tool to inject HIPAA security pipeline."""
        start_time = time.monotonic()
        agent_ctx = current_agent_context.get() or _DEFAULT_AGENT_CONTEXT
        meta = self._hipaa_meta.get(name)

        try:
            # 1. Validate agent context
            if not agent_ctx.tenant_id:
                raise PermissionError("Missing tenant_id in agent context")

            # 2. Check rate limit
            self._check_rate_limit(agent_ctx)

            # 3. Check PHI access policy
            if meta:
                self._check_phi_policy(agent_ctx, meta.phi_level)

                # 4. Check agent type permissions
                if meta.allowed_agents and agent_ctx.agent_type not in meta.allowed_agents:
                    raise PermissionError(
                        f"Agent type '{agent_ctx.agent_type}' not allowed for '{name}'"
                    )

            # 5. Execute tool via FastMCP
            result = await super().call_tool(name, arguments)

            # 6. Audit success
            duration_ms = (time.monotonic() - start_time) * 1000
            log_agent_audit_event(
                AgentEvent(
                    event_type="tool.invoked",
                    agent_type=agent_ctx.agent_type,
                    agent_version=agent_ctx.agent_version,
                    tenant_id=agent_ctx.tenant_id,
                    session_id=agent_ctx.session_id,
                    tool_name=name,
                    metadata={"duration_ms": round(duration_ms, 2), "outcome": "success"},
                )
            )

            return result

        except Exception as exc:
            duration_ms = (time.monotonic() - start_time) * 1000
            log_agent_audit_event(
                AgentEvent(
                    event_type="tool.error",
                    agent_type=agent_ctx.agent_type,
                    tenant_id=agent_ctx.tenant_id,
                    session_id=agent_ctx.session_id,
                    tool_name=name,
                    metadata={
                        "duration_ms": round(duration_ms, 2),
                        "error": str(exc),
                    },
                )
            )
            raise

    def _check_rate_limit(self, ctx: AgentContext) -> None:
        """Simple per-agent rate limiting (in-memory, per-minute window)."""
        key = f"{ctx.tenant_id}:{ctx.agent_type}"
        now = time.time()
        window_start = now - 60

        _rate_limit_buckets[key] = [
            t for t in _rate_limit_buckets[key] if t > window_start
        ]

        if len(_rate_limit_buckets[key]) >= RATE_LIMIT_PER_MINUTE:
            raise PermissionError(
                f"Rate limit exceeded: {RATE_LIMIT_PER_MINUTE}/min for {ctx.agent_type}"
            )

        _rate_limit_buckets[key].append(now)

    def _check_phi_policy(self, ctx: AgentContext, required_level: str) -> None:
        """Enforce minimum necessary PHI access per agent type."""
        if required_level == "none":
            return

        allowed_levels = PHI_POLICIES.get(ctx.agent_type, set())
        if required_level not in allowed_levels:
            raise PermissionError(
                f"Agent '{ctx.agent_type}' not authorized for PHI level '{required_level}'"
            )


def _make_registry_handler(fn):
    """Wrap a tool function for the legacy registry interface."""

    async def handler(params: dict[str, Any], agent_ctx: AgentContext | None = None):
        return await fn(**params)

    return handler


def create_medos_mcp() -> HIPAAFastMCP:
    """Factory function to create the MedOS MCP server instance."""
    mcp = HIPAAFastMCP(
        name="MedOS Healthcare OS",
        instructions=(
            "MedOS is an AI-native healthcare operating system. "
            "Use these tools to access FHIR resources, manage clinical documentation, "
            "handle billing/claims, and schedule appointments. "
            "All operations are HIPAA-compliant with audit logging."
        ),
        stateless_http=True,
    )
    return mcp


# Module-level singleton
medos_mcp = create_medos_mcp()
