"""Tests for Device/Wearable MCP Server tools."""

import pytest

from medos.mcp.servers.device_server import (
    device_batch_ingest,
    device_check_alerts,
    device_deregister,
    device_get_readings,
    device_get_summary,
    device_ingest_reading,
    device_list,
    device_register,
)


# ---------------------------------------------------------------------------
# device_register
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_register_success():
    result = await device_register(
        patient_id="p-099",
        device_type="withings_bpm",
        device_name="Withings BPM Connect",
        manufacturer="Withings",
        model="BPM Connect",
    )
    assert result["patient_id"] == "p-099"
    assert result["device_type"] == "withings_bpm"
    assert result["status"] == "active"
    assert result["device_id"].startswith("dev-")


@pytest.mark.asyncio
async def test_device_register_duplicate():
    result = await device_register(
        patient_id="p-001",
        device_type="oura_ring_gen4",
        device_name="Duplicate Oura",
        manufacturer="Oura Health",
        model="Gen 4",
    )
    assert "error" in result
    assert "already registered" in result["error"]


# ---------------------------------------------------------------------------
# device_list
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_list_with_devices():
    result = await device_list(patient_id="p-001")
    assert result["device_count"] >= 2
    assert len(result["devices"]) >= 2
    device_ids = [d["device_id"] for d in result["devices"]]
    assert "dev-001" in device_ids
    assert "dev-002" in device_ids


@pytest.mark.asyncio
async def test_device_list_empty():
    result = await device_list(patient_id="p-nonexistent")
    assert result["device_count"] == 0
    assert result["devices"] == []


# ---------------------------------------------------------------------------
# device_ingest_reading
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_ingest_reading():
    result = await device_ingest_reading(
        device_id="dev-001",
        metric_type="heart_rate",
        value=65.0,
        unit="bpm",
        timestamp="2026-02-28T10:00:00Z",
    )
    assert result["reading_id"].startswith("r-")
    assert result["metric_type"] == "heart_rate"
    assert result["value"] == 65.0
    assert result["loinc_code"] == "8867-4"


# ---------------------------------------------------------------------------
# device_batch_ingest
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_batch_ingest():
    readings = [
        {"metric_type": "heart_rate", "value": 70, "unit": "bpm", "timestamp": "2026-02-28T11:00:00Z"},
        {"metric_type": "spo2", "value": 97, "unit": "%", "timestamp": "2026-02-28T11:00:00Z"},
        {"metric_type": "hrv", "value": 45, "unit": "ms", "timestamp": "2026-02-28T11:00:00Z"},
    ]
    result = await device_batch_ingest(device_id="dev-002", readings=readings)
    assert result["ingested_count"] == 3
    assert len(result["reading_ids"]) == 3


# ---------------------------------------------------------------------------
# device_get_readings
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_get_readings_all():
    result = await device_get_readings(patient_id="p-001", limit=100)
    assert result["reading_count"] > 0
    assert all(r["patient_id"] == "p-001" for r in result["readings"])


@pytest.mark.asyncio
async def test_device_get_readings_filtered():
    result = await device_get_readings(
        patient_id="p-002",
        metric_type="glucose",
        limit=10,
    )
    assert result["reading_count"] > 0
    assert all(r["metric_type"] == "glucose" for r in result["readings"])


# ---------------------------------------------------------------------------
# device_get_summary
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_get_summary_daily():
    result = await device_get_summary(
        patient_id="p-001",
        period="daily",
        metric_type="heart_rate",
    )
    assert result["period"] == "daily"
    assert result["summary_count"] > 0
    for s in result["summaries"]:
        assert "min" in s
        assert "max" in s
        assert "avg" in s
        assert s["metric_type"] == "heart_rate"


# ---------------------------------------------------------------------------
# device_check_alerts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_check_alerts_none():
    # Normal readings should mostly not trigger alerts
    result = await device_check_alerts(patient_id="p-001", hours_back=1)
    assert "alert_count" in result
    assert isinstance(result["alerts"], list)


@pytest.mark.asyncio
async def test_device_check_alerts_triggered():
    # Ingest a reading that breaches the threshold
    await device_ingest_reading(
        device_id="dev-003",
        metric_type="glucose",
        value=200.0,
        unit="mg/dL",
    )
    result = await device_check_alerts(patient_id="p-002", hours_back=1)
    assert result["alert_count"] >= 1
    glucose_alerts = [a for a in result["alerts"] if a["metric_type"] == "glucose"]
    assert len(glucose_alerts) >= 1
    assert glucose_alerts[0]["threshold_type"] == "high"
    assert glucose_alerts[0]["severity"] == "critical"


# ---------------------------------------------------------------------------
# device_deregister
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_device_deregister():
    # Register a throwaway device then deregister it
    reg = await device_register(
        patient_id="p-010",
        device_type="test_device_dereg",
        device_name="Test Deregister",
        manufacturer="Test",
        model="v1",
    )
    device_id = reg["device_id"]

    result = await device_deregister(device_id=device_id)
    assert result["status"] == "inactive"
    assert "deregistered successfully" in result["message"]
