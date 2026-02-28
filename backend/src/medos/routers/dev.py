"""Development-only endpoints -- NEVER exposed in production.

Provides a /dev/token endpoint for generating HS256 test JWTs
so developers can exercise authenticated routes locally without
an external identity provider.
"""

import logging

from fastapi import APIRouter

from medos.middleware.auth import create_dev_token
from medos.schemas.auth import DevTokenRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dev", tags=["Dev"])


@router.post("/token")
async def generate_dev_token(body: DevTokenRequest | None = None) -> dict[str, str]:
    """Generate a development JWT for local testing.

    Accepts optional fields to customise the token claims.
    Defaults produce an admin token for ``dev-tenant-001``.
    """
    if body is None:
        body = DevTokenRequest()

    token = create_dev_token(
        user_id=body.user_id,
        tenant_id=body.tenant_id,
        email=body.email,
        roles=body.roles,
        scopes=body.scopes,
    )
    logger.info("Dev token issued for user_id=%s tenant_id=%s", body.user_id, body.tenant_id)
    return {"access_token": token, "token_type": "bearer"}
