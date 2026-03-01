"""Tests for security hardening middleware (S5-T03).

Covers: PHISafeErrorHandler, RateLimiter, InputValidator, SecurityHeaders.
"""

import json

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.testclient import TestClient

from medos.middleware.security import (
    InputValidator,
    PHISafeErrorHandler,
    RateLimiter,
    SecurityHeaders,
)

# ---------------------------------------------------------------------------
# Helpers -- lightweight apps with each middleware for isolated testing
# ---------------------------------------------------------------------------


def _make_phi_error_app() -> FastAPI:
    """App that raises an exception containing PHI."""
    app = FastAPI()

    @app.get("/explode-ssn")
    async def _explode_ssn():
        raise RuntimeError("Failed to process patient SSN 123-45-6789")

    @app.get("/explode-mrn")
    async def _explode_mrn():
        raise RuntimeError("Record not found for MRN-123456")

    @app.get("/explode-email")
    async def _explode_email():
        raise RuntimeError("Notification failed for patient@hospital.com")

    @app.get("/explode-phone")
    async def _explode_phone():
        raise RuntimeError("SMS failed to (305) 555-1234")

    @app.get("/ok")
    async def _ok():
        return {"status": "ok"}

    app.add_middleware(PHISafeErrorHandler)
    return app


def _make_rate_limiter_app(
    default_limit: int = 5,
    window_seconds: int = 60,
    route_overrides: dict[str, int] | None = None,
) -> FastAPI:
    app = FastAPI()

    @app.get("/ping")
    async def _ping():
        return {"pong": True}

    app.add_middleware(
        RateLimiter,
        default_limit=default_limit,
        window_seconds=window_seconds,
        route_overrides=route_overrides or {},
    )
    return app


def _make_input_validator_app() -> FastAPI:
    app = FastAPI()

    @app.get("/items")
    async def _items():
        return {"items": []}

    @app.post("/items")
    async def _create_item(request: Request):
        body = await request.json()
        return JSONResponse(body, status_code=201)

    app.add_middleware(InputValidator)
    return app


def _make_security_headers_app() -> FastAPI:
    app = FastAPI()

    @app.get("/public")
    async def _public():
        return {"public": True}

    @app.get("/fhir/r4/Patient")
    async def _fhir_patients():
        return {"resourceType": "Bundle"}

    app.add_middleware(SecurityHeaders)
    return app


# ===================================================================
# PHISafeErrorHandler tests
# ===================================================================

_phi_client = TestClient(_make_phi_error_app(), raise_server_exceptions=False)


def test_phi_safe_error_strips_ssn():
    """SSN in exception message must NOT appear in client response."""
    resp = _phi_client.get("/explode-ssn")
    assert resp.status_code == 500
    body = resp.json()
    assert "123-45-6789" not in json.dumps(body)
    assert body["error"] == "Internal server error"


def test_phi_safe_error_strips_mrn():
    """MRN in exception message must NOT appear in client response."""
    resp = _phi_client.get("/explode-mrn")
    assert resp.status_code == 500
    body = resp.json()
    assert "MRN-123456" not in json.dumps(body)


def test_phi_safe_error_strips_email():
    """Email in exception message must NOT appear in client response."""
    resp = _phi_client.get("/explode-email")
    assert resp.status_code == 500
    body = resp.json()
    assert "patient@hospital.com" not in json.dumps(body)


def test_phi_safe_error_strips_phone():
    """Phone number in exception message must NOT appear in client response."""
    resp = _phi_client.get("/explode-phone")
    assert resp.status_code == 500
    body = resp.json()
    assert "(305) 555-1234" not in json.dumps(body)


def test_phi_safe_error_includes_request_id():
    """Error response must contain a request_id for support correlation."""
    resp = _phi_client.get("/explode-ssn")
    body = resp.json()
    assert "request_id" in body
    assert len(body["request_id"]) > 0
    assert body["support"] == "Contact support with this request_id"


def test_phi_safe_error_passes_normal_requests():
    """Normal (non-erroring) requests pass through unchanged."""
    resp = _phi_client.get("/ok")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ===================================================================
# RateLimiter tests
# ===================================================================


def test_rate_limiter_allows_under_limit():
    """Requests under the limit succeed with 200."""
    client = TestClient(_make_rate_limiter_app(default_limit=5))
    for _ in range(5):
        resp = client.get("/ping", headers={"X-Tenant-ID": "tenant-rl-1"})
        assert resp.status_code == 200


