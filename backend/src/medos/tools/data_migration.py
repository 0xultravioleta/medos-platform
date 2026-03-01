"""Data migration tools for importing patient data into MedOS.

Supports CSV patient imports with FHIR R4 conversion, duplicate detection,
and basic HL7v2 ADT message parsing.
"""

import csv
import re
from dataclasses import dataclass, field
from datetime import datetime
from io import StringIO
from pathlib import Path
from uuid import uuid4


@dataclass
class ImportResult:
    """Result of a batch patient import operation."""

    imported_count: int = 0
    duplicate_count: int = 0
    error_count: int = 0
    needs_review_count: int = 0
    errors: list[dict] = field(default_factory=list)
    imported_patients: list[dict] = field(default_factory=list)


# Fields that must be present for a valid import row.
REQUIRED_CSV_FIELDS = {"first_name", "last_name", "dob"}

# Date formats accepted for DOB column.
_DATE_FORMATS = ["%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y"]

# SSN pattern: 3-2-4 digits with optional dashes.
_SSN_PATTERN = re.compile(r"^\d{3}-?\d{2}-?\d{4}$")


def _parse_date(value: str) -> str | None:
    """Try to parse a date string into YYYY-MM-DD format."""
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _validate_ssn(value: str) -> bool:
    """Return True if value looks like a valid SSN."""
    return bool(_SSN_PATTERN.match(value.strip()))


def _row_to_fhir_patient(row: dict, tenant_id: str) -> dict:
    """Convert a validated CSV row to a FHIR R4 Patient resource dict."""
    resource_id = str(uuid4())
    dob = _parse_date(row["dob"])

    patient: dict = {
        "resourceType": "Patient",
        "id": resource_id,
        "meta": {
            "versionId": "1",
            "lastUpdated": datetime.utcnow().isoformat() + "Z",
            "tag": [{"system": "http://medos.health/tenant", "code": tenant_id}],
        },
        "name": [
            {
                "family": row["last_name"].strip(),
                "given": [row["first_name"].strip()],
            }
        ],
        "birthDate": dob,
        "identifier": [],
    }

    # Gender mapping
    gender_raw = row.get("gender", "").strip().lower()
    gender_map = {"m": "male", "f": "female", "male": "male", "female": "female", "o": "other", "other": "other"}
    patient["gender"] = gender_map.get(gender_raw, "unknown")

    # SSN as identifier (if present and valid)
    ssn = row.get("ssn", "").strip()
    if ssn and _validate_ssn(ssn):
        normalized = ssn.replace("-", "")
        patient["identifier"].append(
            {"system": "http://hl7.org/fhir/sid/us-ssn", "value": normalized}
        )

    # Insurance ID as identifier
    insurance_id = row.get("insurance_id", "").strip()
    if insurance_id:
        patient["identifier"].append(
            {
                "system": "http://medos.health/insurance-id",
                "value": insurance_id,
            }
        )

    # Telecom
    telecom = []
    phone = row.get("phone", "").strip()
    if phone:
        telecom.append({"system": "phone", "value": phone, "use": "home"})
    email = row.get("email", "").strip()
    if email:
        telecom.append({"system": "email", "value": email})
    if telecom:
        patient["telecom"] = telecom

    # Address
    address_parts: dict = {}
    for fhir_key, csv_key in [
        ("line", "address"),
        ("city", "city"),
        ("state", "state"),
        ("postalCode", "zip"),
    ]:
        val = row.get(csv_key, "").strip()
        if val:
            address_parts[fhir_key] = [val] if fhir_key == "line" else val
    if address_parts:
        patient["address"] = [address_parts]

    # Payer as contained Organization reference
    payer_name = row.get("payer_name", "").strip()
    if payer_name:
        patient["contained"] = [
            {
                "resourceType": "Organization",
                "id": "payer",
                "name": payer_name,
            }
        ]

    return patient


def _make_dedup_key(row: dict) -> str:
    """Create a deduplication key from last_name + first_name + dob."""
    last = row.get("last_name", "").strip().lower()
    first = row.get("first_name", "").strip().lower()
    dob = _parse_date(row.get("dob", "")) or ""
    return f"{last}|{first}|{dob}"


