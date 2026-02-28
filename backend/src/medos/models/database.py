"""Database session management and tenant schema switching."""

import logging
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from medos.config import settings

logger = logging.getLogger(__name__)

# Async engine - configured from settings
engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    echo=settings.app_debug,
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a database session.

    Usage:
        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def set_tenant_schema(session: AsyncSession, schema_name: str) -> None:
    """Set the PostgreSQL search_path to the tenant's schema.

    This enables transparent access to tenant-specific tables
    (fhir_resources, audit_events) while still being able to
    reference shared tables.

    Args:
        session: The active database session.
        schema_name: The tenant's schema name (e.g., "tenant_abc123").

    Raises:
        ValueError: If schema_name contains invalid characters.
    """
    # Validate schema name to prevent SQL injection
    if not schema_name.replace("_", "").replace("-", "").isalnum():
        msg = f"Invalid schema name: {schema_name}"
        raise ValueError(msg)

    logger.info("Setting search_path to schema: %s", schema_name)
    await session.execute(text(f"SET search_path TO {schema_name}, shared, public"))