def test_rate_limiter_blocks_over_limit():
    """The 6th request on a limit-5 bucket returns 429."""
    client = TestClient(_make_rate_limiter_app(default_limit=5))
    for _ in range(5):
        client.get("/ping", headers={"X-Tenant-ID": "tenant-rl-2"})

    resp = client.get("/ping", headers={"X-Tenant-ID": "tenant-rl-2"})
    assert resp.status_code == 429
    assert "Too many requests" in resp.json()["error"]


def test_rate_limiter_returns_retry_after():
    """429 response must include a Retry-After header."""
    client = TestClient(_make_rate_limiter_app(default_limit=1))
    client.get("/ping", headers={"X-Tenant-ID": "tenant-rl-3"})
    resp = client.get("/ping", headers={"X-Tenant-ID": "tenant-rl-3"})
    assert resp.status_code == 429
    assert "retry-after" in resp.headers
    assert int(resp.headers["retry-after"]) > 0


def test_rate_limiter_per_tenant_isolation():
    """Different tenants have independent rate limits."""
    client = TestClient(_make_rate_limiter_app(default_limit=2))
    # Exhaust tenant-A's limit
    client.get("/ping", headers={"X-Tenant-ID": "tenant-A"})
    client.get("/ping", headers={"X-Tenant-ID": "tenant-A"})
    resp_a = client.get("/ping", headers={"X-Tenant-ID": "tenant-A"})
    assert resp_a.status_code == 429

    # tenant-B should still be allowed
    resp_b = client.get("/ping", headers={"X-Tenant-ID": "tenant-B"})
    assert resp_b.status_code == 200


# ===================================================================
# InputValidator tests
# ===================================================================

_iv_client = TestClient(_make_input_validator_app())


def test_input_validator_rejects_wrong_content_type():
    """POST with text/plain Content-Type returns 415."""
    resp = _iv_client.post(
        "/items",
        content="plain text",
        headers={"Content-Type": "text/plain"},
    )
    assert resp.status_code == 415
    assert "application/json" in resp.json()["error"]


def test_input_validator_rejects_oversized_body():
    """A body with Content-Length > 10 MB returns 413."""
    oversized_length = 10 * 1024 * 1024 + 1
    # Send a small body but declare a huge Content-Length to trigger the guard
    resp = _iv_client.post(
        "/items",
        content=b'{"ok":true}',
        headers={
            "Content-Type": "application/json",
            "Content-Length": str(oversized_length),
        },
    )
    assert resp.status_code == 413
    assert "too large" in resp.json()["error"].lower()


def test_input_validator_adds_request_id():
    """Responses include X-Request-ID even when client omits it."""
    resp = _iv_client.get("/items")
    assert "x-request-id" in resp.headers
    assert len(resp.headers["x-request-id"]) > 0


def test_input_validator_preserves_client_request_id():
    """When client sends X-Request-ID, the same value is echoed back."""
    custom_id = "my-custom-req-id-42"
    resp = _iv_client.get("/items", headers={"X-Request-ID": custom_id})
    assert resp.headers["x-request-id"] == custom_id


def test_sql_injection_blocked():
    """Query strings with SQL injection patterns are rejected."""
    resp = _iv_client.get("/items?name=' OR '1'='1")
    assert resp.status_code == 400
    assert "dangerous" in resp.json()["error"].lower()


def test_sql_injection_union_blocked():
    """UNION SELECT in query string is rejected."""
    resp = _iv_client.get("/items?q=1 UNION SELECT * FROM users")
    assert resp.status_code == 400


# ===================================================================
# SecurityHeaders tests
# ===================================================================

_sh_client = TestClient(_make_security_headers_app())


def test_security_headers_present():
    """All OWASP security headers are present on a normal response."""
    resp = _sh_client.get("/public")
    assert resp.status_code == 200
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["x-xss-protection"] == "1; mode=block"
    assert "max-age=31536000" in resp.headers["strict-transport-security"]
    assert resp.headers["content-security-policy"] == "default-src 'self'"


def test_security_headers_no_cache_phi():
    """PHI endpoints include Cache-Control: no-store."""
    resp = _sh_client.get("/fhir/r4/Patient")
    assert resp.status_code == 200
    assert resp.headers.get("cache-control") == "no-store"


def test_security_headers_no_cache_absent_for_public():
    """Non-PHI endpoints do NOT get Cache-Control: no-store."""
    resp = _sh_client.get("/public")
    assert resp.headers.get("cache-control") != "no-store"
