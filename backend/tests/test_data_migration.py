"""Tests for data migration tools and EHR integration bridge."""

import tempfile
from pathlib import Path

from medos.integrations.ehr_bridge import FHIRClient, PatientSyncService
from medos.tools.data_migration import CSVPatientImporter, HL7v2ADTParser

VALID_CSV = """\
first_name,last_name,dob,ssn,gender,address,city,state,zip,phone,email,insurance_id,payer_name
Maria,Garcia,1985-03-15,123-45-6789,F,100 Main St,Miami,FL,33101,305-555-0100,maria@example.com,INS-001,Aetna
Carlos,Rodriguez,1978-06-22,987-65-4321,M,456 Brickell Ave,Miami,FL,33131,305-555-0199,carlos@example.com,INS-002,BlueCross
Wei,Chen,1990-11-03,,F,789 Ocean Dr,Miami Beach,FL,33139,786-555-0147,wei@example.com,INS-003,UnitedHealth
"""

TENANT_ID = "tenant-test-001"


# -- CSVPatientImporter tests --


def test_csv_import_valid_rows():
    """All 3 valid rows should be imported successfully."""
    importer = CSVPatientImporter()
    result = importer.import_from_string(VALID_CSV, TENANT_ID)
    assert result.imported_count == 3
    assert result.error_count == 0
    assert result.duplicate_count == 0
    assert len(result.imported_patients) == 3
    # Verify FHIR structure
    patient = result.imported_patients[0]
    assert patient["resourceType"] == "Patient"
    assert patient["name"][0]["family"] == "Garcia"
    assert patient["birthDate"] == "1985-03-15"
    assert patient["gender"] == "female"


def test_csv_import_duplicate_detection():
    """Second import of same data should detect duplicates by name+dob."""
    importer = CSVPatientImporter()
    # First import
    result1 = importer.import_from_string(VALID_CSV, TENANT_ID)
    assert result1.imported_count == 3

    # Second import -- all should be duplicates
    result2 = importer.import_from_string(VALID_CSV, TENANT_ID)
    assert result2.imported_count == 0
    assert result2.duplicate_count == 3


def test_csv_import_duplicate_detection_by_ssn():
    """Detect duplicate by SSN even if name differs slightly."""
    csv_data = """\
first_name,last_name,dob,ssn,gender
Maria,Garcia,1985-03-15,123-45-6789,F
Maria,Garcia-Lopez,1985-03-16,123-45-6789,F
"""
    importer = CSVPatientImporter()
    result = importer.import_from_string(csv_data, TENANT_ID)
    assert result.imported_count == 1
    assert result.duplicate_count == 1


def test_csv_import_dry_run_no_side_effects():
    """Dry run should count but not produce imported_patients."""
    importer = CSVPatientImporter()
    result = importer.import_from_string(VALID_CSV, TENANT_ID, dry_run=True)
    assert result.imported_count == 3
    assert len(result.imported_patients) == 0


def test_csv_import_invalid_rows_reported():
    """Invalid date format should be reported as error."""
    csv_data = """\
first_name,last_name,dob,gender
John,Doe,not-a-date,M
"""
    importer = CSVPatientImporter()
    result = importer.import_from_string(csv_data, TENANT_ID)
    assert result.error_count == 1
    assert result.imported_count == 0
    assert "Invalid date format" in result.errors[0]["error"]


def test_csv_import_missing_required_fields():
    """Missing last_name should be reported as error."""
    csv_data = """\
first_name,last_name,dob,gender
Jane,,1990-01-01,F
"""
    importer = CSVPatientImporter()
    result = importer.import_from_string(csv_data, TENANT_ID)
    assert result.error_count == 1
    assert result.imported_count == 0
    assert any("last_name" in str(e["error"]) for e in result.errors)


def test_csv_import_from_file():
    """Import from an actual file on disk."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="") as f:
        f.write(VALID_CSV)
        tmp_path = f.name

    try:
        importer = CSVPatientImporter()
        result = importer.batch_import(tmp_path, TENANT_ID)
        assert result.imported_count == 3
        assert result.error_count == 0
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def test_import_result_counts_correct():
    """Verify counts add up: imported + duplicate + error + needs_review = total rows."""
    csv_data = """\
