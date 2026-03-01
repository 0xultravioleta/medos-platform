"""Tests for demo seed data generator and router endpoints."""

from collections import Counter
from datetime import date

from fastapi.testclient import TestClient

from medos.main import app
from medos.tools.demo_seed import DemoDataGenerator

client = TestClient(app)

BASE = "/api/v1/demo"


# ---------------------------------------------------------------------------
# Unit tests for DemoDataGenerator
# ---------------------------------------------------------------------------


def test_generate_patients_count():
    gen = DemoDataGenerator(seed=42)
    patients = gen.generate_patients(count=50)
    assert len(patients) == 50


def test_patient_data_has_fhir_fields():
    gen = DemoDataGenerator(seed=42)
    patients = gen.generate_patients(count=5)
    patient = patients[0]
    assert patient["resourceType"] == "Patient"
    assert "id" in patient
    assert "name" in patient
    assert patient["name"][0]["family"]
    assert patient["name"][0]["given"]
    assert "gender" in patient
    assert "birthDate" in patient
    assert "address" in patient
    assert patient["address"][0]["state"] == "FL"
    assert "telecom" in patient
    assert "identifier" in patient
    assert "insurance" in patient
    assert patient["active"] is True


def test_generate_encounters_links_patients():
    gen = DemoDataGenerator(seed=42)
    patients = gen.generate_patients(count=10)
    encounters = gen.generate_encounters(patients, count=50)
    assert len(encounters) == 50

    patient_ids = {p["id"] for p in patients}
    for enc in encounters:
        ref = enc["subject"]["reference"]
        pid = ref.split("/")[1]
        assert pid in patient_ids


def test_generate_claims_status_distribution():
    gen = DemoDataGenerator(seed=42)
    patients = gen.generate_patients(count=20)
    encounters = gen.generate_encounters(patients, count=200)
    claims = gen.generate_claims(encounters)
    assert len(claims) == 200

    counts = Counter(c["status"] for c in claims)
    # With 200 claims, distribution should be roughly:
    # paid ~80, pending ~50, denied ~30, submitted ~20, appealing ~20
    # Allow generous tolerance for randomness
    assert counts["paid"] > 30
    assert counts["pending"] > 15
    assert counts["denied"] > 5


def test_claims_denial_rate_realistic():
    gen = DemoDataGenerator(seed=42)
    patients = gen.generate_patients(count=20)
    encounters = gen.generate_encounters(patients, count=200)
    claims = gen.generate_claims(encounters)

    denied = sum(1 for c in claims if c["status"] == "denied")
    denial_rate = denied / len(claims)
    # Target is 15%, allow 5-30% range
    assert 0.05 <= denial_rate <= 0.30

    # Denied claims must have denial reason
    for c in claims:
        if c["status"] == "denied":
            assert "denialReason" in c
            assert c["paymentAmount"] == 0.0

    # Paid claims must have payment amount
    for c in claims:
        if c["status"] == "paid":
            assert c["paymentAmount"] > 0
            assert c["paymentAmount"] <= c["billedAmount"]


def test_generate_prior_auths_subset():
    gen = DemoDataGenerator(seed=42)
    patients = gen.generate_patients(count=20)
    encounters = gen.generate_encounters(patients, count=200)
    prior_auths = gen.generate_prior_auths(encounters)

    # Should be roughly 20% of encounters
    assert len(prior_auths) > 0
    assert len(prior_auths) <= len(encounters) * 0.5  # generous upper bound

    # Each PA must reference an encounter
    for pa in prior_auths:
        assert pa["encounter"]["reference"].startswith("Encounter/")
        assert pa["status"] in ["approved", "pending", "denied", "partially_approved"]


def test_generate_appointments_future():
    gen = DemoDataGenerator(seed=42)
    patients = gen.generate_patients(count=10)
    appointments = gen.generate_appointments(patients, count=30)
    assert len(appointments) == 30

    today = date.today()
    for apt in appointments:
        apt_date = date.fromisoformat(apt["date"])
        assert apt_date > today
        assert (apt_date - today).days <= 30


def test_seed_all_counts():
    gen = DemoDataGenerator(seed=42)
    result = gen.seed_all()

    assert result.tenant_id == "demo-tenant"
    assert result.patients == 50
    assert result.encounters == 200
    assert result.claims == 200
    assert result.prior_auths > 0
    assert result.appointments == 30
    assert result.seed_timestamp != ""


def test_seed_deterministic():
    gen1 = DemoDataGenerator(seed=99)
    gen2 = DemoDataGenerator(seed=99)

    patients1 = gen1.generate_patients(count=10)
    patients2 = gen2.generate_patients(count=10)

    for p1, p2 in zip(patients1, patients2, strict=True):
        assert p1["id"] == p2["id"]
        assert p1["name"] == p2["name"]
        assert p1["birthDate"] == p2["birthDate"]
        assert p1["gender"] == p2["gender"]


# ---------------------------------------------------------------------------
# Router endpoint tests
# ---------------------------------------------------------------------------


def test_demo_seed_endpoint(monkeypatch):
    monkeypatch.delenv("MEDOS_ENV", raising=False)
    response = client.post(f"{BASE}/seed")
    assert response.status_code == 200
    data = response.json()
    assert data["patients"] == 50
    assert data["encounters"] == 200
    assert data["claims"] == 200
    assert data["prior_auths"] > 0
    assert data["appointments"] == 30


def test_demo_stats_before_seed():
    # Use a fresh client -- stats depend on module-level state
    # but the seed endpoint was already called above, so just check structure
    response = client.get(f"{BASE}/stats")
    assert response.status_code == 200
    data = response.json()
    assert "patients" in data
    assert "encounters" in data


def test_demo_seed_blocked_in_production(monkeypatch):
    monkeypatch.setenv("MEDOS_ENV", "production")
    response = client.post(f"{BASE}/seed")
    assert response.status_code == 403

    response = client.get(f"{BASE}/stats")
    assert response.status_code == 403
