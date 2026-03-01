"""Device/Wearable MCP Server - 8 tools for IoT device integration.

Tools:
    device_register          - Register a wearable device for a patient
    device_list              - List all registered devices for a patient
    device_ingest_reading    - Ingest a single health reading
    device_batch_ingest      - Batch ingest multiple readings
    device_get_readings      - Get readings filtered by type/date
    device_get_summary       - Get daily/weekly metric summaries
    device_check_alerts      - Check readings against alert thresholds
    device_deregister        - Remove a device from patient
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from medos.mcp.decorators import hipaa_tool
from medos.schemas.agent import AgentType

logger = logging.getLogger(__name__)

_DEVICE_AGENTS = [AgentType.DEVICE_BRIDGE, AgentType.SYSTEM, AgentType.CLINICAL_SCRIBE]
_DEVICE_WRITE_AGENTS = [AgentType.DEVICE_BRIDGE, AgentType.SYSTEM]

# ---------------------------------------------------------------------------
# Mock Data
# ---------------------------------------------------------------------------

_MOCK_DEVICES: dict[str, dict[str, Any]] = {
    "dev-001": {
        "device_id": "dev-001",
        "patient_id": "p-001",
        "device_type": "oura_ring_gen4",
        "device_name": "Oura Ring Gen 4",
        "manufacturer": "Oura Health",
        "model": "Gen 4",
        "status": "active",
        "paired_at": "2026-01-15T10:30:00Z",
        "last_sync": "2026-02-28T08:15:00Z",
        "metrics_supported": [
            "heart_rate", "hrv", "spo2", "sleep",
            "temperature", "steps", "activity",
        ],
    },
    "dev-002": {
        "device_id": "dev-002",
        "patient_id": "p-001",
        "device_type": "apple_watch_ultra3",
        "device_name": "Apple Watch Ultra 3",
        "manufacturer": "Apple",
        "model": "Ultra 3",
        "status": "active",
        "paired_at": "2026-02-01T14:00:00Z",
        "last_sync": "2026-02-28T09:00:00Z",
        "metrics_supported": [
            "heart_rate", "hrv", "spo2", "ecg",
            "blood_oxygen", "steps", "activity", "fall_detection",
        ],
    },
    "dev-003": {
        "device_id": "dev-003",
        "patient_id": "p-002",
        "device_type": "dexcom_g8",
        "device_name": "Dexcom G8 CGM",
        "manufacturer": "Dexcom",
        "model": "G8",
        "status": "active",
        "paired_at": "2026-02-10T09:00:00Z",
        "last_sync": "2026-02-28T09:30:00Z",
        "metrics_supported": ["glucose", "glucose_trend"],
    },
}

_ALERT_THRESHOLDS: dict[str, dict[str, Any]] = {
    "heart_rate": {"low": 45, "high": 120, "unit": "bpm"},
    "spo2": {"low": 92, "high": None, "unit": "%"},
    "glucose": {"low": 70, "high": 180, "unit": "mg/dL"},
    "temperature": {"low": 35.0, "high": 38.0, "unit": "C"},
    "hrv": {"low": 20, "high": None, "unit": "ms"},
}

_LOINC_CODES: dict[str, str] = {
    "heart_rate": "8867-4",
    "hrv": "80404-7",
    "spo2": "2708-6",
    "temperature": "8310-5",
    "glucose": "2345-7",
    "steps": "41950-7",
    "sleep": "93832-4",
}

# In-memory store for readings
_MOCK_READINGS: list[dict[str, Any]] = []


def _seed_readings() -> None:
    """Seed 7 days of realistic mock readings for the demo devices."""
    if _MOCK_READINGS:
        return  # already seeded

    import hashlib

    now = datetime.now(UTC)

    def _pseudo(seed: str, lo: float, hi: float) -> float:
        h = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)  # noqa: S324
        return round(lo + (h % 1000) / 1000 * (hi - lo), 1)

    for day_offset in range(7):
        ts_date = now - timedelta(days=day_offset)
        day_str = ts_date.strftime("%Y-%m-%d")

        # Oura Ring (dev-001, patient p-001)
        for hour in (6, 12, 18, 22):
            ts = ts_date.replace(hour=hour, minute=0, second=0).isoformat()
            seed_base = f"dev-001-{day_str}-{hour}"
            _MOCK_READINGS.append({
                "reading_id": f"r-{uuid4().hex[:8]}",
                "device_id": "dev-001",
                "patient_id": "p-001",
                "metric_type": "heart_rate",
                "value": _pseudo(seed_base + "-hr", 58, 72),
                "unit": "bpm",
                "loinc_code": "8867-4",
                "timestamp": ts,
            })
            _MOCK_READINGS.append({
                "reading_id": f"r-{uuid4().hex[:8]}",
                "device_id": "dev-001",
                "patient_id": "p-001",
                "metric_type": "hrv",
                "value": _pseudo(seed_base + "-hrv", 35, 65),
                "unit": "ms",
                "loinc_code": "80404-7",
                "timestamp": ts,
            })
            _MOCK_READINGS.append({
                "reading_id": f"r-{uuid4().hex[:8]}",
                "device_id": "dev-001",
                "patient_id": "p-001",
                "metric_type": "spo2",
                "value": _pseudo(seed_base + "-spo2", 96, 99),
                "unit": "%",
                "loinc_code": "2708-6",
                "timestamp": ts,
            })
            _MOCK_READINGS.append({
                "reading_id": f"r-{uuid4().hex[:8]}",
                "device_id": "dev-001",
                "patient_id": "p-001",
                "metric_type": "temperature",
                "value": _pseudo(seed_base + "-temp", 36.2, 36.8),
                "unit": "C",
                "loinc_code": "8310-5",
                "timestamp": ts,
            })

        # Steps once per day for dev-001
        _MOCK_READINGS.append({
            "reading_id": f"r-{uuid4().hex[:8]}",
            "device_id": "dev-001",
            "patient_id": "p-001",
            "metric_type": "steps",
            "value": _pseudo(f"dev-001-{day_str}-steps", 4000, 12000),
            "unit": "steps",
            "loinc_code": "41950-7",
            "timestamp": ts_date.replace(hour=23, minute=59).isoformat(),
        })

        # Sleep once per day for dev-001
        _MOCK_READINGS.append({
            "reading_id": f"r-{uuid4().hex[:8]}",
            "device_id": "dev-001",
            "patient_id": "p-001",
            "metric_type": "sleep",
            "value": _pseudo(f"dev-001-{day_str}-sleep", 6.5, 8.5),
            "unit": "hours",
            "loinc_code": "93832-4",
            "timestamp": ts_date.replace(hour=7, minute=0).isoformat(),
            "metadata": {
                "deep": round(_pseudo(f"dev-001-{day_str}-deep", 1.0, 2.0), 1),
                "light": round(_pseudo(f"dev-001-{day_str}-light", 2.5, 4.0), 1),
                "rem": round(_pseudo(f"dev-001-{day_str}-rem", 1.0, 2.5), 1),
                "awake": round(_pseudo(f"dev-001-{day_str}-awake", 0.1, 0.5), 1),
            },
        })

        # Apple Watch (dev-002, patient p-001) - heart_rate + spo2
        for hour in (7, 13, 19):
            ts = ts_date.replace(hour=hour, minute=30, second=0).isoformat()
            seed_base = f"dev-002-{day_str}-{hour}"
            _MOCK_READINGS.append({
                "reading_id": f"r-{uuid4().hex[:8]}",
                "device_id": "dev-002",
                "patient_id": "p-001",
                "metric_type": "heart_rate",
                "value": _pseudo(seed_base + "-hr", 60, 75),
                "unit": "bpm",
                "loinc_code": "8867-4",
                "timestamp": ts,
            })
            _MOCK_READINGS.append({
                "reading_id": f"r-{uuid4().hex[:8]}",
                "device_id": "dev-002",
                "patient_id": "p-001",
                "metric_type": "spo2",
                "value": _pseudo(seed_base + "-spo2", 96, 99),
                "unit": "%",
                "loinc_code": "2708-6",
                "timestamp": ts,
            })

        # Steps once per day for dev-002
        _MOCK_READINGS.append({
            "reading_id": f"r-{uuid4().hex[:8]}",
            "device_id": "dev-002",
            "patient_id": "p-001",
            "metric_type": "steps",
            "value": _pseudo(f"dev-002-{day_str}-steps", 5000, 13000),
            "unit": "steps",
            "loinc_code": "41950-7",
            "timestamp": ts_date.replace(hour=23, minute=59).isoformat(),
        })

        # Dexcom G8 (dev-003, patient p-002) - glucose every 5 min is too much,
        # store 6 readings/day for mock
        for hour in (6, 9, 12, 15, 18, 21):
            ts = ts_date.replace(hour=hour, minute=0, second=0).isoformat()
            seed_base = f"dev-003-{day_str}-{hour}"
            _MOCK_READINGS.append({
                "reading_id": f"r-{uuid4().hex[:8]}",
                "device_id": "dev-003",
                "patient_id": "p-002",
                "metric_type": "glucose",
                "value": _pseudo(seed_base + "-glucose", 80, 140),
                "unit": "mg/dL",
                "loinc_code": "2345-7",
                "timestamp": ts,
            })


# Seed on module load
_seed_readings()


# ---------------------------------------------------------------------------
# Tool Handlers
# ---------------------------------------------------------------------------


@hipaa_tool(
    phi_level="limited",
    allowed_agents=_DEVICE_WRITE_AGENTS,
    server="device",
)
async def device_register(
    patient_id: str = "",
    device_type: str = "",
    device_name: str = "",
    manufacturer: str = "",
    model: str = "",
) -> dict[str, Any]:
    """Register a new wearable/IoT device for a patient."""
    if not patient_id:
        return {"error": "patient_id is required"}
    if not device_type:
        return {"error": "device_type is required"}

    # Check for duplicate device_type on the same patient
    for dev in _MOCK_DEVICES.values():
        if dev["patient_id"] == patient_id and dev["device_type"] == device_type:
            return {
                "error": f"Device type '{device_type}' already registered for patient {patient_id}",
                "existing_device_id": dev["device_id"],
            }

    device_id = f"dev-{uuid4().hex[:6]}"
    now_iso = datetime.now(UTC).isoformat()

    device = {
        "device_id": device_id,
        "patient_id": patient_id,
        "device_type": device_type,
        "device_name": device_name or device_type,
        "manufacturer": manufacturer,
        "model": model,
        "status": "active",
        "paired_at": now_iso,
        "last_sync": now_iso,
        "metrics_supported": [],
    }

    _MOCK_DEVICES[device_id] = device
    logger.info("Registered device %s (%s) for patient %s", device_id, device_type, patient_id)
    return device


@hipaa_tool(
    phi_level="limited",
    allowed_agents=_DEVICE_AGENTS,
    server="device",
)
async def device_list(patient_id: str = "") -> dict[str, Any]:
    """List all registered devices for a patient."""
    if not patient_id:
        return {"error": "patient_id is required"}

    devices = [d for d in _MOCK_DEVICES.values() if d["patient_id"] == patient_id]
    return {
        "patient_id": patient_id,
        "device_count": len(devices),
        "devices": devices,
    }


@hipaa_tool(
    phi_level="limited",
    allowed_agents=_DEVICE_WRITE_AGENTS,
    server="device",
)
async def device_ingest_reading(
    device_id: str = "",
    metric_type: str = "",
    value: float = 0.0,
    unit: str = "",
    timestamp: str = "",
) -> dict[str, Any]:
    """Ingest a single health reading from a device."""
    if not device_id:
        return {"error": "device_id is required"}
    if not metric_type:
        return {"error": "metric_type is required"}

    device = _MOCK_DEVICES.get(device_id)
    if not device:
        return {"error": f"Device {device_id} not found"}

    reading_id = f"r-{uuid4().hex[:8]}"
    ts = timestamp or datetime.now(UTC).isoformat()

    reading = {
        "reading_id": reading_id,
        "device_id": device_id,
        "patient_id": device["patient_id"],
        "metric_type": metric_type,
        "value": value,
        "unit": unit,
        "loinc_code": _LOINC_CODES.get(metric_type, ""),
        "timestamp": ts,
    }

    _MOCK_READINGS.append(reading)

    # Update device last_sync
    device["last_sync"] = datetime.now(UTC).isoformat()

    logger.info("Ingested reading %s from device %s: %s=%s %s", reading_id, device_id, metric_type, value, unit)
    return reading


@hipaa_tool(
    phi_level="limited",
    allowed_agents=_DEVICE_WRITE_AGENTS,
    server="device",
)
async def device_batch_ingest(
    device_id: str = "",
    readings: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Batch ingest multiple health readings from a device."""
    readings = readings or []
    if not device_id:
        return {"error": "device_id is required"}
    if not readings:
        return {"error": "readings list is required and must not be empty"}

    device = _MOCK_DEVICES.get(device_id)
    if not device:
        return {"error": f"Device {device_id} not found"}

    reading_ids = []
    for r in readings:
        reading_id = f"r-{uuid4().hex[:8]}"
        ts = r.get("timestamp", datetime.now(UTC).isoformat())
        reading = {
            "reading_id": reading_id,
            "device_id": device_id,
            "patient_id": device["patient_id"],
            "metric_type": r.get("metric_type", ""),
            "value": r.get("value", 0),
            "unit": r.get("unit", ""),
            "loinc_code": _LOINC_CODES.get(r.get("metric_type", ""), ""),
            "timestamp": ts,
        }
        _MOCK_READINGS.append(reading)
        reading_ids.append(reading_id)

    device["last_sync"] = datetime.now(UTC).isoformat()

    logger.info("Batch ingested %d readings from device %s", len(reading_ids), device_id)
    return {
        "device_id": device_id,
        "ingested_count": len(reading_ids),
        "reading_ids": reading_ids,
    }


