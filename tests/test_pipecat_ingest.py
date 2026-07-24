from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.db.base import Base
from app.models import Conversation, ConversationTurn, ProviderAccount, Workspace, WorkspaceIngestKey
from app.schemas.ingest import PipecatCallIngestRequest
from app.services.ingest_service import (
    create_ingest_key,
    ingest_pipecat_call,
    resolve_ingest_key,
    revoke_ingest_key,
)


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)()


def _payload(*, call_id: str = "pc-call-123", text: str = "I need to change my booking") -> PipecatCallIngestRequest:
    return PipecatCallIngestRequest(
        call_id=call_id,
        agent_id="hotel-concierge",
        agent_name="Hotel Concierge",
        display_name="Booking change",
        language="en",
        turns=[
            {"role": "caller", "text": text, "started_ms": 0, "ended_ms": 900},
            {"role": "bot", "text": "I can help with that.", "started_ms": 1000, "ended_ms": 1800},
        ],
    )


def test_ingest_key_is_hashed_and_can_be_revoked() -> None:
    db = _session()
    try:
        workspace = Workspace(name="Test workspace")
        db.add(workspace)
        db.commit()

        key, raw_key = create_ingest_key(db, workspace_id=workspace.id, name="Pipecat production")

        assert raw_key.startswith("ve_ing_")
        assert raw_key not in key.key_hash
        assert resolve_ingest_key(db, raw_key).id == key.id

        revoke_ingest_key(db, workspace_id=workspace.id, key_id=key.id)
        assert resolve_ingest_key(db, raw_key) is None
    finally:
        db.close()


def test_pipecat_ingest_upserts_call_and_replaces_turns() -> None:
    db = _session()
    try:
        workspace = Workspace(name="Test workspace")
        db.add(workspace)
        db.commit()

        first, created, evaluation_queued = ingest_pipecat_call(
            db, workspace_id=workspace.id, payload=_payload()
        )
        assert created is True
        assert evaluation_queued is False
        assert first.provider_conversation_id == "pc-call-123"

        second, created, _ = ingest_pipecat_call(
            db, workspace_id=workspace.id, payload=_payload(text="My booking has changed")
        )
        assert created is False
        assert second.id == first.id

        conversations = db.scalars(select(Conversation).where(Conversation.workspace_id == workspace.id)).all()
        turns = db.scalars(select(ConversationTurn).where(ConversationTurn.conversation_id == first.id).order_by(ConversationTurn.turn_order)).all()
        account = db.scalar(select(ProviderAccount).where(ProviderAccount.workspace_id == workspace.id))
        assert len(conversations) == 1
        assert account is not None and account.provider_name == "pipecat"
        assert [(turn.role, turn.text) for turn in turns] == [
            ("user", "My booking has changed"),
            ("assistant", "I can help with that."),
        ]
    finally:
        db.close()


def test_ingest_keys_are_workspace_scoped() -> None:
    db = _session()
    try:
        first_workspace = Workspace(name="First")
        second_workspace = Workspace(name="Second")
        db.add_all([first_workspace, second_workspace])
        db.commit()
        key, _ = create_ingest_key(db, workspace_id=first_workspace.id, name="First key")

        assert revoke_ingest_key(db, workspace_id=second_workspace.id, key_id=key.id) is None
        assert db.scalar(select(WorkspaceIngestKey).where(WorkspaceIngestKey.id == key.id)).revoked_at is None
    finally:
        db.close()
