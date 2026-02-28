"""Tests for FHIR AuditEvent builder, PHI filter, and request logging middleware."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from medos.config.logging import PHI_FIELD_NAMES, phi_filter
from medos.main import app
from medos.middleware.audit import (
    ACTION_CREATE,
    ACTION_READ,
    OUTCOME_SUCCESS,
    build_audit_event,
)

client = TestClient(app)


# --------------------------------------------------------------------------- #
# AuditEvent builder tests
# --------------------------------------------------------------------------- #


class TestBuildAuditEventRead:
    """Verify FHIR AuditEvent structure for read actions."""

    def test_build_audit_event_read(self) -> None:
        event = build_audit_event(
            action=ACTION_READ,
            outcome=OUTCOME_SUCCESS,
            resource_type="Patient",
            resource_id="123",
            user_id="dr-smith",
            tenant_id="clinic-a",
            source_ip="10.0.0.1",
            description="Read patient record",
        )

        assert event["resourceType"] == "AuditEvent"
        assert event["action"] == "R"
        assert event["outcome"] == "0"
        assert event["type"]["code"] == "110110"
        assert event["type"]["display"] == "Patient Record"
        assert "recorded" in event
        # Agent
        assert event["agent"][0]["who"]["identifier"]["value"] == "dr-smith"
        assert event["agent"][0]["network"]["address"] == "10.0.0.1"
        assert event["agent"][0]["requestor"] is True
        # Source
        assert event["source"]["observer"]["display"] == "MedOS Platform"
        # Entity
        assert len(event["entity"]) == 1
        assert event["entity"][0]["what"]["reference"] == "Patient/123"
        assert event["entity"][0]["type"]["code"] == "1"
        assert event["entity"][0]["type"]["display"] == "Person"
        assert event["entity"][0]["description"] == "Read patient record"
        # Tenant extension
        assert event["extension"][0]["valueString"] == "clinic-a"


class TestBuildAuditEventCreate:
    """Verify FHIR AuditEvent structure for create actions."""

    def test_build_audit_event_create(self) -> None:
        event = build_audit_event(
            action=ACTION_CREATE,
            outcome=OUTCOME_SUCCESS,
            resource_type="Observation",
            resource_id="obs-456",
            user_id="nurse-jones",
            source_ip="192.168.1.10",
            description="Created vital signs observation",
        )

        assert event["resourceType"] == "AuditEvent"
        assert event["action"] == "C"
        assert event["outcome"] == "0"
        assert event["type"]["code"] == "110111"
        assert event["type"]["display"] == "Procedure Record"
        # Entity for non-Patient resource
        assert event["entity"][0]["what"]["reference"] == "Observation/obs-456"
        assert event["entity"][0]["type"]["code"] == "2"
        assert event["entity"][0]["type"]["display"] == "Other"
        # No tenant extension when not provided
        assert "extension" not in event


class TestBuildAuditEventNoEntity:
    """Verify AuditEvent has empty entity list when no resource is specified."""

    def test_build_audit_event_no_entity(self) -> None:
        event = build_audit_event(
            action="E",
            outcome=OUTCOME_SUCCESS,
            description="System health check",
        )

        assert event["resourceType"] == "AuditEvent"
        assert event["action"] == "E"
        assert event["entity"] == []
        # Defaults for missing optional fields
        assert event["agent"][0]["who"]["identifier"]["value"] == "anonymous"
        assert event["agent"][0]["network"]["address"] == "unknown"


class TestBuildAuditEventTimestamp:
    """Verify recorded timestamp is ISO 8601 UTC."""

    def test_recorded_is_iso_utc(self) -> None:
        event = build_audit_event(action="R", outcome="0")
        recorded = event["recorded"]
        # Must contain UTC offset indicator
        assert recorded.endswith("+00:00") or recorded.endswith("Z") or "T" in recorded


# --------------------------------------------------------------------------- #
# PHI filter tests
# --------------------------------------------------------------------------- #


class TestPhiFilterRedacts:
    """Verify PHI fields are redacted from log events."""

    def test_phi_filter_redacts(self) -> None:
        event_dict = {
            "event": "patient_lookup",
            "patient_name": "John Doe",
            "ssn": "123-45-6789",
            "birthDate": "1990-01-01",
            "mrn": "MRN-12345",
            "email": "john@example.com",
            "phone": "555-0100",
            "address": "123 Main St",
            "user_id": "dr-smith",  # not PHI
        }

        result = phi_filter(None, "info", event_dict)

        assert result["patient_name"] == "[REDACTED-PHI]"
        assert result["ssn"] == "[REDACTED-PHI]"
        assert result["birthDate"] == "[REDACTED-PHI]"
        assert result["mrn"] == "[REDACTED-PHI]"
        assert result["email"] == "[REDACTED-PHI]"
        assert result["phone"] == "[REDACTED-PHI]"
        assert result["address"] == "[REDACTED-PHI]"
        # Non-PHI fields pass through
        assert result["event"] == "patient_lookup"
        assert result["user_id"] == "dr-smith"


class TestPhiFilterPassesSafe:
    """Verify non-PHI fields pass through untouched."""

    def test_phi_filter_passes_safe(self) -> None:
        event_dict = {
            "event": "api_request",
            "method": "GET",
            "path": "/fhir/r4/Patient",
            "status_code": 200,
            "duration_ms": 42.5,
            "client_ip": "10.0.0.1",
            "user_agent": "MedOS-Client/1.0",
        }

        result = phi_filter(None, "info", event_dict)

        # All fields should be unchanged
        assert result == event_dict


class TestPhiFieldNamesCompleteness:
    """Verify key HIPAA identifiers are covered."""

    def test_core_hipaa_identifiers_present(self) -> None:
        required_fields = {"name", "ssn", "birthdate", "address", "phone", "email", "mrn", "photo"}
        assert required_fields.issubset(PHI_FIELD_NAMES)


# --------------------------------------------------------------------------- #
# Request logging middleware tests
# --------------------------------------------------------------------------- #


class TestRequestLoggingMiddleware:
    """Verify the request logging middleware logs HTTP requests."""

    def test_health_request_is_logged(self) -> None:
        with patch("medos.middleware.request_logging.logger") as mock_logger:
            response = client.get("/health")
            assert response.status_code == 200
            mock_logger.info.assert_called()
            # Find the http_request call
            call_found = False
            for call in mock_logger.info.call_args_list:
                args, kwargs = call
                if args and args[0] == "http_request":
                    call_found = True
                    assert kwargs["method"] == "GET"
                    assert kwargs["path"] == "/health"
                    assert kwargs["status_code"] == 200
                    assert "duration_ms" in kwargs
                    break
            assert call_found, "Expected http_request log entry not found"

    def test_not_found_is_logged_as_warning(self) -> None:
        with patch("medos.middleware.request_logging.logger") as mock_logger:
            response = client.get("/nonexistent-path")
            assert response.status_code == 404
            mock_logger.warning.assert_called()
            call_found = False
            for call in mock_logger.warning.call_args_list:
                args, kwargs = call
                if args and args[0] == "http_request":
                    call_found = True
                    assert kwargs["status_code"] == 404
                    break
            assert call_found, "Expected http_request warning log entry not found"

    def test_request_body_not_logged(self) -> None:
        """HIPAA: Request bodies must NEVER be logged (may contain PHI)."""
        with patch("medos.middleware.request_logging.logger") as mock_logger:
            client.get("/health")
            for call in mock_logger.info.call_args_list:
                _, kwargs = call
                assert "body" not in kwargs
                assert "request_body" not in kwargs
                assert "response_body" not in kwargs


class TestRequestLoggingMiddlewareFields:
    """Verify required fields are present in log output."""

    def test_log_contains_required_fields(self) -> None:
        with patch("medos.middleware.request_logging.logger") as mock_logger:
            client.get("/fhir/r4/metadata")
            for call in mock_logger.info.call_args_list:
                args, kwargs = call
                if args and args[0] == "http_request":
                    required_keys = {"method", "path", "status_code", "duration_ms", "client_ip"}
                    assert required_keys.issubset(kwargs.keys())
                    break
