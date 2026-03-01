"""MCP Tool Registry - discovers, registers, and resolves MCP tools.

Each MCP server registers its tools here at startup. The gateway
uses the registry to route incoming tool calls to the correct handler.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from typing import Any

from medos.schemas.agent import AgentContext, AgentType, MCPToolDefinition

logger = logging.getLogger(__name__)

# Type alias for an async tool handler
ToolHandler = Callable[..., Coroutine[Any, Any, Any]]


@dataclass
class RegisteredTool:
    """Internal representation of a registered MCP tool."""

    definition: MCPToolDefinition
    handler: ToolHandler


class ToolRegistry:
    """Central registry for all MCP tools across servers.

    Usage::

        registry = ToolRegistry()
        registry.register(definition, handler_fn)
        result = await registry.invoke("fhir_read", params, agent_ctx)
    """

    def __init__(self) -> None:
        self._tools: dict[str, RegisteredTool] = {}

    def register(
        self,
        definition: MCPToolDefinition,
        handler: ToolHandler,
    ) -> None:
        """Register an MCP tool with its handler."""
        if definition.name in self._tools:
            logger.warning("Overwriting existing tool: %s", definition.name)
        self._tools[definition.name] = RegisteredTool(
            definition=definition,
            handler=handler,
        )
        logger.info(
            "Registered MCP tool: %s (server=%s, phi=%s)",
            definition.name,
            definition.server,
            definition.phi_access_level,
        )

    def get(self, tool_name: str) -> RegisteredTool | None:
        """Look up a registered tool by name."""
        return self._tools.get(tool_name)

    def list_tools(
        self,
        server: str | None = None,
        agent_type: AgentType | None = None,
    ) -> list[MCPToolDefinition]:
        """List tool definitions, optionally filtered by server or agent type."""
        tools = list(self._tools.values())
        if server:
            tools = [t for t in tools if t.definition.server == server]
        if agent_type:
            tools = [
                t
                for t in tools
                if not t.definition.allowed_agent_types
                or agent_type in t.definition.allowed_agent_types
            ]
        return [t.definition for t in tools]

    def list_tool_names(self) -> list[str]:
        """Return all registered tool names."""
        return list(self._tools.keys())

    async def invoke(
        self,
        tool_name: str,
        params: dict[str, Any],
        agent_ctx: AgentContext | None = None,
    ) -> Any:
        """Invoke a tool by name with parameters.

        Raises:
            KeyError: if the tool is not registered.
            PermissionError: if the agent is not allowed to use the tool.
        """
        registered = self._tools.get(tool_name)
        if not registered:
            raise KeyError(f"Unknown MCP tool: {tool_name}")

        # Check agent permissions
        allowed = registered.definition.allowed_agent_types
        if allowed and agent_ctx and agent_ctx.agent_type not in allowed:
            raise PermissionError(
                f"Agent type '{agent_ctx.agent_type}' not allowed for tool '{tool_name}'"
            )

        return await registered.handler(params=params, agent_ctx=agent_ctx)

    @property
    def tool_count(self) -> int:
        return len(self._tools)


# Module-level singleton
tool_registry = ToolRegistry()
