"""Authentication and authorization schemas."""

from pydantic import BaseModel


class UserContext(BaseModel):
    """Represents the authenticated user extracted from a JWT.

    Carried through the request lifecycle so route handlers
    know *who* is calling and *what* they are allowed to do.
    """

    user_id: str
    tenant_id: str
    email: str
    roles: list[str] = []
    scopes: list[str] = []


class DevTokenRequest(BaseModel):
    """Request body for the /dev/token endpoint (local development only)."""

    user_id: str = "dev-user-001"
    tenant_id: str = "dev-tenant-001"
    email: str = "dev@medos.local"
    roles: list[str] = ["admin"]
    scopes: list[str] = []