@hipaa_tool(
    phi_level="limited",
    allowed_agents=_DEVICE_AGENTS,
    server="device",
)
async def device_get_readings(
    patient_id: str = "",
    metric_type: str = "",
    start_date: str = "",
    end_date: str = "",
    limit: int = 50,
) -> dict[str, Any]:
    """Get device readings filtered by type and/or date range."""
    if not patient_id:
        return {"error": "patient_id is required"}

    filtered = [r for r in _MOCK_READINGS if r["patient_id"] == patient_id]

    if metric_type:
        filtered = [r for r in filtered if r["metric_type"] == metric_type]

    if start_date:
        filtered = [r for r in filtered if r["timestamp"] >= start_date]

    if end_date:
        filtered = [r for r in filtered if r["timestamp"] <= end_date]

    # Sort by timestamp descending (most recent first)
    filtered.sort(key=lambda r: r["timestamp"], reverse=True)

    if limit > 0:
        filtered = filtered[:limit]

    return {
        "patient_id": patient_id,
        "reading_count": len(filtered),
        "readings": filtered,
    }


@hipaa_tool(
    phi_level="limited",
    allowed_agents=_DEVICE_AGENTS,
    server="device",
)
async def device_get_summary(
    patient_id: str = "",
    period: str = "daily",
    metric_type: str = "",
) -> dict[str, Any]:
    """Get aggregated metric summaries (min, max, avg, count) per period."""
    if not patient_id:
        return {"error": "patient_id is required"}
    if period not in ("daily", "weekly"):
        return {"error": "period must be 'daily' or 'weekly'"}

    patient_readings = [r for r in _MOCK_READINGS if r["patient_id"] == patient_id]
    if metric_type:
        patient_readings = [r for r in patient_readings if r["metric_type"] == metric_type]

    if not patient_readings:
        return {"patient_id": patient_id, "period": period, "summaries": []}

    # Group by period bucket and metric_type
    buckets: dict[str, dict[str, list[float]]] = {}
    for r in patient_readings:
        ts = r["timestamp"][:10]  # YYYY-MM-DD
        if period == "weekly":
            # Use ISO week start (Monday)
            try:
                dt = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
                week_start = dt - timedelta(days=dt.weekday())
                ts = week_start.strftime("%Y-%m-%d")
            except (ValueError, TypeError):
                pass

        key = f"{ts}|{r['metric_type']}"
        if key not in buckets:
            buckets[key] = {"values": [], "metric_type": r["metric_type"], "period_start": ts}
        val = r.get("value")
        if isinstance(val, int | float):
            buckets[key]["values"].append(float(val))

    summaries = []
    for bucket in buckets.values():
        vals = bucket["values"]
        if not vals:
            continue
        summaries.append({
            "period_start": bucket["period_start"],
            "metric_type": bucket["metric_type"],
            "count": len(vals),
            "min": round(min(vals), 1),
            "max": round(max(vals), 1),
            "avg": round(sum(vals) / len(vals), 1),
        })

    summaries.sort(key=lambda s: (s["period_start"], s["metric_type"]), reverse=True)

    return {
        "patient_id": patient_id,
        "period": period,
        "summary_count": len(summaries),
        "summaries": summaries,
    }


