from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import secrets


def create_random_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def expires_in_minutes(minutes: int) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


def expires_in_hours(hours: int) -> datetime:
    return datetime.utcnow() + timedelta(hours=hours)