first_name,last_name,dob,ssn,gender
Maria,Garcia,1985-03-15,123-45-6789,F
Maria,Garcia,1985-03-15,123-45-6789,F
John,Doe,bad-date,,M
Jane,,1990-01-01,,F
Bob,Smith,1980-05-20,INVALID-SSN,M
"""
    importer = CSVPatientImporter()
    result = importer.import_from_string(csv_data, TENANT_ID)
    total_processed = (
        result.imported_count
        + result.duplicate_count
        + result.error_count
        + result.needs_review_count
    )
    assert total_processed == 5


# -- HL7v2ADTParser tests --


def test_hl7v2_pid_parsing():
    """Parse a PID segment into patient demographics."""
    pid = "PID|1||MRN-5001^^^MedOS||Rodriguez^Carlos||19780622|M|||456 Brickell Ave^^Miami^FL^33131"
    result = HL7v2ADTParser.parse_pid_segment(pid)
    assert result["mrn"] == "MRN-5001"
    assert result["last_name"] == "Rodriguez"
    assert result["first_name"] == "Carlos"
    assert result["dob"] == "1978-06-22"
    assert result["gender"] == "male"
    assert result["address"]["city"] == "Miami"
    assert result["address"]["state"] == "FL"


def test_hl7v2_adt_message_parsing():
    """Parse a full ADT^A01 message with MSH and PID segments."""
    message = (
        "MSH|^~\\&|MedOS|Hospital|EHR|System|20260228||ADT^A01|MSG001|P|2.5\n"
        "EVN|A01|20260228\n"
        "PID|1||MRN-7001^^^MedOS||Chen^Wei||19901103|F|||789 Ocean Dr^^Miami Beach^FL^33139\n"
        "PV1|1|I|ICU^101^A"
    )
    result = HL7v2ADTParser.parse_adt_message(message)
    assert result["message_type"] == "ADT^A01"
    assert result["patient"]["mrn"] == "MRN-7001"
    assert result["patient"]["first_name"] == "Wei"
    assert result["patient"]["gender"] == "female"


# -- FHIRClient tests --


def test_fhir_client_read_patient_demo():
    """Read a patient from demo FHIR client."""
    client = FHIRClient("https://demo.epic.com/fhir/r4")
    assert client.is_demo
    patient = client.read_patient("epic-patient-001")
    assert patient is not None
    assert patient["resourceType"] == "Patient"
    assert patient["name"][0]["family"] == "Rodriguez"

    # Non-existent patient
    assert client.read_patient("nonexistent") is None


def test_fhir_client_search_patients_demo():
    """Search patients by family name in demo mode."""
    client = FHIRClient("https://mock.ehr.example/fhir/r4")
    results = client.search_patients(family="Rodriguez")
    assert len(results) == 1
    assert results[0]["name"][0]["family"] == "Rodriguez"

    # Search by birthdate
    results = client.search_patients(birthdate="1990-11-03")
    assert len(results) == 1
    assert results[0]["name"][0]["family"] == "Chen"

    # Search all
    results = client.search_patients()
    assert len(results) == 2


# -- PatientSyncService tests --


def test_sync_patient_creates_new():
    """Syncing a new external patient should create a MedOS patient."""
    client = FHIRClient("https://demo.epic.com/fhir/r4")
    external = client.read_patient("epic-patient-001")
    assert external is not None

    sync = PatientSyncService()
    result = sync.sync_patient(external, TENANT_ID)
    assert result.action == "created"
    assert result.patient_id  # non-empty

    # Verify synced patient has MedOS structure
    synced = sync.get_synced_patient(result.patient_id)
    assert synced is not None
    assert synced["resourceType"] == "Patient"
    assert any(
        t["system"] == "http://medos.health/tenant" and t["code"] == TENANT_ID
        for t in synced["meta"]["tag"]
    )


def test_sync_patient_skips_duplicate():
    """Syncing the same external patient twice should skip on second attempt."""
    client = FHIRClient("https://demo.epic.com/fhir/r4")
    external = client.read_patient("epic-patient-002")
    assert external is not None

    sync = PatientSyncService()
    result1 = sync.sync_patient(external, TENANT_ID)
    assert result1.action == "created"

    result2 = sync.sync_patient(external, TENANT_ID)
    assert result2.action == "skipped"
    assert result2.patient_id == result1.patient_id
