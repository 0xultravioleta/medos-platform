"""Tests for MCP Gateway (auth, routing, audit, rate limiting)."""

import pytest

from medos.mcp.gateway import mcp_gateway
from medos.mcp.registry import tool_registry
from medos.mcp.servers.fhir_server import _seed_demo_patients, register_fhir_tools
from medos.schemas.agent import AgentContext, AgentType


@pytest.fixture(autouse=True)
def _register_tools():
    """Ensure FHIR tools are registered via @hipaa_tool + HIPAAFastMCP."""
    _seed_demo_patients()
    # Register tools via the new decorator system
    from medos.mcp.decorators import get_decorated_tools
    from medos.mcp.hipaa_fastmcp import medos_mcp

    register_fhir_tools()
    # Only register if not already done
    if tool_registry.tool_count == 0:
        medos_mcp.register_hipaa_tools()


def _agent_ctx(agent_type: AgentType = AgentType.CLINICAL_SCRIBE) -> AgentContext:
    return AgentContext(
        agent_type=agent_type,
        tenant_id="test-tenant-001",
        session_id="test-session-001",
    )


# ---------------------------------------------------------------------------
# Gateway - tool invocation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gateway_tool_call_success():
    result = await mcp_gateway.handle_tool_call(
        "fhir_read",
        {"resource_type": "Patient", "resource_id": "p-001"},
        _agent_ctx(),
    )
    assert "result" in result
    assert result["result"]["id"] == "p-001"


@pytest.mark.asyncio
async def test_gateway_tool_not_found():
    result = await mcp_gateway.handle_tool_call(
        "nonexistent_tool", {}, _agent_ctx()
    )
    assert "error" in result
    assert result["error"]["code"] == "tool_not_found"


@pytest.mark.asyncio
async def test_gateway_missing_tenant():
    ctx = AgentContext(agent_type=AgentType.SYSTEM, tenant_id="")
    result = await mcp_gateway.handle_tool_call("fhir_read", {}, ctx)
    assert "error" in result
    assert result["error"]["code"] == "invalid_context"


@pytest.mark.asyncio
async def test_gateway_phi_access_denied():
    """Patient comms agent should not access full PHI tools."""
    ctx = _agent_ctx(AgentType.PATIENT_COMMS)
    result = await mcp_gateway.handle_tool_call(
        "fhir_patient_everything",
        {"patient_id": "p-001"},
        ctx,
    )
    assert "error" in result
    assert result["error"]["code"] == "phi_access_denied"


@pytest.mark.asyncio
async def test_gateway_list_tools():
    tools = mcp_gateway.list_tools(_agent_ctx())
    assert len(tools) > 0
    names = [t["name"] for t in tools]
    assert "fhir_read" in names
    assert "fhir_search" in names
