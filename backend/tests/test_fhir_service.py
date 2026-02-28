"""Unit tests for the FHIR service layer.

The repository is fully mocked so these tests exercise only business logic
(validation, meta stamping, Bundle formatting, error mapping).
"""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from medos.services.fhir_service import (
    FHIRResourceNotFoundError,
    FHIRService,
    FHIRValidationError,
)

# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

TENANT_ID = "00000000-0000-0000-0000-000000000001"

SAMPLE_PATIENT_INPUT = {
    "resourceType": "Patient",
    "name": [{"family": "Garcia", "given": ["Maria"]}],
    "birthDate": "1985-03-15",
}


def _make_repo_mock() -> AsyncMock:
    """Return an AsyncMock that mimics FHIRRepository."""
    repo = AsyncMock()
    # By default, create() returns whatever resource it receives.
    repo.create = AsyncMock(side_effect=lambda rt, res, tid: dict(res))
    return repo


def _make_service(repo: AsyncMock | None = None) -> FHIRService:
    if repo is None:
        repo = _make_repo_mock()
    return FHIRService(repository=repo)


# ------------------------------------------------------------------
# Create
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_resource_adds_meta():
    """meta.versionId and meta.lastUpdated must be set on create."""
    repo = _make_repo_mock()
    svc = _make_service(repo)

    result = await svc.create_resource("Patient", dict(SAMPLE_PATIENT_INPUT), TENANT_ID)

    assert result["meta"]["versionId"] == "1"
    # lastUpdated must be a valid ISO timestamp
    parsed = datetime.fromisoformat(result["meta"]["lastUpdated"])
    assert parsed.tzinfo is not None  # timezone-aware


@pytest.mark.asyncio
async def test_create_resource_generates_id():
    """A UUID id must be generated when creating a resource."""
    repo = _make_repo_mock()
    svc = _make_service(repo)

    result = await svc.create_resource("Patient", dict(SAMPLE_PATIENT_INPUT), TENANT_ID)

    assert "id" in result
    assert len(result["id"]) == 36  # UUID format: 8-4-4-4-12


@pytest.mark.asyncio
async def test_create_resource_validates_type():
    """Mismatched resourceType in body vs endpoint must raise FHIRValidationError."""
    svc = _make_service()

    bad_input = dict(SAMPLE_PATIENT_INPUT)
    bad_input["resourceType"] = "Observation"

    with pytest.raises(FHIRValidationError) as exc_info:
        await svc.create_resource("Patient", bad_input, TENANT_ID)

    outcome = exc_info.value.operation_outcome
    assert outcome["resourceType"] == "OperationOutcome"
    assert outcome["issue"][0]["code"] == "invalid"


@pytest.mark.asyncio
async def test_create_resource_calls_repository():
    """The service must delegate persistence to the repository."""
    repo = _make_repo_mock()
    svc = _make_service(repo)

    await svc.create_resource("Patient", dict(SAMPLE_PATIENT_INPUT), TENANT_ID)

    repo.create.assert_awaited_once()
    call_args = repo.create.call_args
    assert call_args[0][0] == "Patient"  # resource_type
    assert call_args[0][2] == TENANT_ID  # tenant_id


# ------------------------------------------------------------------
# Read
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_read_resource_not_found():
    """Reading a non-existent resource must raise FHIRResourceNotFoundError."""
    repo = _make_repo_mock()
    repo.read = AsyncMock(return_value=None)
    svc = _make_service(repo)

    with pytest.raises(FHIRResourceNotFoundError) as exc_info:
        await svc.read_resource("Patient", "nonexistent-id")

    outcome = exc_info.value.operation_outcome
    assert outcome["resourceType"] == "OperationOutcome"
    assert outcome["issue"][0]["code"] == "not-found"
    assert "Patient/nonexistent-id" in outcome["issue"][0]["diagnostics"]


