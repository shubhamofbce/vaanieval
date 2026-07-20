from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.auth import AuthSession, MagicLinkToken
from app.models.user import Membership, User, Workspace
from app.services.email_service import EmailDeliveryError, send_magic_link_email
from app.services.security import (
    create_random_token,
    expires_in_hours,
    expires_in_minutes,
    hash_token,
    utc_now,
)

logger = logging.getLogger(__name__)


@dataclass
class VerifiedSession:
    session_token: str
    user: User
    workspace: Workspace
    session_expires_at: datetime


@dataclass
class MagicLinkRequestResult:
    token: str | None = None
    sent: bool = False


def _get_or_create_user_workspace(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email)
        db.add(user)
        db.flush()

        workspace = Workspace(name=f"{email}-workspace")
        db.add(workspace)
        db.flush()

        membership = Membership(user_id=user.id, workspace_id=workspace.id, role="owner")
        db.add(membership)

    return user


def request_magic_link(db: Session, email: str) -> MagicLinkRequestResult:
    settings = get_settings()
    user = _get_or_create_user_workspace(db, email)

    token = create_random_token()
    token_row = MagicLinkToken(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=expires_in_minutes(settings.magic_link_token_ttl_minutes),
    )
    db.add(token_row)

    if settings.is_production:
        try:
            send_magic_link_email(settings, email, token)
        except EmailDeliveryError:
            db.rollback()
            logger.exception("Production magic-link email delivery failed")
            raise
        db.commit()
        return MagicLinkRequestResult(sent=True)

    db.commit()
    return MagicLinkRequestResult(token=token, sent=True)


def verify_magic_link(db: Session, token: str) -> VerifiedSession | None:
    settings = get_settings()
    token_hash = hash_token(token)

    token_row = db.scalar(select(MagicLinkToken).where(MagicLinkToken.token_hash == token_hash))
    now = utc_now()
    if not token_row or token_row.consumed_at is not None:
        return None
    expires_at = token_row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        return None

    user = db.scalar(select(User).where(User.id == token_row.user_id))
    if not user:
        return None

    membership = db.scalar(select(Membership).where(Membership.user_id == user.id))
    if not membership:
        return None

    workspace = db.scalar(select(Workspace).where(Workspace.id == membership.workspace_id))
    if not workspace:
        return None

    session_token = create_random_token()
    session_row = AuthSession(
        user_id=user.id,
        session_token_hash=hash_token(session_token),
        expires_at=expires_in_hours(settings.session_ttl_days * 24),
    )

    token_row.consumed_at = now
    db.add(session_row)
    db.commit()

    return VerifiedSession(
        session_token=session_token,
        user=user,
        workspace=workspace,
        session_expires_at=session_row.expires_at,
    )


def revoke_session(db: Session, raw_session_token: str) -> None:
    token_hash = hash_token(raw_session_token)
    session_row = db.scalar(select(AuthSession).where(AuthSession.session_token_hash == token_hash))
    if not session_row:
        return

    session_row.revoked_at = utc_now()
    db.commit()
