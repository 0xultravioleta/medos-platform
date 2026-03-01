"""WebSocket endpoint for real-time agent events.

Provides a WebSocket connection at /ws/agent-events that broadcasts
agent task lifecycle events (created, reviewed) to connected clients.

Usage:
    ws = websocket.connect("ws://localhost:8000/ws/agent-events?token=...")
    # Receives JSON messages:
    # {"type": "task_created", "task_id": "...", "agent_type": "...", "title": "..."}
    # {"type": "task_reviewed", "task_id": "...", "action": "approved|rejected"}
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket Events"])

# Connected WebSocket clients
_connected_clients: set[WebSocket] = set()


async def broadcast_event(event: dict[str, Any]) -> None:
    """Broadcast an event to all connected WebSocket clients."""
    if not _connected_clients:
        return

    message = json.dumps(event)
    disconnected: list[WebSocket] = []

    for ws in _connected_clients:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)

    for ws in disconnected:
        _connected_clients.discard(ws)


@router.websocket("/ws/agent-events")
async def agent_events_ws(websocket: WebSocket):
    """WebSocket endpoint for real-time agent event streaming."""
    await websocket.accept()
    _connected_clients.add(websocket)
    logger.info("WebSocket client connected (total=%d)", len(_connected_clients))

    try:
        while True:
            # Keep connection alive; client can send pings or messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _connected_clients.discard(websocket)
        logger.info("WebSocket client disconnected (total=%d)", len(_connected_clients))
