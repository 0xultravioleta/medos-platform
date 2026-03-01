"""Scheduling MCP Server - 6 tools for appointment management.

Tools:
    scheduling_available_slots  - Find available appointment slots
    scheduling_book             - Book an appointment
    scheduling_reschedule       - Reschedule an existing appointment
    scheduling_cancel           - Cancel an appointment
    scheduling_waitlist_add     - Add patient to waitlist
    scheduling_no_show_predict  - AI prediction of no-show probability
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from medos.mcp.decorators import hipaa_tool
from medos.schemas.agent import AgentType

logger = logging.getLogger(__name__)

_SCHEDULING_AGENTS = [AgentType.SCHEDULING, AgentType.SYSTEM, AgentType.PATIENT_COMMS]

# ---------------------------------------------------------------------------
# Mock Data
# ---------------------------------------------------------------------------

_PROVIDERS = {
    "prov-001": {"id": "prov-001", "name": "Dr. Sarah Williams", "specialty": "Orthopedics", "npi": "1234567890"},
    "prov-002": {"id": "prov-002", "name": "Dr. Michael Torres", "specialty": "Orthopedics", "npi": "0987654321"},
    "prov-003": {"id": "prov-003", "name": "Dr. Lisa Chen", "specialty": "Sports Medicine", "npi": "1122334455"},
}


def _generate_slots(provider_id: str, days_ahead: int = 5) -> list[dict[str, Any]]:
    """Generate realistic available slots for a provider."""
    slots = []
    base_date = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    for day_offset in range(1, days_ahead + 1):
        date = base_date + timedelta(days=day_offset)
        if date.weekday() >= 5:  # Skip weekends
            continue

        # Morning slots (9 AM - 12 PM, 30-min intervals)
        for hour in range(9, 12):
            for minute in [0, 30]:
                slot_time = date.replace(hour=hour, minute=minute)
                # Skip some slots to simulate bookings
                if (day_offset + hour + minute) % 3 == 0:
                    continue
                slots.append({
                    "slot_id": f"slot-{provider_id}-{slot_time.strftime('%Y%m%d%H%M')}",
                    "provider_id": provider_id,
                    "start": slot_time.isoformat(),
                    "end": (slot_time + timedelta(minutes=30)).isoformat(),
                    "duration_minutes": 30,
                    "status": "available",
                    "visit_type": "follow_up",
                })

        # Afternoon slots (1 PM - 5 PM)
        for hour in range(13, 17):
            for minute in [0, 30]:
                slot_time = date.replace(hour=hour, minute=minute)
                if (day_offset + hour + minute) % 4 == 0:
                    continue
                slots.append({
                    "slot_id": f"slot-{provider_id}-{slot_time.strftime('%Y%m%d%H%M')}",
                    "provider_id": provider_id,
                    "start": slot_time.isoformat(),
                    "end": (slot_time + timedelta(minutes=30)).isoformat(),
                    "duration_minutes": 30,
                    "status": "available",
                    "visit_type": "follow_up",
                })

    return slots


# In-memory appointment store
_appointments: dict[str, dict[str, Any]] = {}
_waitlist: list[dict[str, Any]] = []


# ---------------------------------------------------------------------------
# Tool Handlers
# ---------------------------------------------------------------------------


@hipaa_tool(phi_level="none", allowed_agents=_SCHEDULING_AGENTS, server="scheduling")
async def scheduling_available_slots(
    provider_id: str = "",
    date_from: str = "",
    date_to: str = "",
    visit_type: str = "follow_up",
) -> dict[str, Any]:
    """Find available appointment slots for a provider."""
    if provider_id and provider_id not in _PROVIDERS:
        return {"error": f"Provider {provider_id} not found", "available_providers": list(_PROVIDERS.keys())}

    providers_to_check = [provider_id] if provider_id else list(_PROVIDERS.keys())
    all_slots: list[dict] = []

    for pid in providers_to_check:
        provider = _PROVIDERS[pid]
        slots = _generate_slots(pid)
        for slot in slots:
            slot["provider_name"] = provider["name"]
            slot["specialty"] = provider["specialty"]
        all_slots.extend(slots)

    return {
        "slots": all_slots[:20],  # Limit response size
        "total_available": len(all_slots),
        "providers_checked": len(providers_to_check),
        "generated_at": datetime.now(UTC).isoformat(),
    }


@hipaa_tool(phi_level="limited", allowed_agents=_SCHEDULING_AGENTS, server="scheduling")
async def scheduling_book(
    patient_id: str = "",
    provider_id: str = "",
    slot_id: str = "",
    visit_type: str = "follow_up",
    reason: str = "",
) -> dict[str, Any]:
    """Book an appointment for a patient."""
    if not all([patient_id, provider_id, slot_id]):
        return {"error": "patient_id, provider_id, and slot_id are required"}

    if provider_id not in _PROVIDERS:
        return {"error": f"Provider {provider_id} not found"}

    appointment_id = f"apt-{uuid4().hex[:8]}"
    provider = _PROVIDERS[provider_id]

    appointment = {
        "appointment_id": appointment_id,
        "patient_id": patient_id,
        "provider_id": provider_id,
        "provider_name": provider["name"],
        "slot_id": slot_id,
        "visit_type": visit_type,
        "reason": reason,
        "status": "booked",
        "booked_at": datetime.now(UTC).isoformat(),
        "confirmation_sent": True,
    }

    _appointments[appointment_id] = appointment
    logger.info("Booked appointment %s for patient %s with %s", appointment_id, patient_id, provider["name"])

    return {
        **appointment,
        "message": f"Appointment booked with {provider['name']}. Confirmation sent to patient.",
    }


@hipaa_tool(phi_level="limited", allowed_agents=_SCHEDULING_AGENTS, server="scheduling")
async def scheduling_reschedule(
    appointment_id: str = "",
    new_slot_id: str = "",
    reason: str = "",
) -> dict[str, Any]:
    """Reschedule an existing appointment to a new slot."""
    if not appointment_id:
        return {"error": "appointment_id is required"}

    appointment = _appointments.get(appointment_id)
    if not appointment:
        return {"error": f"Appointment {appointment_id} not found"}

    old_slot = appointment["slot_id"]
    appointment["slot_id"] = new_slot_id or appointment["slot_id"]
    appointment["status"] = "rescheduled"
    appointment["reschedule_reason"] = reason
    appointment["rescheduled_at"] = datetime.now(UTC).isoformat()

    return {
        **appointment,
        "previous_slot": old_slot,
        "message": "Appointment rescheduled. Updated confirmation sent to patient.",
    }


@hipaa_tool(phi_level="limited", allowed_agents=_SCHEDULING_AGENTS, server="scheduling")
async def scheduling_cancel(
    appointment_id: str = "",
    reason: str = "",
    notify_waitlist: bool = True,
) -> dict[str, Any]:
    """Cancel an appointment and optionally notify waitlist."""
    if not appointment_id:
        return {"error": "appointment_id is required"}

    appointment = _appointments.get(appointment_id)
    if not appointment:
        return {"error": f"Appointment {appointment_id} not found"}

    appointment["status"] = "cancelled"
    appointment["cancel_reason"] = reason
    appointment["cancelled_at"] = datetime.now(UTC).isoformat()

    waitlist_notified = 0
    if notify_waitlist and _waitlist:
        # Notify first matching waitlist entry
        for entry in _waitlist:
            if entry["provider_id"] == appointment["provider_id"]:
                entry["notified"] = True
                entry["notified_at"] = datetime.now(UTC).isoformat()
                waitlist_notified += 1
                break

    return {
        **appointment,
        "waitlist_notified": waitlist_notified,
        "message": (
            "Appointment cancelled."
            + (f" {waitlist_notified} waitlist patient(s) notified." if waitlist_notified else "")
        ),
    }


@hipaa_tool(phi_level="limited", allowed_agents=_SCHEDULING_AGENTS, server="scheduling")
async def scheduling_waitlist_add(
    patient_id: str = "",
    provider_id: str = "",
    preferred_dates: list[str] | None = None,
    reason: str = "",
) -> dict[str, Any]:
    """Add a patient to the appointment waitlist."""
    preferred_dates = preferred_dates or []
    if not patient_id:
        return {"error": "patient_id is required"}

    entry = {
        "waitlist_id": f"wl-{uuid4().hex[:6]}",
        "patient_id": patient_id,
        "provider_id": provider_id,
        "preferred_dates": preferred_dates,
        "reason": reason,
        "added_at": datetime.now(UTC).isoformat(),
        "status": "waiting",
        "notified": False,
        "position": len(_waitlist) + 1,
    }

    _waitlist.append(entry)
    logger.info("Added patient %s to waitlist (position %d)", patient_id, entry["position"])

    return {
        **entry,
        "message": f"Patient added to waitlist at position {entry['position']}.",
    }


@hipaa_tool(phi_level="none", allowed_agents=_SCHEDULING_AGENTS, server="scheduling")
async def scheduling_no_show_predict(
    patient_id: str = "",
    appointment_type: str = "follow_up",
) -> dict[str, Any]:
    """AI prediction of no-show probability for a patient."""
    # Mock prediction based on patient demographics
    predictions = {
        "p-001": {"probability": 0.08, "risk_level": "low", "factors": ["regular_visitor", "confirmed_insurance"]},
        "p-002": {"probability": 0.15, "risk_level": "low", "factors": ["new_patient", "confirmed_insurance"]},
        "p-003": {"probability": 0.22, "risk_level": "medium", "factors": ["history_of_reschedule", "long_drive"]},
        "p-004": {"probability": 0.45, "risk_level": "high", "factors": ["inactive_insurance", "no_recent_visit"]},
        "p-005": {"probability": 0.12, "risk_level": "low", "factors": ["regular_visitor", "good_history"]},
        "p-006": {"probability": 0.35, "risk_level": "medium", "factors": ["elderly", "transportation_concern"]},
    }

    prediction = predictions.get(patient_id, {
        "probability": 0.20,
        "risk_level": "medium",
        "factors": ["unknown_patient_history"],
    })

    return {
        "patient_id": patient_id,
        "appointment_type": appointment_type,
        **prediction,
        "model_version": "no-show-predictor-v1",
        "confidence": 0.82,
        "recommendation": (
            "Send reminder 24h before" if prediction["risk_level"] == "low"
            else "Send reminder 48h + 24h before, confirm transportation" if prediction["risk_level"] == "medium"
            else "Call patient to confirm, consider overbooking slot"
        ),
    }
