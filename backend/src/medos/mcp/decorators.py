"""HIPAA-aware tool decorators for MCP servers.

Provides @hipaa_tool decorator that marks functions with PHI access
metadata, allowed agent types, and approval requirements. These
decorated functions are collected and registered with HIPAAFastMCP.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from medos.schemas.agent import AgentType

# Global collector for decorated tools (per-server)
_decorated_tools: dict[str, list[tuple[Any, HIPAAToolMeta]]] = {}


@dataclass
class HIPAAToolMeta:
    """Metadata attached to a tool by the @hipaa_tool decorator."""

    phi_level: str  # "none", "limited", "full"
    allowed_agents: list[AgentType] = field(default_factory=list)
    server: str = ""
    requires_approval: bool = False


def hipaa_tool(
    *,
    phi_level: str = "none",
    allowed_agents: list[AgentType] | None = None,
    server: str = "",
    requires_approval: bool = False,
):
    """Decorator to mark a function as an MCP tool with HIPAA metadata.

    Usage::

        @hipaa_tool(
            phi_level="limited",
            allowed_agents=[AgentType.CLINICAL_SCRIBE, AgentType.SYSTEM],
            server="fhir",
        )
        async def fhir_read(resource_type: str, resource_id: str) -> dict:
            ...
    """

    def decorator(fn):
        meta = HIPAAToolMeta(
            phi_level=phi_level,
            allowed_agents=allowed_agents or [],
            server=server,
            requires_approval=requires_approval,
        )
        fn._hipaa_meta = meta  # noqa: SLF001

        # Collect by server
        if server not in _decorated_tools:
            _decorated_tools[server] = []
        _decorated_tools[server].append((fn, meta))

        return fn

    return decorator


def get_decorated_tools(server: str | None = None) -> list[tuple[Any, HIPAAToolMeta]]:
    """Retrieve all decorated tools, optionally filtered by server."""
    if server:
        return _decorated_tools.get(server, [])
    return [item for tools in _decorated_tools.values() for item in tools]


def clear_decorated_tools() -> None:
    """Clear all registered tools (used in tests)."""
    _decorated_tools.clear()