@hipaa_tool(
    phi_level="none",
    allowed_agents=_DEVICE_AGENTS,
    server="device",
)
async def device_check_alerts(
    patient_id: str = "",
    hours_back: int = 24,
) -> dict[str, Any]:
    """Check recent readings against alert thresholds. Returns breaches."""
    if not patient_id:
        return {"error": "patient_id is required"}

    cutoff = (datetime.now(UTC) - timedelta(hours=hours_back)).isoformat()
    recent = [
        r for r in _MOCK_READINGS
        if r["patient_id"] == patient_id and r["timestamp"] >= cutoff
    ]

    alerts = []
    for r in recent:
        mt = r["metric_type"]
        threshold = _ALERT_THRESHOLDS.get(mt)
        if not threshold:
            continue

        val = r.get("value")
        if not isinstance(val, int | float):
            continue

        low = threshold.get("low")
        high = threshold.get("high")

        if low is not None and val < low:
            alerts.append({
                "reading_id": r["reading_id"],
                "device_id": r["device_id"],
                "metric_type": mt,
                "value": val,
                "unit": threshold["unit"],
                "threshold_type": "low",
                "threshold_value": low,
                "severity": "critical" if mt in ("spo2", "glucose") else "warning",
                "timestamp": r["timestamp"],
            })
        elif high is not None and val > high:
            alerts.append({
                "reading_id": r["reading_id"],
                "device_id": r["device_id"],
                "metric_type": mt,
                "value": val,
                "unit": threshold["unit"],
                "threshold_type": "high",
                "threshold_value": high,
                "severity": "critical" if mt in ("glucose", "heart_rate") else "warning",
                "timestamp": r["timestamp"],
            })

    return {
        "patient_id": patient_id,
        "hours_back": hours_back,
        "alert_count": len(alerts),
        "alerts": alerts,
    }


@hipaa_tool(
    phi_level="limited",
    allowed_agents=_DEVICE_WRITE_AGENTS,
    server="device",
)
async def device_deregister(device_id: str = "") -> dict[str, Any]:
    """Remove a device from a patient (mark as inactive)."""
    if not device_id:
        return {"error": "device_id is required"}

    device = _MOCK_DEVICES.get(device_id)
    if not device:
        return {"error": f"Device {device_id} not found"}

    device["status"] = "inactive"
    device["deregistered_at"] = datetime.now(UTC).isoformat()

    logger.info("Deregistered device %s for patient %s", device_id, device["patient_id"])
    return {
        "device_id": device_id,
        "status": "inactive",
        "message": f"Device {device_id} ({device['device_name']}) deregistered successfully",
    }
