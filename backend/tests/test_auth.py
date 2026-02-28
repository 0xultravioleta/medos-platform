"""Tests for JWT auth middleware and tenant isolation dependencies."""

from datetime import UTC, datetime, timedelta

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt

from medos.middleware.auth import (
    DEV_JWT_ALGORITHM,
    DEV_JWT_SECRET,
    create_dev_token,
    get_current_user,
    require_roles,
)
from medos.schemas.auth import UserContext

# ---------------------------------------------------------------------------
# Helpers -- lightweight FastAPI app with auth-protected routes for testing
# ---------------------------------------------------------------------------

_test_app = FastAPI()


@_test_app.get("/protected")
async def _protected_route(user: UserContext = Depends(get_current_user)):  # noqa: B008
    return {"user_id": user.user_id, "tenant_id": user.tenant_id, "roles": user.roles}


@_test_app.get("/admin-only")
async def _admin_route(
    _auth: None = Depends(require_roles("admin")),  # noqa: B008
    user: UserContext = Depends(get_current_user),  # noqa: B008
):
    return {"user_id": user.user_id, "roles": user.roles}


client = TestClient(_test_app)

# ---------------------------------------------------------------------------
# /dev/token endpoint tests (via the main app)
# ---------------------------------------------------------------------------


def test_dev_token_generation():
    """POST /dev/token returns a valid JWT with expected claims."""
    from medos.main import app

    dev_client = TestClient(app)
    response = dev_client.post("/dev/token", json={"user_id": "u1", "tenant_id": "t1", "email": "u1@test.local"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"  # noqa: S105

    # The returned token should be decodable
    payload = jwt.decode(data["access_token"], DEV_JWT_SECRET, algorithms=[DEV_JWT_ALGORITHM], audience="https://api.medos.health")
    assert payload["sub"] == "u1"
    assert payload["tenant_id"] == "t1"


# ---------------------------------------------------------------------------
# Token validation tests
# ---------------------------------------------------------------------------


def test_valid_token_auth():
    """A correctly signed dev JWT with required claims passes authentication."""
    token = create_dev_token(user_id="user-1", tenant_id="tenant-1", email="a@b.com", roles=["viewer"])
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == "user-1"
    assert body["tenant_id"] == "tenant-1"
    assert "viewer" in body["roles"]


def test_expired_token_rejected():
    """An expired JWT returns 401."""
    now = datetime.now(UTC)
    payload = {
        "sub": "user-exp",
        "tenant_id": "t",
        "email": "e@e.com",
        "roles": [],
        "aud": "https://api.medos.health",
        "iat": now - timedelta(hours=2),
        "exp": now - timedelta(hours=1),
    }
    token = jwt.encode(payload, DEV_JWT_SECRET, algorithm=DEV_JWT_ALGORITHM)
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_missing_token_rejected():
    """A request without an Authorization header is rejected."""
    response = client.get("/protected")
    assert response.status_code == 401


def test_invalid_token_rejected():
    """A garbage bearer token returns 401."""
    response = client.get("/protected", headers={"Authorization": "Bearer not.a.real.token"})
    assert response.status_code == 401


def test_missing_claims_rejected():
    """A token without required claims (sub, tenant_id) returns 401."""
    now = datetime.now(UTC)
    payload = {
        "aud": "https://api.medos.health",
        "iat": now,
        "exp": now + timedelta(hours=1),
        # Missing sub and tenant_id
    }
    token = jwt.encode(payload, DEV_JWT_SECRET, algorithm=DEV_JWT_ALGORITHM)
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Role-based access control tests
# ---------------------------------------------------------------------------


def test_role_check_passes():
    """A user with the required role is granted access."""
    token = create_dev_token(user_id="admin-1", tenant_id="t", roles=["admin"])
    response = client.get("/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["user_id"] == "admin-1"


def test_role_check_fails():
    """A user missing the required role receives 403."""
    token = create_dev_token(user_id="viewer-1", tenant_id="t", roles=["viewer"])
    response = client.get("/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    body = response.json()
    # FHIR OperationOutcome structure
    assert body["detail"]["resourceType"] == "OperationOutcome"
    assert body["detail"]["issue"][0]["code"] == "forbidden"
