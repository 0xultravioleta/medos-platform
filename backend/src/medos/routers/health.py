"""Health check endpoint."""

from datetime import UTC, datetime

from fastapi import APIRouter

from medos.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check -- returns service status and version."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "timestamp": datetime.now(UTC).isoformat(),
    }
