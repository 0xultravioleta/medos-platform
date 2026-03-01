"""Tests for Scheduling MCP Server tools."""

import pytest

from medos.mcp.servers.scheduling_server import (
    scheduling_available_slots,
    scheduling_book,
    scheduling_cancel,
    scheduling_no_show_predict,
    scheduling_reschedule,
    scheduling_waitlist_add,
)


# ---------------------------------------------------------------------------
# scheduling_available_slots
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_available_slots_all_providers():
    result = await scheduling_available_slots()
    assert "slots" in result
    assert result["total_available"] > 0
    assert result["providers_checked"] == 3


@pytest.mark.asyncio
async def test_available_slots_specific_provider():
    result = await scheduling_available_slots(provider_id="prov-001")
    assert result["providers_checked"] == 1
    for slot in result["slots"]:
        assert slot["provider_id"] == "prov-001"


@pytest.mark.asyncio
async def test_available_slots_unknown_provider():
    result = await scheduling_available_slots(provider_id="prov-999")
    assert "error" in result


# ---------------------------------------------------------------------------
# scheduling_book
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_book_appointment():
    result = await scheduling_book(
        patient_id="p-001",
        provider_id="prov-001",
        slot_id="slot-test-123",
        reason="Follow-up knee pain",
    )
    assert result["status"] == "booked"
    assert result["appointment_id"].startswith("apt-")
    assert result["confirmation_sent"] is True


@pytest.mark.asyncio
async def test_book_missing_fields():
    result = await scheduling_book(patient_id="p-001")
    assert "error" in result


# ---------------------------------------------------------------------------
# scheduling_reschedule
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reschedule():
    booked = await scheduling_book(
        patient_id="p-002", provider_id="prov-002", slot_id="slot-old",
    )
    apt_id = booked["appointment_id"]
    result = await scheduling_reschedule(
        appointment_id=apt_id, new_slot_id="slot-new", reason="conflict",
    )
    assert result["status"] == "rescheduled"
    assert result["previous_slot"] == "slot-old"


@pytest.mark.asyncio
async def test_reschedule_not_found():
    result = await scheduling_reschedule(appointment_id="apt-fake")
    assert "error" in result


# ---------------------------------------------------------------------------
# scheduling_cancel
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cancel():
    booked = await scheduling_book(
        patient_id="p-003", provider_id="prov-001", slot_id="slot-cancel",
    )
    result = await scheduling_cancel(
        appointment_id=booked["appointment_id"], reason="patient request",
    )
    assert result["status"] == "cancelled"


# ---------------------------------------------------------------------------
# scheduling_waitlist_add
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_waitlist_add():
    result = await scheduling_waitlist_add(
        patient_id="p-004", provider_id="prov-001",
    )
    assert result["status"] == "waiting"
    assert result["position"] >= 1


# ---------------------------------------------------------------------------
# scheduling_no_show_predict
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_no_show_predict_low_risk():
    result = await scheduling_no_show_predict(patient_id="p-001")
    assert result["risk_level"] == "low"
    assert result["probability"] < 0.20


@pytest.mark.asyncio
async def test_no_show_predict_high_risk():
    result = await scheduling_no_show_predict(patient_id="p-004")
    assert result["risk_level"] == "high"
    assert result["probability"] > 0.30


@pytest.mark.asyncio
async def test_no_show_predict_unknown():
    result = await scheduling_no_show_predict(patient_id="unknown")
    assert "probability" in result
    assert "recommendation" in result
