"""Structured logging configuration for MedOS Platform.

Uses structlog for structured, context-rich logging with PHI protection.
- Development: colored console output (human-readable)
- Production: JSON output (for CloudWatch/ELK ingestion)

HIPAA Compliance: The PHI filter processor automatically redacts known
Protected Health Information field names from all log output.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog

# --------------------------------------------------------------------------- #
# PHI (Protected Health Information) redaction
# --------------------------------------------------------------------------- #

PHI_FIELD_NAMES: frozenset[str] = frozenset(
    {
        # Names
        "patient_name",
        "name",
        "given",
        "family",
        # Dates
        "birthdate",
        "birth_date",
        "date_of_birth",
        "dob",
        "death_date",
        # Government IDs
        "ssn",
        "social_security",
        "social_security_number",
        "mrn",
        "medical_record_number",
        "drivers_license",
        "passport_number",
        # Contact info
        "address",
        "street",
        "city",
        "zip",
        "zip_code",
        "postal_code",
        "phone",
        "phone_number",
        "fax",
        "email",
        "email_address",
        "telecom",
        # FHIR identifiers
        "identifier_value",
        # Biometric / media
        "photo",
        "biometric",
        "fingerprint",
        # Relational
        "contact",
        "emergency_contact",
        "next_of_kin",
        # Financial
        "account_number",
        "insurance_id",
        "policy_number",
        # Device / vehicle
        "device_serial",
        "vehicle_id",
        "license_plate",
        # Network
        "ip_address",
        # Catch-all
        "any_unique_identifying_number",
    }
)

_PHI_REDACTED = "[REDACTED-PHI]"


def phi_filter(
    logger: structlog.types.WrappedLogger,
    method_name: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    """Redact any PHI fields from log events.

    Compares each key (lowercased) against the known PHI field names
    and replaces the value with a redaction marker.
    """
    for key in list(event_dict.keys()):
        if key.lower() in PHI_FIELD_NAMES:
            event_dict[key] = _PHI_REDACTED
    return event_dict


# --------------------------------------------------------------------------- #
# Logging setup
# --------------------------------------------------------------------------- #


def setup_logging(log_level: str = "INFO", *, environment: str = "development") -> None:
    """Configure structlog with stdlib integration.

    Args:
        log_level: Root log level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        environment: 'development' for pretty console, anything else for JSON.
    """
    is_dev = environment.lower() in ("development", "dev", "local")

    # Shared processors (applied to every log entry)
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.CallsiteParameterAdder(
            parameters=[
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.LINENO,
            ],
        ),
        phi_filter,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if is_dev:
        # Human-readable colored console output
        renderer: structlog.types.Processor = structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty())
    else:
        # Machine-readable JSON for production log aggregation
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level.upper())

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "httpcore", "httpx", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger, optionally bound to a name.

    Args:
        name: Logger name (typically ``__name__``).

    Returns:
        A bound structlog logger.
    """
    return structlog.get_logger(name)
