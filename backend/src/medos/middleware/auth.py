"""JWT authentication and tenant isolation dependencies.

This module provides FastAPI dependencies for:
  - JWT validation (RS256 via JWKS in production, HS256 in dev)
  - User context extraction from token claims
  - Role-based access control
  - Tenant-scoped database sessions (schema-per-tenant)

Usage in route handlers::

    @router.get("/patients")
    async def list_patients(
        user: UserContext = Depends(get_current_user),
        db: AsyncSession = Depends(get_tenant_db),
    ):
        ...

    @router.delete("/patients/{id}")
    async def delete_patient(
        id: str,
        _auth: None = Depends(require_roles("admin", "physician")),
        db: AsyncSession = Depends(get_tenant_db),
    ):
        ...
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from medos.config import settings
from medos.models.database import get_db, set_tenant_schema
from medos.schemas.auth import UserContext

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEV_JWT_SECRET = "medos-dev-secret-do-not-use-in-production"  # noqa: S105
DEV_JWT_ALGORITHM = "HS256"
PROD_JWT_ALGORITHM = "RS256"

# HTTPBearer extracts the token from the Authorization header automatically.
oauth2_scheme = HTTPBearer(auto_error=True)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _is_dev_mode() -> bool:
    """Return True when running in local-dev mode with debug enabled."""
    return settings.app_env == "development" and settings.app_debug


def _fhir_operation_outcome(
    status_code: int,
    severity: str,
    code: str,
    diagnostics: str,
) -> HTTPException:
    """Build a FHIR-compliant OperationOutcome error response.

    See https://hl7.org/fhir/R4/operationoutcome.html
    """
    return HTTPException(
        status_code=status_code,
        detail={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": severity,
                    "code": code,
                    "diagnostics": diagnostics,
                }
            ],
        },
    )


def _decode_token_dev(token: str) -> dict[str, Any]:
    """Decode an HS256 token for local development."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            DEV_JWT_SECRET,
            algorithms=[DEV_JWT_ALGORITHM],
            audience=settings.auth_audience,
        )
    except JWTError as exc:
        logger.warning("Dev token decode failed: %s", type(exc).__name__)
        raise _fhir_operation_outcome(
            status_code=status.HTTP_401_UNAUTHORIZED,
            severity="error",
            code="login",
            diagnostics="Invalid or expired token",
        ) from exc
    return payload


