from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import secrets


def create_random_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def expires_in_minutes(minutes: int) -> datetime:
    return utc_now() + timedelta(minutes=minutes)


def expires_in_hours(hours: int) -> datetime:
    return utc_now() + timedelta(hours=hours)
