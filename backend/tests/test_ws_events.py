"""Tests for WebSocket agent events endpoint."""

import pytest
from fastapi.testclient import TestClient

from medos.main import app
from medos.routers.ws_events import _connected_clients, broadcast_event

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_clients():
    """Clear connected clients before each test."""
    _connected_clients.clear()
    yield
    _connected_clients.clear()


def test_websocket_connect_and_disconnect():
    """Test WebSocket connection lifecycle."""
    with client.websocket_connect("/ws/agent-events") as ws:
        assert len(_connected_clients) == 1
        ws.send_text("ping")
    # After disconnect, client should be removed
    assert len(_connected_clients) == 0


def test_websocket_receives_broadcast():
    """Test that connected clients receive broadcast events."""
    with client.websocket_connect("/ws/agent-events") as ws:
        # We need to use the sync test client approach
        # Send a message to keep connection active
        import asyncio

        event = {
            "type": "task_created",
            "task_id": "test-123",
            "agent_type": "prior_auth",
            "title": "Test task",
        }
        # Run broadcast in event loop
        loop = asyncio.new_event_loop()
        loop.run_until_complete(broadcast_event(event))
        loop.close()

        data = ws.receive_json()
        assert data["type"] == "task_created"
        assert data["task_id"] == "test-123"
        assert data["agent_type"] == "prior_auth"


def test_websocket_multiple_events():
    """Test receiving multiple events on a single connection."""
    with client.websocket_connect("/ws/agent-events") as ws:
        import asyncio

        events = [
            {"type": "task_created", "task_id": "t-1", "agent_type": "billing", "title": "Claim review"},
            {"type": "task_reviewed", "task_id": "t-1", "action": "approved"},
        ]

        loop = asyncio.new_event_loop()
        for event in events:
            loop.run_until_complete(broadcast_event(event))
        loop.close()

        data1 = ws.receive_json()
        assert data1["type"] == "task_created"

        data2 = ws.receive_json()
        assert data2["type"] == "task_reviewed"
        assert data2["action"] == "approved"


@pytest.mark.asyncio
async def test_broadcast_no_clients():
    """Test that broadcast with no clients does not error."""
    _connected_clients.clear()
    # Should not raise
    await broadcast_event({"type": "test", "data": "hello"})
