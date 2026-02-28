"""Request logging middleware for MedOS Platform.

Logs every HTTP request with timing, status code, and client metadata.

HIPAA Compliance:
- NEVER logs request or response bodies (may contain PHI)
- NEVER logs query parameters (may contain PHI in search queries)
- Only logs: method, path, status, duration, client IP, user-agent
"""

from __future__ import annotations

import time
from typing import Any

import structlog
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware:
    """ASGI middleware that logs every HTTP request with timing and status.

    Captures start time, passes through to the application, then logs
    the completed request with duration and response status code.

    This middleware intentionally does NOT log:
    - Request bodies (may contain PHI)
    - Response bodies (may contain PHI)
    - Query parameters (may contain PHI in FHIR search queries)
    - Authorization headers (contain bearer tokens)
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Process an ASGI request."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.monotonic()
        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")

        # Extract client IP safely
        client: tuple[str, int] | None = scope.get("client")
        client_ip = client[0] if client else "unknown"

        # Extract headers we care about (never auth headers)
        headers = dict(scope.get("headers", []))
        user_agent = headers.get(b"user-agent", b"").decode("utf-8", errors="replace")

        # Track response status
        status_code = 500  # default if we never get a response

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            status_code = 500
            raise
        finally:
            duration_ms = round((time.monotonic() - start_time) * 1000, 2)

            log_data: dict[str, Any] = {
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
                "user_agent": user_agent,
            }

            if status_code >= 500:
                logger.error("http_request", **log_data)
            elif status_code >= 400:
                logger.warning("http_request", **log_data)
            else:
                logger.info("http_request", **log_data)
