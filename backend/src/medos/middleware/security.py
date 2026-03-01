"""Security hardening middleware for MedOS Platform.

Four Starlette ASGI middlewares:

1. PHISafeErrorHandler - catches unhandled exceptions, strips PHI from responses
2. RateLimiter - per-tenant request rate limiting (in-memory for demo)
3. InputValidator - body size, content-type, request-ID, SQL-injection guard
4. SecurityHeaders - standard OWASP security headers on every response

HIPAA Compliance:
- Errors NEVER leak PHI to the client.  Full details are logged server-side.
- Rate limits prevent brute-force enumeration of patient records.
- Input validation blocks common injection vectors at the edge.
"""

from __future__ import annotations

import json
import logging
import re
import time
import uuid
from collections import defaultdict
from urllib.parse import unquote

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PHI patterns (mirrors safety_layer.py but used for error-response scrubbing)
# ---------------------------------------------------------------------------

_PHI_REDACT_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("MRN", re.compile(r"\bMRN-?\s*\d{4,}\b", re.IGNORECASE)),
    ("DOB", re.compile(r"\b\d{2}/\d{2}/\d{4}\b")),
    ("DOB_ISO", re.compile(r"\b\d{4}-\d{2}-\d{2}\b")),
    ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")),
    ("PHONE", re.compile(r"\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
]

# SQL injection patterns (common attack vectors in query params)
_SQL_INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b\s)", re.IGNORECASE),
    re.compile(r"(--|;)\s*$"),
    re.compile(r"'\s*(OR|AND)\s+'", re.IGNORECASE),
    re.compile(r"'\s*(OR|AND)\s+\d+\s*=\s*\d+", re.IGNORECASE),
]

# Endpoints that serve PHI and must have Cache-Control: no-store
_PHI_PATH_PREFIXES = ("/fhir/", "/api/v1/patients", "/api/v1/agents/")


def _redact_phi(text: str) -> str:
    """Replace any PHI patterns in *text* with [REDACTED]."""
    result = text
    for _name, pattern in _PHI_REDACT_PATTERNS:
        result = pattern.sub("[REDACTED]", result)
    return result


# ===================================================================
# 1. PHISafeErrorHandler
# ===================================================================


