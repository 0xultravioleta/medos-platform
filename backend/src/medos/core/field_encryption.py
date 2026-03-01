"""Field-level encryption for SSN and sensitive HIPAA identifiers.

Implements per-tenant Fernet symmetric encryption using PBKDF2 key
derivation. Each tenant gets a unique encryption key derived from the
master secret + tenant_id, ensuring cross-tenant data isolation.

Encrypted fields are stored as base64-encoded Fernet tokens that can
safely be persisted in PostgreSQL JSONB columns alongside plaintext
non-PHI data.

Production: MEDOS_ENCRYPTION_KEY sourced from AWS Secrets Manager.
Development: Falls back to a dev-only default (NOT for production use).
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os
import re
from typing import Any

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

# PHI fields that require encryption
_PHI_FIELDS = frozenset({"ssn", "mrn", "dob", "address_line1", "address_line2"})

# Prefix so we can detect already-encrypted values
_ENCRYPTED_PREFIX = "enc::"

_MASTER_SECRET: str | None = None


def _get_master_secret() -> str:
    """Retrieve the master encryption key from environment or default."""
    global _MASTER_SECRET  # noqa: PLW0603
    if _MASTER_SECRET is None:
        _MASTER_SECRET = os.environ.get(
            "MEDOS_ENCRYPTION_KEY",
            "medos-dev-encryption-key-2026",
        )
    return _MASTER_SECRET


def reset_master_secret() -> None:
    """Reset cached master secret (for testing)."""
    global _MASTER_SECRET  # noqa: PLW0603
    _MASTER_SECRET = None


def _derive_key(tenant_id: str, master_secret: str) -> bytes:
    """Derive a tenant-specific Fernet key using PBKDF2.

    Uses tenant_id as salt so each tenant gets a unique key from the
    same master secret.
    """
    salt = hashlib.sha256(tenant_id.encode()).digest()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480_000,
    )
    raw_key = kdf.derive(master_secret.encode())
    return base64.urlsafe_b64encode(raw_key)


class FieldEncryptor:
    """Encrypts and decrypts individual field values with per-tenant keys.

    Usage::

        enc = FieldEncryptor()
        cipher = enc.encrypt_field("123-45-6789", tenant_id="t-001")
        plain  = enc.decrypt_field(cipher, tenant_id="t-001")
    """

    def __init__(self, master_secret: str | None = None) -> None:
        self._master_secret = master_secret or _get_master_secret()
        self._fernet_cache: dict[str, Fernet] = {}

    def _get_fernet(self, tenant_id: str) -> Fernet:
        """Get or create a cached Fernet instance for a tenant."""
        if tenant_id not in self._fernet_cache:
            key = _derive_key(tenant_id, self._master_secret)
            self._fernet_cache[tenant_id] = Fernet(key)
        return self._fernet_cache[tenant_id]

    # --- Core encrypt / decrypt ---

    def encrypt_field(self, value: str, tenant_id: str) -> str:
        """Encrypt a single field value.

        Returns a base64-encoded Fernet token prefixed with ``enc::``.
        Empty strings and None are returned unchanged.
        """
        if not value:
            return value  # type: ignore[return-value]
        fernet = self._get_fernet(tenant_id)
        token = fernet.encrypt(value.encode())
        return _ENCRYPTED_PREFIX + token.decode()

    def decrypt_field(self, encrypted_value: str, tenant_id: str) -> str:
        """Decrypt a single field value.

        Raises ``cryptography.fernet.InvalidToken`` on bad ciphertext.
        """
        if not encrypted_value:
            return encrypted_value
        raw = encrypted_value
        if raw.startswith(_ENCRYPTED_PREFIX):
            raw = raw[len(_ENCRYPTED_PREFIX):]
        fernet = self._get_fernet(tenant_id)
        return fernet.decrypt(raw.encode()).decode()

    # --- Typed helpers ---

    def encrypt_ssn(self, ssn: str, tenant_id: str) -> str:
        """Encrypt a Social Security Number (format: XXX-XX-XXXX)."""
        if ssn and not re.match(r"^\d{3}-\d{2}-\d{4}$", ssn):
            logger.warning("SSN does not match expected format XXX-XX-XXXX")
        return self.encrypt_field(ssn, tenant_id)

    def decrypt_ssn(self, encrypted_ssn: str, tenant_id: str) -> str:
        """Decrypt a Social Security Number."""
        return self.decrypt_field(encrypted_ssn, tenant_id)

    def encrypt_mrn(self, mrn: str, tenant_id: str) -> str:
        """Encrypt a Medical Record Number."""
        return self.encrypt_field(mrn, tenant_id)

    def decrypt_mrn(self, encrypted_mrn: str, tenant_id: str) -> str:
        """Decrypt a Medical Record Number."""
        return self.decrypt_field(encrypted_mrn, tenant_id)

    def encrypt_dob(self, dob: str, tenant_id: str) -> str:
        """Encrypt a date of birth string."""
        return self.encrypt_field(dob, tenant_id)

    def decrypt_dob(self, encrypted_dob: str, tenant_id: str) -> str:
        """Decrypt a date of birth string."""
        return self.decrypt_field(encrypted_dob, tenant_id)

    # --- Bulk patient PHI ---

    def encrypt_patient_phi(
        self,
        patient: dict[str, Any],
        tenant_id: str,
    ) -> dict[str, Any]:
        """Encrypt all sensitive PHI fields in a patient dict.

        Non-PHI fields are passed through unchanged. Already-encrypted
        values (prefixed with ``enc::``) are skipped.
        """
        result = dict(patient)
        for key in _PHI_FIELDS:
            val = result.get(key)
            if val is None or (isinstance(val, str) and val.startswith(_ENCRYPTED_PREFIX)):
                continue
            if isinstance(val, str):
                result[key] = self.encrypt_field(val, tenant_id)
        return result

    def decrypt_patient_phi(
        self,
        patient: dict[str, Any],
        tenant_id: str,
    ) -> dict[str, Any]:
        """Decrypt all encrypted PHI fields in a patient dict."""
        result = dict(patient)
        for key in _PHI_FIELDS:
            val = result.get(key)
            if val is None or not isinstance(val, str):
                continue
            if val.startswith(_ENCRYPTED_PREFIX):
                result[key] = self.decrypt_field(val, tenant_id)
        return result


# Module-level convenience instance
field_encryptor = FieldEncryptor()