@pytest.mark.asyncio
async def test_read_resource_returns_data():
    """Reading an existing resource must return the stored dict."""
    stored = {"resourceType": "Patient", "id": "abc-123", "meta": {"versionId": "1"}}
    repo = _make_repo_mock()
    repo.read = AsyncMock(return_value=stored)
    svc = _make_service(repo)

    result = await svc.read_resource("Patient", "abc-123")

    assert result == stored


# ------------------------------------------------------------------
# Search
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_returns_bundle():
    """Search must return a FHIR Bundle with type searchset."""
    patients = [
        {"resourceType": "Patient", "id": "p1", "name": [{"family": "Garcia"}]},
        {"resourceType": "Patient", "id": "p2", "name": [{"family": "Lopez"}]},
    ]
    repo = _make_repo_mock()
    repo.search = AsyncMock(return_value=(patients, 2))
    svc = _make_service(repo)

    bundle = await svc.search_resources("Patient", {"name": "garcia"})

    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "searchset"
    assert bundle["total"] == 2
    assert len(bundle["entry"]) == 2
    assert bundle["entry"][0]["resource"]["id"] == "p1"
    assert bundle["entry"][0]["fullUrl"] == "Patient/p1"


@pytest.mark.asyncio
async def test_search_empty_returns_empty_bundle():
    """Search with no matches must return a Bundle with total=0."""
    repo = _make_repo_mock()
    repo.search = AsyncMock(return_value=([], 0))
    svc = _make_service(repo)

    bundle = await svc.search_resources("Patient", {"name": "NoSuchName"})

    assert bundle["total"] == 0
    assert bundle["entry"] == []


# ------------------------------------------------------------------
# Update
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_increments_version():
    """Updating a resource must increment versionId from 1 to 2."""
    existing = {
        "resourceType": "Patient",
        "id": "abc-123",
        "meta": {"versionId": "1", "lastUpdated": "2026-01-01T00:00:00+00:00"},
        "name": [{"family": "Garcia"}],
    }
    repo = _make_repo_mock()
    repo.read = AsyncMock(return_value=existing)
    repo.update = AsyncMock(side_effect=lambda rt, rid, res: dict(res))
    svc = _make_service(repo)

    updated_input = {
        "resourceType": "Patient",
        "name": [{"family": "Garcia-Lopez"}],
    }
    result = await svc.update_resource("Patient", "abc-123", updated_input)

    assert result["meta"]["versionId"] == "2"
    parsed = datetime.fromisoformat(result["meta"]["lastUpdated"])
    assert parsed.tzinfo is not None


@pytest.mark.asyncio
async def test_update_nonexistent_raises():
    """Updating a non-existent resource must raise FHIRResourceNotFoundError."""
    repo = _make_repo_mock()
    repo.read = AsyncMock(return_value=None)
    svc = _make_service(repo)

    with pytest.raises(FHIRResourceNotFoundError):
        await svc.update_resource("Patient", "no-such-id", {"resourceType": "Patient"})


@pytest.mark.asyncio
async def test_update_validates_type():
    """Mismatched resourceType on update must raise FHIRValidationError."""
    existing = {
        "resourceType": "Patient",
        "id": "abc-123",
        "meta": {"versionId": "1"},
    }
    repo = _make_repo_mock()
    repo.read = AsyncMock(return_value=existing)
    svc = _make_service(repo)

    with pytest.raises(FHIRValidationError):
        await svc.update_resource("Patient", "abc-123", {"resourceType": "Observation"})


# ------------------------------------------------------------------
# Delete
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_nonexistent_raises():
    """Deleting a non-existent resource must raise FHIRResourceNotFoundError."""
    repo = _make_repo_mock()
    repo.delete = AsyncMock(return_value=False)
    svc = _make_service(repo)

    with pytest.raises(FHIRResourceNotFoundError):
        await svc.delete_resource("Patient", "no-such-id")


@pytest.mark.asyncio
async def test_delete_existing_returns_true():
    """Deleting an existing resource must return True."""
    repo = _make_repo_mock()
    repo.delete = AsyncMock(return_value=True)
    svc = _make_service(repo)

    result = await svc.delete_resource("Patient", "abc-123")
    assert result is True
