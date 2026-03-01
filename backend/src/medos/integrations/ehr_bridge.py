"""EHR Integration Bridge for connecting MedOS to external EHR systems.

Provides a generic FHIR R4 client for reading from external EHRs and a
PatientSyncService for bidirectional sync between external EHR and MedOS.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4


@dataclass
class SyncResult:
    """Result of a patient sync operation."""

    action: str  # "created", "updated", "skipped"
    patient_id: str
    details: str


# Mock FHIR Patient data simulating Epic FHIR R4 responses.
_MOCK_PATIENTS: dict[str, dict] = {
    "epic-patient-001": {
        "resourceType": "Patient",
        "id": "epic-patient-001",
        "meta": {
            "versionId": "3",
            "lastUpdated": "2026-01-15T10:30:00Z",
            "source": "Epic",
        },
        "identifier": [
            {"system": "urn:oid:1.2.840.114350.1.13.861.1.7.5.737384.14", "value": "E1001"},
            {"system": "http://hl7.org/fhir/sid/us-ssn", "value": "123456789"},
        ],
        "name": [{"use": "official", "family": "Rodriguez", "given": ["Carlos", "Miguel"]}],
        "birthDate": "1978-06-22",
        "gender": "male",
        "telecom": [
            {"system": "phone", "value": "305-555-0199", "use": "home"},
            {"system": "email", "value": "carlos.rodriguez@example.com"},
        ],
        "address": [
            {
                "use": "home",
                "line": ["456 Brickell Ave"],
                "city": "Miami",
                "state": "FL",
                "postalCode": "33131",
            }
        ],
    },
    "epic-patient-002": {
        "resourceType": "Patient",
        "id": "epic-patient-002",
        "meta": {
            "versionId": "1",
            "lastUpdated": "2026-02-01T08:00:00Z",
            "source": "Epic",
        },
        "identifier": [
            {"system": "urn:oid:1.2.840.114350.1.13.861.1.7.5.737384.14", "value": "E1002"},
        ],
        "name": [{"use": "official", "family": "Chen", "given": ["Wei"]}],
        "birthDate": "1990-11-03",
        "gender": "female",
        "telecom": [{"system": "phone", "value": "786-555-0147", "use": "mobile"}],
        "address": [
            {
                "use": "home",
                "line": ["789 Ocean Dr"],
                "city": "Miami Beach",
                "state": "FL",
                "postalCode": "33139",
            }
        ],
    },
}


class FHIRClient:
    """Generic FHIR R4 client for reading from external EHR systems.

    In demo mode (base_url contains 'demo' or 'mock'), returns mock data
    simulating Epic FHIR R4 responses.
    """

    def __init__(self, base_url: str, auth_token: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        self._demo_mode = "demo" in base_url.lower() or "mock" in base_url.lower()

    @property
    def is_demo(self) -> bool:
        return self._demo_mode

    def read_patient(self, patient_id: str) -> dict | None:
        """Read a single FHIR Patient resource by ID.

        Args:
            patient_id: The patient resource ID.

        Returns:
            FHIR Patient resource dict, or None if not found.
        """
        if self._demo_mode:
            return _MOCK_PATIENTS.get(patient_id)

        # Production: would make HTTP GET {base_url}/Patient/{patient_id}
        # with Authorization: Bearer {auth_token}
        raise NotImplementedError(
            "Production FHIR client requires HTTP implementation. "
            "Use demo mode for testing."
        )

    def search_patients(
        self,
        family: str | None = None,
        given: str | None = None,
        birthdate: str | None = None,
    ) -> list[dict]:
        """Search for FHIR Patient resources by name or birthdate.

        Args:
            family: Family (last) name to search.
            given: Given (first) name to search.
            birthdate: Date of birth in YYYY-MM-DD format.

        Returns:
            List of matching FHIR Patient resource dicts.
        """
        if self._demo_mode:
            results = list(_MOCK_PATIENTS.values())

            if family:
                family_lower = family.lower()
                results = [
                    p for p in results
                    if any(
                        family_lower in n.get("family", "").lower()
                        for n in p.get("name", [])
                    )
                ]

            if given:
                given_lower = given.lower()
                results = [
                    p for p in results
                    if any(
                        any(given_lower in g.lower() for g in n.get("given", []))
                        for n in p.get("name", [])
                    )
                ]

            if birthdate:
                results = [p for p in results if p.get("birthDate") == birthdate]

            return results

        raise NotImplementedError(
            "Production FHIR client requires HTTP implementation. "
            "Use demo mode for testing."
        )


class PatientSyncService:
    """Bidirectional sync between an external EHR and MedOS.

    Handles field mapping differences and duplicate detection when
    importing patients from external FHIR sources.
    """

    def __init__(self) -> None:
        # In-memory store for demo -- replaced by database in production.
        self._synced_patients: dict[str, dict] = {}
        # Track external IDs to MedOS IDs for dedup.
        self._external_id_map: dict[str, str] = {}

    def sync_patient(self, external_patient: dict, tenant_id: str) -> SyncResult:
        """Sync an external FHIR Patient into MedOS.

        If the patient already exists (matched by external ID), skips.
        Otherwise creates a new MedOS patient record.

        Args:
            external_patient: FHIR Patient resource from external EHR.
            tenant_id: MedOS tenant identifier.

        Returns:
            SyncResult indicating what action was taken.
        """
        external_id = external_patient.get("id", "")

        # Check if already synced
        if external_id in self._external_id_map:
            existing_id = self._external_id_map[external_id]
            return SyncResult(
                action="skipped",
                patient_id=existing_id,
                details=f"Patient already synced from external ID {external_id}",
            )

        # Map external patient to MedOS format
        medos_patient = self._map_to_medos(external_patient, tenant_id)
        medos_id = medos_patient["id"]

        # Store
        self._synced_patients[medos_id] = medos_patient
        self._external_id_map[external_id] = medos_id

        return SyncResult(
            action="created",
            patient_id=medos_id,
            details=f"Created from external EHR patient {external_id}",
        )

    def get_synced_patient(self, patient_id: str) -> dict | None:
        """Retrieve a synced patient by MedOS ID."""
        return self._synced_patients.get(patient_id)

    @staticmethod
    def _map_to_medos(external: dict, tenant_id: str) -> dict:
        """Map an external FHIR Patient to MedOS internal format.

        Preserves FHIR structure but adds MedOS tenant tagging and
        generates a new MedOS resource ID.
        """
        medos_id = str(uuid4())
        now = datetime.now(UTC).isoformat()

        patient = {
            "resourceType": "Patient",
            "id": medos_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": now,
                "tag": [
                    {"system": "http://medos.health/tenant", "code": tenant_id},
                    {"system": "http://medos.health/source", "code": "ehr-sync"},
                ],
            },
        }

        # Copy standard FHIR fields
        for field_name in ("name", "birthDate", "gender", "telecom", "address"):
            if field_name in external:
                patient[field_name] = external[field_name]

        # Carry over identifiers and add external reference
        identifiers = list(external.get("identifier", []))
        external_id = external.get("id", "")
        source = external.get("meta", {}).get("source", "external")
        if external_id:
            identifiers.append(
                {
                    "system": f"http://medos.health/external/{source.lower()}",
                    "value": external_id,
                }
            )
        patient["identifier"] = identifiers

        return patient
