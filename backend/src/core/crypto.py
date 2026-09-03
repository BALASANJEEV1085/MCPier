"""Fernet symmetric encryption for API keys stored at rest."""
from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from src.core.config import settings


def _get_fernet() -> Fernet:
    """Derive a 32-byte Fernet key from SECRET_KEY using SHA-256."""
    raw = settings.SECRET_KEY.encode()
    key_bytes = hashlib.sha256(raw).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string → URL-safe base64 ciphertext."""
    if not plaintext:
        return ""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt ciphertext back to plaintext."""
    if not ciphertext:
        return ""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def mask(plaintext: str | None) -> str:
    """Return a masked representation safe to expose in API responses."""
    if not plaintext:
        return ""
    visible = min(7, len(plaintext) // 3)
    return plaintext[:visible] + "••••••••" + plaintext[-4:] if len(plaintext) > visible + 4 else "••••••••"
