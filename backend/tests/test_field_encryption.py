"""Tests for field-level encryption of SSN and sensitive identifiers."""

import base64

import pytest
from cryptography.fernet import InvalidToken

from medos.core.field_encryption import FieldEncryptor, _derive_key


@pytest.fixture
def encryptor():
    return FieldEncryptor(master_secret="test-secret-key-2026")


# --- Core round-trip ---


def test_encrypt_decrypt_roundtrip(encryptor: FieldEncryptor):
    original = "sensitive-data-123"
    encrypted = encryptor.encrypt_field(original, tenant_id="t-001")
    decrypted = encryptor.decrypt_field(encrypted, tenant_id="t-001")
    assert decrypted == original


def test_different_tenants_different_ciphertext(encryptor: FieldEncryptor):
    value = "same-value"
    enc_a = encryptor.encrypt_field(value, tenant_id="tenant-a")
    enc_b = encryptor.encrypt_field(value, tenant_id="tenant-b")
    assert enc_a != enc_b


def test_encrypted_value_not_contains_original(encryptor: FieldEncryptor):
    original = "123-45-6789"
    encrypted = encryptor.encrypt_field(original, tenant_id="t-001")
    assert original not in encrypted


# --- Typed helpers ---


def test_ssn_encryption(encryptor: FieldEncryptor):
    ssn = "123-45-6789"
    encrypted = encryptor.encrypt_ssn(ssn, tenant_id="t-001")
    assert encrypted.startswith("enc::")
    decrypted = encryptor.decrypt_ssn(encrypted, tenant_id="t-001")
    assert decrypted == ssn


def test_mrn_encryption(encryptor: FieldEncryptor):
    mrn = "MRN-2026-00042"
    encrypted = encryptor.encrypt_mrn(mrn, tenant_id="t-001")
    assert encrypted.startswith("enc::")
    decrypted = encryptor.decrypt_mrn(encrypted, tenant_id="t-001")
    assert decrypted == mrn


def test_dob_encryption(encryptor: FieldEncryptor):
    dob = "1990-03-15"
    encrypted = encryptor.encrypt_dob(dob, tenant_id="t-001")
    assert encrypted.startswith("enc::")
    decrypted = encryptor.decrypt_dob(encrypted, tenant_id="t-001")
    assert decrypted == dob


# --- Bulk patient PHI ---


def test_patient_phi_encrypt_decrypt(encryptor: FieldEncryptor):
    patient = {
        "id": "p-001",
        "name": "Jane Doe",
        "ssn": "999-88-7777",
        "mrn": "MRN-001",
        "dob": "1985-07-20",
        "address_line1": "123 Main St",
        "address_line2": "Apt 4B",
        "phone": "555-0100",
    }
    encrypted = encryptor.encrypt_patient_phi(patient, tenant_id="t-001")

    # Non-PHI fields unchanged
    assert encrypted["id"] == "p-001"
    assert encrypted["name"] == "Jane Doe"
    assert encrypted["phone"] == "555-0100"

    # PHI fields encrypted
    assert encrypted["ssn"].startswith("enc::")
    assert encrypted["mrn"].startswith("enc::")
    assert encrypted["dob"].startswith("enc::")
    assert encrypted["address_line1"].startswith("enc::")
    assert encrypted["address_line2"].startswith("enc::")

    # Round-trip
    decrypted = encryptor.decrypt_patient_phi(encrypted, tenant_id="t-001")
    assert decrypted["ssn"] == "999-88-7777"
    assert decrypted["mrn"] == "MRN-001"
    assert decrypted["dob"] == "1985-07-20"
    assert decrypted["address_line1"] == "123 Main St"
    assert decrypted["address_line2"] == "Apt 4B"


# --- Edge cases ---


def test_empty_value_handling(encryptor: FieldEncryptor):
    assert encryptor.encrypt_field("", tenant_id="t-001") == ""
    assert encryptor.decrypt_field("", tenant_id="t-001") == ""


def test_none_value_handling(encryptor: FieldEncryptor):
    assert encryptor.encrypt_field(None, tenant_id="t-001") is None  # type: ignore[arg-type]
    assert encryptor.decrypt_field(None, tenant_id="t-001") is None  # type: ignore[arg-type]


def test_invalid_ciphertext_raises(encryptor: FieldEncryptor):
    with pytest.raises(InvalidToken):
        encryptor.decrypt_field("enc::not-a-valid-token", tenant_id="t-001")


# --- Crypto properties ---


def test_encrypt_produces_base64(encryptor: FieldEncryptor):
    encrypted = encryptor.encrypt_field("test-value", tenant_id="t-001")
    # Strip the enc:: prefix and verify it's valid base64
    token = encrypted.removeprefix("enc::")
    decoded = base64.urlsafe_b64decode(token)
    assert len(decoded) > 0


def test_key_derivation_deterministic():
    key1 = _derive_key("tenant-x", "master-secret")
    key2 = _derive_key("tenant-x", "master-secret")
    assert key1 == key2

    # Different tenant => different key
    key3 = _derive_key("tenant-y", "master-secret")
    assert key1 != key3
