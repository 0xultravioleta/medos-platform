"""Data-access layer for FHIR resources stored as PostgreSQL JSONB.

Per ADR-001: FHIR resources live in the ``fhir_resources`` table, one row per
resource version.  This repository wraps all SQL access so the service layer
never touches SQLAlchemy directly.
"""

import logging
import uuid
from collections.abc import Sequence

from sqlalchemy import String as SAString
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from medos.models.fhir_resource import FHIRResource

logger = logging.getLogger(__name__)


class FHIRRepository:
    """Data access for FHIR resources in PostgreSQL JSONB."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def create(
        self,
        resource_type: str,
        resource: dict,
        tenant_id: str,
    ) -> dict:
        """Insert a new FHIR resource row and return the stored resource dict.

        The caller (service layer) is responsible for populating ``resource``
        with ``id``, ``meta.versionId``, ``meta.lastUpdated``, and
        ``resourceType`` before calling this method.
        """
        row = FHIRResource(
            id=uuid.UUID(resource["id"]),
            resource_type=resource_type,
            tenant_id=uuid.UUID(tenant_id),
            version=int(resource["meta"]["versionId"]),
            resource=resource,
        )
        self.db.add(row)
        await self.db.flush()
        logger.info(
            "Created %s/%s v%s for tenant %s",
            resource_type,
            resource["id"],
            resource["meta"]["versionId"],
            tenant_id,
        )
        return dict(row.resource)

    async def read(
        self,
        resource_type: str,
        resource_id: str,
    ) -> dict | None:
        """Read a single FHIR resource by type and logical ID.

        Returns ``None`` when the resource does not exist.
        """
        stmt = select(FHIRResource).where(
            FHIRResource.resource_type == resource_type,
            FHIRResource.id == uuid.UUID(resource_id),
        )
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return dict(row.resource)

    async def update(
        self,
        resource_type: str,
        resource_id: str,
        resource: dict,
    ) -> dict | None:
        """Update an existing FHIR resource.

        The caller must have already incremented ``meta.versionId`` and set
        ``meta.lastUpdated`` in *resource* before calling this method.

        Returns ``None`` if the resource does not exist.
        """
        stmt = select(FHIRResource).where(
            FHIRResource.resource_type == resource_type,
            FHIRResource.id == uuid.UUID(resource_id),
        )
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None

        row.version = int(resource["meta"]["versionId"])
        row.resource = resource
        await self.db.flush()
        logger.info(
            "Updated %s/%s to v%s",
            resource_type,
            resource_id,
            resource["meta"]["versionId"],
        )
        return dict(row.resource)

    async def delete(
        self,
        resource_type: str,
        resource_id: str,
    ) -> bool:
        """Hard-delete a FHIR resource.  Returns ``True`` if a row was removed."""
        stmt = select(FHIRResource).where(
            FHIRResource.resource_type == resource_type,
            FHIRResource.id == uuid.UUID(resource_id),
        )
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return False

        await self.db.delete(row)
        await self.db.flush()
        logger.info("Deleted %s/%s", resource_type, resource_id)
        return True

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(
        self,
        resource_type: str,
        params: dict,
        count: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[dict], int]:
        """Search FHIR resources by type and optional JSONB filters.

        Supported search parameters for Patient:
            - **name**: partial, case-insensitive match against
              ``resource->'name'->*->'family'`` and ``given`` arrays.
            - **birthdate**: exact match on ``resource->>'birthDate'``.
            - **identifier**: partial match on ``resource->'identifier'->*->'value'``.

        Returns ``(results, total_count)`` where *results* is at most *count*
        resource dicts starting from *offset*.
        """
        # Base filter: match resource type
        base = select(FHIRResource).where(
            FHIRResource.resource_type == resource_type,
        )

        # Dynamically add JSONB filters
        base = self._apply_search_filters(base, params)

        # Total count (before pagination)
        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(count_stmt)).scalar_one()

        # Paginated results
        data_stmt = base.order_by(FHIRResource.updated_at.desc()).offset(offset).limit(count)
        rows = (await self.db.execute(data_stmt)).scalars().all()

        return [dict(r.resource) for r in rows], total

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_search_filters(stmt, params: dict):  # noqa: ANN205
        """Append JSONB WHERE clauses for known FHIR search params."""
        if "name" in params and params["name"]:
            name_val = params["name"].lower()
            # Cast the JSONB "name" array to text for a case-insensitive contains search.
            stmt = stmt.where(
                func.lower(cast(FHIRResource.resource["name"], SAString)).contains(name_val)
            )

        if "birthdate" in params and params["birthdate"]:
            stmt = stmt.where(
                FHIRResource.resource["birthDate"].as_string() == params["birthdate"]
            )

        if "identifier" in params and params["identifier"]:
            ident_val = params["identifier"].lower()
            stmt = stmt.where(
                func.lower(cast(FHIRResource.resource["identifier"], SAString)).contains(ident_val)
            )

        return stmt