class CSVPatientImporter:
    """Import patients from CSV files into FHIR Patient resources.

    Supports duplicate detection by (last_name + first_name + dob) or SSN,
    validation of required fields and formats, and dry-run mode.
    """

    def __init__(self) -> None:
        # Tracks seen dedup keys and SSNs across imports within this importer instance.
        self._seen_keys: set[str] = set()
        self._seen_ssns: set[str] = set()

    def batch_import(
        self,
        csv_path: str | Path,
        tenant_id: str,
        dry_run: bool = False,
    ) -> ImportResult:
        """Import patients from a CSV file.

        Args:
            csv_path: Path to the CSV file.
            tenant_id: Tenant identifier for multi-tenancy tagging.
            dry_run: If True, validate and report without persisting.

        Returns:
            ImportResult with counts and any errors.
        """
        result = ImportResult()
        csv_path = Path(csv_path)

        if not csv_path.exists():
            result.error_count = 1
            result.errors.append({"row": 0, "error": f"File not found: {csv_path}"})
            return result

        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=1):
                self._process_row(row, row_num, tenant_id, dry_run, result)

        return result

    def import_from_string(
        self,
        csv_content: str,
        tenant_id: str,
        dry_run: bool = False,
    ) -> ImportResult:
        """Import patients from a CSV string (useful for testing).

        Args:
            csv_content: CSV data as a string (with header row).
            tenant_id: Tenant identifier.
            dry_run: If True, validate only.

        Returns:
            ImportResult with counts and any errors.
        """
        result = ImportResult()
        reader = csv.DictReader(StringIO(csv_content))
        for row_num, row in enumerate(reader, start=1):
            self._process_row(row, row_num, tenant_id, dry_run, result)
        return result

    def _process_row(
        self,
        row: dict,
        row_num: int,
        tenant_id: str,
        dry_run: bool,
        result: ImportResult,
    ) -> None:
        """Validate and process a single CSV row."""
        # Check required fields
        missing = REQUIRED_CSV_FIELDS - {k for k, v in row.items() if v and v.strip()}
        if missing:
            result.error_count += 1
            result.errors.append(
                {"row": row_num, "error": f"Missing required fields: {sorted(missing)}"}
            )
            return

        # Validate date format
        dob_parsed = _parse_date(row["dob"])
        if not dob_parsed:
            result.error_count += 1
            result.errors.append(
                {"row": row_num, "error": f"Invalid date format: {row['dob']}"}
            )
            return

        # Validate SSN format if provided
        ssn = row.get("ssn", "").strip()
        if ssn and not _validate_ssn(ssn):
            result.needs_review_count += 1
            result.errors.append(
                {"row": row_num, "error": "Invalid SSN format: needs review"}
            )
            return

        # Duplicate detection
        dedup_key = _make_dedup_key(row)
        ssn_normalized = ssn.replace("-", "") if ssn else ""

        is_dup = dedup_key in self._seen_keys
        if not is_dup and ssn_normalized:
            is_dup = ssn_normalized in self._seen_ssns

        if is_dup:
            result.duplicate_count += 1
            return

        # Mark as seen
        self._seen_keys.add(dedup_key)
        if ssn_normalized:
            self._seen_ssns.add(ssn_normalized)

        # Convert and store
        if not dry_run:
            fhir_patient = _row_to_fhir_patient(row, tenant_id)
            result.imported_patients.append(fhir_patient)

        result.imported_count += 1


class HL7v2ADTParser:
    """Basic parser for HL7v2 ADT (Admit/Discharge/Transfer) messages.

    Extracts patient demographics from PID segments.
    PID format:
        PID|1||MRN^^^MedOS||LastName^FirstName||DOB|Gender|||Street^^City^State^Zip
    """

    @staticmethod
    def parse_pid_segment(pid_line: str) -> dict:
        """Parse a single PID segment line into a patient demographics dict.

        Args:
            pid_line: A pipe-delimited PID segment string.

        Returns:
            Dict with keys: mrn, last_name, first_name, dob, gender, address.
        """
        fields = pid_line.split("|")
        result: dict = {}

        # PID-3: Patient Identifier (MRN)
        if len(fields) > 3:
            id_parts = fields[3].split("^")
            result["mrn"] = id_parts[0] if id_parts else ""

        # PID-5: Patient Name (LastName^FirstName)
        if len(fields) > 5:
            name_parts = fields[5].split("^")
            result["last_name"] = name_parts[0] if len(name_parts) > 0 else ""
            result["first_name"] = name_parts[1] if len(name_parts) > 1 else ""

        # PID-7: Date of Birth (YYYYMMDD)
        if len(fields) > 7:
            raw_dob = fields[7].strip()
            if len(raw_dob) == 8 and raw_dob.isdigit():
                result["dob"] = f"{raw_dob[:4]}-{raw_dob[4:6]}-{raw_dob[6:8]}"
            else:
                result["dob"] = raw_dob

        # PID-8: Gender
        if len(fields) > 8:
            gender_raw = fields[8].strip().upper()
            gender_map = {"M": "male", "F": "female", "O": "other", "U": "unknown"}
            result["gender"] = gender_map.get(gender_raw, "unknown")

        # PID-11: Address (Street^^City^State^Zip)
        if len(fields) > 11:
            addr_parts = fields[11].split("^")
            result["address"] = {
                "line": addr_parts[0] if len(addr_parts) > 0 else "",
                "city": addr_parts[2] if len(addr_parts) > 2 else "",
                "state": addr_parts[3] if len(addr_parts) > 3 else "",
                "postalCode": addr_parts[4] if len(addr_parts) > 4 else "",
            }

        return result

    @staticmethod
    def parse_adt_message(message: str) -> dict:
        """Parse a full HL7v2 ADT message and extract patient info from PID.

        Args:
            message: Complete HL7v2 message with segments separated by newlines.

        Returns:
            Dict with message_type and patient info from PID segment.
        """
        result: dict = {"message_type": "", "patient": {}}
        lines = message.strip().split("\n")

        for line in lines:
            line = line.strip()
            if line.startswith("MSH|"):
                # MSH-9: Message Type (e.g., ADT^A01)
                msh_fields = line.split("|")
                if len(msh_fields) > 8:
                    result["message_type"] = msh_fields[8]
            elif line.startswith("PID|"):
                result["patient"] = HL7v2ADTParser.parse_pid_segment(line)

        return result
