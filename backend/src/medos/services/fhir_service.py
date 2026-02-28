"""Business logic for FHIR resource operations.

Per ADR-001 / ADR-004 the layering is:

    router  ->  FHIRService  ->  FHIRRepository  ->  PostgreSQL

This service handles:
- Resource validation (resourceType matches endpoint)
- ID and meta generation / version bumping
- FHIR Bundle formatting for search results
- Translating "not found" into FHIR OperationOutcome errors
"""

import logging
from datetime import UTC, datetime
from uuid import uuid4

from medos.repositories.fhir_repository import FHIRRepository

logger = logging.getLogger(__name__)


class FHIRResourceNotFoundError(Exception):
    """Raised when a requested FHIR resource does not exist."""

    def __init__(self, resource_type: str, resource_id: str) -> None:
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.operation_outcome = _operation_outcome(
            severity="error",
            code="not-found",
            diagnostics=f"{resource_type}/{resource_id} not found",
        )
        super().__init__(self.operation_outcome["issue"][0]["diagnostics"])


class FHIRValidationError(Exception):
    """Raised when a FHIR resource fails validation."""

    def __init__(self, diagnostics: str) -> None:
        self.operation_outcome = _operation_outcome(
            severity="error",
            code="invalid",
            diagnostics=diagnostics,
        )
        super().__init__(diagnostics)


# ------------------------------------------------------------------
# Service
# ------------------------------------------------------------------


class FHIRService:
    """Business logic for FHIR resource CRUD and search."""

    def __init__(self, repository: FHIRRepository) -> None:
        self.repo = repository

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    async def create_resource(
        self,
        resource_type: str,
        resource: dict,
        tenant_id: str,
    ) -> dict:
        """Validate, stamp, and persist a new FHIR resource.

        Steps:
            1. Validate that ``resource["resourceType"]`` matches *resource_type*.
            2. Generate a UUID for ``id``.
            3. Add ``meta`` with ``versionId=1`` and ``lastUpdated``.
            4. Delegate to repository for persistence.

        Returns the complete resource dict (with id + meta).

        Raises:
            FHIRValidationError: if ``resourceType`` does not match.
        """
        # 1. Validate resourceType
        incoming_type = resource.get("resourceType")
        if incoming_type and incoming_type != resource_type:
            msg = (
                f"resourceType in body ('{incoming_type}') does not match "
                f"endpoint resource type ('{resource_type}')"
            )
            raise FHIRValidationError(msg)

        # 2. Generate ID
        resource_id = str(uuid4())
        resource["id"] = resource_id
        resource["resourceType"] = resource_type

        # 3. Stamp meta
        resource["meta"] = {
            "versionId": "1",
            "lastUpdated": datetime.now(UTC).isoformat(),
        }

        # 4. Persist
        stored = await self.repo.create(resource_type, resource, tenant_id)
        logger.info("Created %s/%s", resource_type, resource_id)
        return stored

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def read_resource(
        self,
        resource_type: str,
        resource_id: str,
    ) -> dict:
        """Read a single resource.  Raises if not found."""
        result = await self.repo.read(resource_type, resource_id)
        if result is None:
            raise FHIRResourceNotFoundError(resource_type, resource_id)
        return result

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    async def update_resource(
        self,
        resource_type: str,
        resource_id: str,
        resource: dict,
    ) -> dict:
        """Update an existing resource, incrementing its version.

        Steps:
            1. Read current to get existing versionId.
            2. Increment versionId.
            3. Set new lastUpdated.
            4. Persist via repository.

        Raises:
            FHIRResourceNotFoundError: if the resource does not exist.
            FHIRValidationError: if resourceType does not match.
        """
        # Validate resourceType
        incoming_type = resource.get("resourceType")
        if incoming_type and incoming_type != resource_type:
            msg = (
                f"resourceType in body ('{incoming_type}') does not match "
                f"endpoint resource type ('{resource_type}')"
            )
            raise FHIRValidationError(msg)

        # Read existing to obtain current version
        existing = await self.repo.read(resource_type, resource_id)
        if existing is None:
            raise FHIRResourceNotFoundError(resource_type, resource_id)

        current_version = int(existing.get("meta", {}).get("versionId", "1"))
        new_version = current_version + 1

        resource["id"] = resource_id
        resource["resourceType"] = resource_type
        resource["meta"] = {
            "versionId": str(new_version),
            "lastUpdated": datetime.now(UTC).isoformat(),
        }

        updated = await self.repo.update(resource_type, resource_id, resource)
        if updated is None:
            raise FHIRResourceNotFoundError(resource_type, resource_id)  # pragma: no cover
        logger.info("Updated %s/%s to v%s", resource_type, resource_id, new_version)
        return updated

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search_resources(
        self,
        resource_type: str,
        params: dict,
        count: int = 20,
        offset: int = 0,
    ) -> dict:
        """Search resources and return a FHIR Bundle of type ``searchset``.

        The Bundle contains:
            - ``resourceType``: ``"Bundle"``
            - ``type``: ``"searchset"``
            - ``total``: total matching count (before pagination)
            - ``entry``: list of ``{resource, fullUrl}`` dicts
        """
        results, total = await self.repo.search(
            resource_type,
            params,
            count=count,
            offset=offset,
        )
        return {
            "resourceType": "Bundle",
            "type": "searchset",
            "total": total,
            "entry": [
                {
                    "resource": r,
                    "fullUrl": f"{resource_type}/{r['id']}",
                }
                for r in results
            ],
        }

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    async def delete_resource(
        self,
        resource_type: str,
        resource_id: str,
    ) -> bool:
        """Delete a resource.  Raises if not found."""
        deleted = await self.repo.delete(resource_type, resource_id)
        if not deleted:
            raise FHIRResourceNotFoundError(resource_type, resource_id)
        logger.info("Deleted %s/%s", resource_type, resource_id)
        return True


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _operation_outcome(*, severity: str, code: str, diagnostics: str) -> dict:
    """Build a FHIR OperationOutcome dict."""
    return {
        "resourceType": "OperationOutcome",
        "issue": [
            {
                "severity": severity,
                "code": code,
                "diagnostics": diagnostics,
            }
        ],
    }
