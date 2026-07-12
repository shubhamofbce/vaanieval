from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.db.base import Base
from app.models import Conversation, ProviderAccount, Workspace
from app.providers.base import ProviderConversationDetail
from app.providers.elevenlabs_adapter import ElevenLabsProviderAdapter
from app.providers.vapi_adapter import VapiProviderAdapter
from app.services.import_service import run_backfill_conversation_timestamp


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)()


def test_elevenlabs_normalize_uses_metadata_conversation_time() -> None:
    adapter = ElevenLabsProviderAdapter.__new__(ElevenLabsProviderAdapter)
    detail = {
        "agent_id": "agent-1",
        "metadata": {
            "start_time_unix_secs": 1_799_999_200,
            "call_duration_secs": 90,
        },
        "transcript": [],
    }

    normalized = adapter.normalize_conversation_detail(detail)

    assert normalized.started_at is not None
    assert normalized.started_at.tzinfo == timezone.utc
    assert int(normalized.started_at.timestamp()) == 1_799_999_200
    assert normalized.ended_at is not None
    assert int(normalized.ended_at.timestamp()) == 1_799_999_290


def test_elevenlabs_normalize_falls_back_to_iso_conversation_time() -> None:
    adapter = ElevenLabsProviderAdapter.__new__(ElevenLabsProviderAdapter)
    detail = {
        "agent_id": "agent-1",
        "start_time": "2026-07-10T03:05:02.767Z",
        "end_time": "2026-07-10T03:06:02.767Z",
        "transcript": [],
    }

    normalized = adapter.normalize_conversation_detail(detail)

    assert normalized.started_at is not None
    assert normalized.started_at.isoformat() == "2026-07-10T03:05:02.767000+00:00"
    assert normalized.ended_at is not None
    assert normalized.ended_at.isoformat() == "2026-07-10T03:06:02.767000+00:00"


def test_vapi_normalize_falls_back_to_created_at_when_started_at_is_missing() -> None:
    adapter = VapiProviderAdapter.__new__(VapiProviderAdapter)
    detail = {
        "assistantId": "assistant-1",
        "createdAt": "2026-07-10T03:05:02.767Z",
        "status": "ended",
        "artifact": {"messages": []},
    }

    normalized = adapter.normalize_conversation_detail(detail)

    assert normalized.started_at is not None
    assert normalized.started_at.isoformat() == "2026-07-10T03:05:02.767000+00:00"


def test_backfill_conversation_timestamp_updates_missing_started_at(monkeypatch) -> None:
    db = _session()

    try:
        workspace = Workspace(name="Test workspace")
        db.add(workspace)
        db.flush()
        account = ProviderAccount(
            workspace_id=workspace.id,
            provider_name="vapi",
            api_key="encrypted",
        )
        db.add(account)
        db.flush()
        conversation = Conversation(
            workspace_id=workspace.id,
            provider_account_id=account.id,
            provider_conversation_id="call-1",
        )
        db.add(conversation)
        db.commit()

        class FakeAdapter:
            def get_conversation_detail(self, conversation_id: str) -> dict:
                assert conversation_id == "call-1"
                return {"id": conversation_id}

            def normalize_conversation_detail(self, detail: dict) -> ProviderConversationDetail:
                return ProviderConversationDetail(
                    provider_agent_id=None,
                    language=None,
                    outcome=None,
                    started_at=datetime(2026, 7, 10, 3, 5, 2, tzinfo=timezone.utc),
                    ended_at=datetime(2026, 7, 10, 3, 6, 2, tzinfo=timezone.utc),
                    turns=[],
                    audio_url=None,
                )

        monkeypatch.setattr("app.services.import_service.decrypt_secret", lambda value: value)
        monkeypatch.setattr(
            "app.services.import_service.get_provider_adapter",
            lambda provider_name, api_key: FakeAdapter(),
        )

        run_backfill_conversation_timestamp(db, {"conversation_id": conversation.id})
        db.commit()
        db.refresh(conversation)

        assert conversation.started_at is not None
        assert conversation.started_at.isoformat() == "2026-07-10T03:05:02"
        assert conversation.ended_at is not None
        assert conversation.ended_at.isoformat() == "2026-07-10T03:06:02"
    finally:
        db.close()