def _decode_token_prod(token: str) -> dict[str, Any]:
    """Decode an RS256 token verified against the JWKS endpoint.

    In production the JWKS keys are fetched once and cached by python-jose.
    """
    if not settings.jwks_url:
        raise _fhir_operation_outcome(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            severity="fatal",
            code="exception",
            diagnostics="Auth JWKS URL not configured",
        )

    try:
        import httpx

        jwks_response = httpx.get(settings.jwks_url, timeout=5)
        jwks_response.raise_for_status()
        jwks_data = jwks_response.json()

        # Extract the unverified header to find the correct key.
        unverified_header = jwt.get_unverified_header(token)
        rsa_key: dict[str, Any] = {}
        for key in jwks_data.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            raise _fhir_operation_outcome(
                status_code=status.HTTP_401_UNAUTHORIZED,
                severity="error",
                code="login",
                diagnostics="Unable to find matching signing key",
            )

        payload: dict[str, Any] = jwt.decode(
            token,
            rsa_key,
            algorithms=[PROD_JWT_ALGORITHM],
            audience=settings.auth_audience,
            issuer=f"https://{settings.auth_domain}/",
        )
    except HTTPException:
        raise
    except JWTError as exc:
        logger.warning("Prod token decode failed: %s", type(exc).__name__)
        raise _fhir_operation_outcome(
            status_code=status.HTTP_401_UNAUTHORIZED,
            severity="error",
            code="login",
            diagnostics="Invalid or expired token",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during token validation")
        raise _fhir_operation_outcome(
            status_code=status.HTTP_401_UNAUTHORIZED,
            severity="error",
            code="login",
            diagnostics="Token validation failed",
        ) from exc
    return payload


def _extract_user_context(payload: dict[str, Any]) -> UserContext:
    """Map JWT claims to a UserContext, regardless of provider format."""
    # Standard claim: "sub" for user id
    user_id = payload.get("sub", "")

    # MedOS custom claims (namespaced to avoid collisions)
    tenant_id = payload.get("https://medos.health/tenant_id") or payload.get("tenant_id", "")
    email = payload.get("https://medos.health/email") or payload.get("email", "")
    roles = payload.get("https://medos.health/roles") or payload.get("roles", [])
    scopes_raw = payload.get("scope", "")
    scopes = scopes_raw.split() if isinstance(scopes_raw, str) else list(scopes_raw)

    if not user_id or not tenant_id:
        raise _fhir_operation_outcome(
            status_code=status.HTTP_401_UNAUTHORIZED,
            severity="error",
            code="login",
            diagnostics="Token missing required claims (sub, tenant_id)",
        )

    return UserContext(
        user_id=user_id,
        tenant_id=tenant_id,
        email=email,
        roles=roles if isinstance(roles, list) else [roles],
        scopes=scopes,
    )


# ---------------------------------------------------------------------------
# Public FastAPI dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),  # noqa: B008
) -> UserContext:
    """Validate the JWT and return the authenticated user context.

    Raises:
        HTTPException 401: If the token is missing, invalid, or expired.
    """
    token = credentials.credentials

    payload = _decode_token_dev(token) if _is_dev_mode() else _decode_token_prod(token)

    user = _extract_user_context(payload)
    logger.info("Authenticated user_id=%s for tenant=%s", user.user_id, user.tenant_id)
    return user


def require_roles(*roles: str):
    """Factory that returns a dependency checking the user has *all* given roles.

    Usage::

        @router.delete("/resource/{id}")
        async def delete(
            _auth: None = Depends(require_roles("admin")),
        ):
            ...

    Raises:
        HTTPException 403: If the user lacks any of the required roles.
    """

    async def _role_checker(
        user: UserContext = Depends(get_current_user),  # noqa: B008
    ) -> None:
        missing = set(roles) - set(user.roles)
        if missing:
            logger.warning(
                "Access denied for user_id=%s -- missing roles: %s",
                user.user_id,
                ", ".join(sorted(missing)),
            )
            raise _fhir_operation_outcome(
                status_code=status.HTTP_403_FORBIDDEN,
                severity="error",
                code="forbidden",
                diagnostics=f"Missing required roles: {', '.join(sorted(missing))}",
            )

    return _role_checker


async def get_tenant_db(
    user: UserContext = Depends(get_current_user),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> AsyncSession:
    """Provide a database session scoped to the caller's tenant.

    Steps:
        1. Derive the schema name from the tenant_id.
        2. ``SET search_path`` so all queries target the tenant schema.
        3. Set an application-level variable for Row Level Security policies.
        4. Return the session for use by the route handler.
    """
    schema_name = f"tenant_{user.tenant_id}"
    await set_tenant_schema(db, schema_name)

    # Set session variable for RLS policies to reference via current_setting()
    await db.execute(
        text("SET app.current_tenant_id = :tid"),
        {"tid": user.tenant_id},
    )

    return db


# ---------------------------------------------------------------------------
# Dev-only token helpers
# ---------------------------------------------------------------------------


def create_dev_token(
    user_id: str = "dev-user-001",
    tenant_id: str = "dev-tenant-001",
    email: str = "dev@medos.local",
    roles: list[str] | None = None,
    scopes: list[str] | None = None,
    expires_minutes: int = 60,
) -> str:
    """Generate an HS256 JWT for local development and testing.

    This MUST NOT be available in production.
    """
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "email": email,
        "roles": roles or ["admin"],
        "scope": " ".join(scopes or []),
        "aud": settings.auth_audience,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, DEV_JWT_SECRET, algorithm=DEV_JWT_ALGORITHM)
