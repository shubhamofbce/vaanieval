from __future__ import annotations

from dataclasses import dataclass
from datetime import timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.auth import AuthSession, MagicLinkToken
from app.models.user import Membership, User, Workspace
from app.services.security import (
    create_random_token,
    expires_in_hours,
    expires_in_minutes,
    hash_token,
    utc_now,
)


@dataclass
class VerifiedSession:
    session_token: str
    user: User
    workspace: Workspace


def request_magic_link(db: Session, email: str) -> str:
    settings = get_settings()

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

    token = create_random_token()
    token_row = MagicLinkToken(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=expires_in_minutes(settings.magic_link_token_ttl_minutes),
    )
    db.add(token_row)
    db.commit()

    # In production, send token using email provider.
    return token


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
        expires_at=expires_in_hours(settings.session_ttl_hours),
    )

    token_row.consumed_at = now
    db.add(session_row)
    db.commit()

    return VerifiedSession(session_token=session_token, user=user, workspace=workspace)


def revoke_session(db: Session, raw_session_token: str) -> None:
    token_hash = hash_token(raw_session_token)
    session_row = db.scalar(select(AuthSession).where(AuthSession.session_token_hash == token_hash))
    if not session_row:
        return

    session_row.revoked_at = utc_now()
    db.commit()
