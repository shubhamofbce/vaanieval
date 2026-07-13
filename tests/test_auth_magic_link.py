from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings
from app.db.base import Base
from app.models import MagicLinkToken, User
from app.services.email_service import EmailDeliveryError, build_magic_link
from app.services.auth_service import request_magic_link


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)()


def test_magic_link_dev_autoprovisions_and_returns_token(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "dev")
    get_settings.cache_clear()
    db = _session()

    try:
        result = request_magic_link(db, "new@example.com")

        assert result.token
        assert result.sent is True
        assert db.scalar(select(User).where(User.email == "new@example.com")) is not None
        assert db.scalar(select(MagicLinkToken)) is not None
    finally:
        db.close()
        get_settings.cache_clear()


def test_magic_link_production_autoprovisions_and_sends_email(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("FRONTEND_APP_URL", "https://app.vaanieval.com")
    sent: list[tuple[str, str]] = []

    def fake_send(settings, recipient: str, token: str) -> None:
        assert settings.frontend_app_url == "https://app.vaanieval.com"
        sent.append((recipient, token))

    monkeypatch.setattr("app.services.auth_service.send_magic_link_email", fake_send)
    get_settings.cache_clear()
    db = _session()

    try:
        result = request_magic_link(db, "unknown@example.com")

        assert result.token is None
        assert result.sent is True
        user = db.scalar(select(User).where(User.email == "unknown@example.com"))
        assert user is not None
        assert db.scalar(select(MagicLinkToken).where(MagicLinkToken.user_id == user.id)) is not None
        assert len(sent) == 1
        assert sent[0][0] == "unknown@example.com"
        assert sent[0][1]
    finally:
        db.close()
        get_settings.cache_clear()


def test_magic_link_email_uses_product_app_url(monkeypatch) -> None:
    monkeypatch.setenv("FRONTEND_APP_URL", "https://app.vaanieval.com/")
    get_settings.cache_clear()

    try:
        assert (
            build_magic_link(get_settings(), "sample token")
            == "https://app.vaanieval.com/login?token=sample+token"
        )
    finally:
        get_settings.cache_clear()


def test_magic_link_production_never_exposes_raw_token_for_existing_user(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    sent: list[tuple[str, str]] = []

    def fake_send(_settings, recipient: str, token: str) -> None:
        sent.append((recipient, token))

    monkeypatch.setattr("app.services.auth_service.send_magic_link_email", fake_send)
    get_settings.cache_clear()
    db = _session()

    try:
        user = User(email="existing@example.com")
        db.add(user)
        db.commit()

        result = request_magic_link(db, "existing@example.com")

        assert result.token is None
        assert result.sent is True
        assert db.scalar(select(MagicLinkToken).where(MagicLinkToken.user_id == user.id)) is not None
        assert len(sent) == 1
        assert sent[0][0] == "existing@example.com"
        assert sent[0][1]
    finally:
        db.close()
        get_settings.cache_clear()


def test_magic_link_production_rolls_back_when_email_delivery_fails(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")

    def fake_send(_settings, _recipient: str, _token: str) -> None:
        raise EmailDeliveryError("not configured")

    monkeypatch.setattr("app.services.auth_service.send_magic_link_email", fake_send)
    get_settings.cache_clear()
    db = _session()

    try:
        try:
            request_magic_link(db, "failed@example.com")
        except EmailDeliveryError:
            pass
        else:
            raise AssertionError("Expected EmailDeliveryError")

        assert db.scalar(select(User).where(User.email == "failed@example.com")) is None
        assert db.scalar(select(MagicLinkToken)) is None
    finally:
        db.close()
        get_settings.cache_clear()