class PHISafeErrorHandler:
    """Catch unhandled exceptions and return a sanitised JSON error.

    Full exception details (which may contain PHI) are logged server-side
    but **never** returned to the client.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())

        # Try to extract X-Request-ID from incoming headers
        for hdr_name, hdr_value in scope.get("headers", []):
            if hdr_name == b"x-request-id":
                request_id = hdr_value.decode("utf-8", errors="replace")
                break

        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            # Log full error internally (may contain PHI -- logs are protected)
            logger.error(
                "unhandled_exception",
                extra={
                    "request_id": request_id,
                    "path": scope.get("path", "/"),
                    "error": str(exc),
                },
                exc_info=True,
            )

            # Build a safe response that never leaks PHI
            safe_body = json.dumps({
                "error": "Internal server error",
                "request_id": request_id,
                "support": "Contact support with this request_id",
            }).encode("utf-8")

            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"x-request-id", request_id.encode("utf-8")),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": safe_body,
            })


# ===================================================================
# 2. RateLimiter
# ===================================================================


class RateLimiter:
    """Per-tenant sliding-window rate limiter (in-memory for demo/dev).

    Production should swap the storage backend to Redis.

    Parameters
    ----------
    app : ASGIApp
    default_limit : int
        Max requests per window (default 100).
    window_seconds : int
        Sliding window size in seconds (default 60).
    route_overrides : dict[str, int] | None
        Path-prefix -> per-window limit overrides.
    """

    def __init__(
        self,
        app: ASGIApp,
        default_limit: int = 100,
        window_seconds: int = 60,
        route_overrides: dict[str, int] | None = None,
    ) -> None:
        self.app = app
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        self.route_overrides = route_overrides or {}
        # tenant_id -> list of request timestamps
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def _get_tenant_id(self, scope: Scope) -> str:
        """Extract tenant from JWT claim header or X-Tenant-ID fallback."""
        for hdr_name, hdr_value in scope.get("headers", []):
            if hdr_name == b"x-tenant-id":
                return hdr_value.decode("utf-8", errors="replace")
        # Fall back to client IP so un-authed requests are still limited
        client: tuple[str, int] | None = scope.get("client")
        return client[0] if client else "anonymous"

    def _limit_for_path(self, path: str) -> int:
        """Return the rate limit applicable to *path*."""
        for prefix, limit in self.route_overrides.items():
            if path.startswith(prefix):
                return limit
        return self.default_limit

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        tenant_id = self._get_tenant_id(scope)
        path = scope.get("path", "/")
        limit = self._limit_for_path(path)
        now = time.monotonic()
        window_start = now - self.window_seconds

        # Prune old entries and count
        bucket = self._buckets[tenant_id]
        bucket[:] = [ts for ts in bucket if ts > window_start]

        if len(bucket) >= limit:
            retry_after = int(self.window_seconds - (now - bucket[0])) + 1
            body = json.dumps({
                "error": "Too many requests",
                "retry_after": retry_after,
            }).encode("utf-8")

            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", str(retry_after).encode()),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": body,
            })
            return

        bucket.append(now)
        await self.app(scope, receive, send)


# ===================================================================
# 3. InputValidator
# ===================================================================

_MAX_BODY_BYTES = 10 * 1024 * 1024  # 10 MB


class InputValidator:
    """Validate incoming requests at the middleware layer.

    Checks:
    - Content-Type is ``application/json`` for write methods.
    - Request body does not exceed 10 MB.
    - Adds ``X-Request-ID`` to responses (generates one if absent).
    - Query parameters are scanned for SQL injection patterns.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        headers_list: list[tuple[bytes, bytes]] = list(scope.get("headers", []))
        headers_dict: dict[bytes, bytes] = dict(headers_list)

        # --- Request ID handling ---
        request_id = headers_dict.get(b"x-request-id", b"").decode("utf-8", errors="replace")
        if not request_id:
            request_id = str(uuid.uuid4())

        # --- Content-Type check for write methods ---
        if method in ("POST", "PUT", "PATCH"):
            content_type = headers_dict.get(b"content-type", b"").decode("utf-8", errors="replace")
            if not content_type.startswith("application/json"):
                await self._reject(send, 415, "Content-Type must be application/json", request_id)
                return

        # --- Body size check via Content-Length header ---
        if method in ("POST", "PUT", "PATCH"):
            content_length_raw = headers_dict.get(b"content-length", b"0")
            try:
                content_length = int(content_length_raw)
            except (ValueError, TypeError):
                content_length = 0
            if content_length > _MAX_BODY_BYTES:
                await self._reject(send, 413, "Request body too large (max 10MB)", request_id)
                return

        # --- SQL injection check on query string (URL-decoded) ---
        query_string_raw = scope.get("query_string", b"").decode("utf-8", errors="replace")
        if query_string_raw:
            query_string = unquote(query_string_raw)
            for pattern in _SQL_INJECTION_PATTERNS:
                if pattern.search(query_string):
                    logger.warning(
                        "sql_injection_attempt",
                        extra={"query_string": query_string, "path": scope.get("path", "/")},
                    )
                    await self._reject(send, 400, "Potentially dangerous query parameter", request_id)
                    return

        # --- Inject X-Request-ID into response headers ---
        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                response_headers = MutableHeaders(scope=message)
                response_headers.append("x-request-id", request_id)
            await send(message)

        await self.app(scope, receive, send_with_request_id)

    @staticmethod
    async def _reject(send: Send, status: int, detail: str, request_id: str) -> None:
        body = json.dumps({"error": detail, "request_id": request_id}).encode("utf-8")
        await send({
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json"),
                (b"x-request-id", request_id.encode("utf-8")),
            ],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })


# ===================================================================
# 4. SecurityHeaders
# ===================================================================


class SecurityHeaders:
    """Append OWASP-recommended security headers to every HTTP response.

    For paths under ``/fhir/`` or other PHI endpoints, ``Cache-Control: no-store``
    is added to prevent browser/proxy caching of sensitive data.
    """

    # Headers applied to every response
    _GLOBAL_HEADERS: list[tuple[bytes, bytes]] = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"x-xss-protection", b"1; mode=block"),
        (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
        (b"content-security-policy", b"default-src 'self'"),
    ]

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "/")
        is_phi_path = any(path.startswith(prefix) for prefix in _PHI_PATH_PREFIXES)

        async def send_with_security_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                response_headers = MutableHeaders(scope=message)
                for hdr_name, hdr_value in self._GLOBAL_HEADERS:
                    response_headers.append(
                        hdr_name.decode("utf-8"), hdr_value.decode("utf-8"),
                    )
                if is_phi_path:
                    response_headers.append("cache-control", "no-store")
            await send(message)

        await self.app(scope, receive, send_with_security_headers)
