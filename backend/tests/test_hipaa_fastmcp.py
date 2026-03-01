"""Tests for HIPAAFastMCP and @hipaa_tool decorators."""

import pytest

from medos.mcp.decorators import HIPAAToolMeta, clear_decorated_tools, get_decorated_tools, hipaa_tool
from medos.mcp.hipaa_fastmcp import HIPAAFastMCP, PHI_POLICIES
from medos.schemas.agent import AgentType


# ---------------------------------------------------------------------------
# Decorator tests
# ---------------------------------------------------------------------------


def test_hipaa_tool_decorator():
    """Test that @hipaa_tool attaches metadata to functions."""
    @hipaa_tool(phi_level="limited", server="test", allowed_agents=[AgentType.SYSTEM])
    async def my_tool(x: str) -> dict:
        """Test tool."""
        return {"x": x}

    assert hasattr(my_tool, "_hipaa_meta")
    meta = my_tool._hipaa_meta
    assert isinstance(meta, HIPAAToolMeta)
    assert meta.phi_level == "limited"
    assert meta.server == "test"
    assert AgentType.SYSTEM in meta.allowed_agents


def test_get_decorated_tools():
    """Test tool collection by server."""
    tools = get_decorated_tools("fhir")
    assert len(tools) >= 12  # 12 FHIR tools
    tool_names = [fn.__name__ for fn, _ in tools]
    assert "fhir_read" in tool_names
    assert "fhir_search" in tool_names


def test_get_decorated_tools_scribe():
    tools = get_decorated_tools("scribe")
    assert len(tools) >= 6
    tool_names = [fn.__name__ for fn, _ in tools]
    assert "scribe_start_session" in tool_names


def test_get_decorated_tools_billing():
    tools = get_decorated_tools("billing")
    assert len(tools) >= 8
    tool_names = [fn.__name__ for fn, _ in tools]
    assert "billing_check_eligibility" in tool_names
    assert "billing_submit_claim" in tool_names


def test_get_decorated_tools_scheduling():
    tools = get_decorated_tools("scheduling")
    assert len(tools) >= 6
    tool_names = [fn.__name__ for fn, _ in tools]
    assert "scheduling_available_slots" in tool_names
    assert "scheduling_book" in tool_names


def test_total_decorated_tools():
    """Should have at least 32 tools total."""
    all_tools = get_decorated_tools()
    assert len(all_tools) >= 32


# ---------------------------------------------------------------------------
# HIPAAFastMCP tests
# ---------------------------------------------------------------------------


def test_hipaa_fastmcp_creation():
    mcp = HIPAAFastMCP(name="Test MCP")
    assert mcp.name == "Test MCP"


def test_hipaa_fastmcp_register_tools():
    mcp = HIPAAFastMCP(name="Test MCP 2")
    mcp.register_hipaa_tools()
    # Should have registered tools
    assert len(mcp._hipaa_meta) >= 32


# ---------------------------------------------------------------------------
# PHI Policy tests
# ---------------------------------------------------------------------------


def test_phi_policies_complete():
    """Ensure all agent types have PHI policies."""
    for agent_type in AgentType:
        assert agent_type in PHI_POLICIES, f"Missing PHI policy for {agent_type}"


def test_phi_policy_system_has_full():
    assert "full" in PHI_POLICIES[AgentType.SYSTEM]
    assert "limited" in PHI_POLICIES[AgentType.SYSTEM]
    assert "none" in PHI_POLICIES[AgentType.SYSTEM]


def test_phi_policy_quality_reporting_restricted():
    assert PHI_POLICIES[AgentType.QUALITY_REPORTING] == {"none"}


def test_phi_policy_billing():
    assert "limited" in PHI_POLICIES[AgentType.BILLING]
    assert "full" not in PHI_POLICIES[AgentType.BILLING]
