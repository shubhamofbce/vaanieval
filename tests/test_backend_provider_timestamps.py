from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.db.base import Base
from app.models import Conversation, ProviderAccount, Workspace
from app.models.job_queue import JobQueue, JobStatus
from app.providers.base import ProviderConversationDetail
from app.providers.bolna_adapter import BolnaProviderAdapter
from app.providers.elevenlabs_adapter import ElevenLabsProviderAdapter
from app.providers.vapi_adapter import VapiProviderAdapter
from app.services.import_service import (
    BACKFILL_CONVERSATION_DISPLAY_NAME,
    enqueue_conversation_display_name_backfill,
    run_backfill_conversation_timestamp,
)


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


def test_elevenlabs_normalize_uses_provider_call_summary_title() -> None:
    adapter = ElevenLabsProviderAdapter.__new__(ElevenLabsProviderAdapter)

    normalized = adapter.normalize_conversation_detail(
        {
            "agent_id": "agent-1",
            "analysis": {"call_summary_title": "  Hotel   Reservation  "},
            "transcript": [],
        }
    )

    assert normalized.display_name == "Hotel Reservation"


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


def test_vapi_normalize_prefers_call_name_then_analysis_summary() -> None:
    adapter = VapiProviderAdapter.__new__(VapiProviderAdapter)

    named = adapter.normalize_conversation_detail(
        {"name": "Appointment confirmation", "artifact": {"messages": []}}
    )
    summarized = adapter.normalize_conversation_detail(
        {"name": "", "analysis": {"summary": "Appointment was confirmed."}, "artifact": {"messages": []}}
    )

    assert named.display_name == "Appointment confirmation"
    assert summarized.display_name == "Appointment was confirmed."


def test_provider_display_name_is_whitespace_normalized_and_bounded() -> None:
    adapter = VapiProviderAdapter.__new__(VapiProviderAdapter)
    long_name = "  ".join(["appointment"] * 30)

    normalized = adapter.normalize_conversation_detail(
        {"name": long_name, "artifact": {"messages": []}}
    )

    assert normalized.display_name is not None
    assert len(normalized.display_name) <= 160
    assert normalized.display_name.endswith("…")


def test_bolna_normalize_uses_explicit_title_or_summary_extracted_data() -> None:
    adapter = BolnaProviderAdapter.__new__(BolnaProviderAdapter)

    explicit = adapter.normalize_conversation_detail({"title": "Follow-up call", "transcript": ""})
    extracted = adapter.normalize_conversation_detail(
        {
            "transcript": "",
            "extracted_data": {
                "General": {"Call Summary": {"subjective": "Customer confirmed Friday."}}
            },
        }
    )

    assert explicit.display_name == "Follow-up call"
    assert extracted.display_name == "Customer confirmed Friday."


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
            def get_conversation_detail(self, conversation_id: str, *, agent_id: str | None = None) -> dict:
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


def test_enqueue_display_name_backfill_queues_job_for_conversation_without_name() -> None:
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

        enqueue_conversation_display_name_backfill(db, conversation_id=conversation.id)
        db.commit()

        jobs = db.query(JobQueue).filter(JobQueue.type == BACKFILL_CONVERSATION_DISPLAY_NAME).all()
        assert len(jobs) == 1
        assert conversation.id in jobs[0].payload_json
        assert jobs[0].status == JobStatus.PENDING.value
    finally:
        db.close()


def test_enqueue_display_name_backfill_does_not_duplicate_pending_job() -> None:
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

        enqueue_conversation_display_name_backfill(db, conversation_id=conversation.id)
        enqueue_conversation_display_name_backfill(db, conversation_id=conversation.id)
        db.commit()

        jobs = db.query(JobQueue).filter(JobQueue.type == BACKFILL_CONVERSATION_DISPLAY_NAME).all()
        assert len(jobs) == 1
    finally:
        db.close()
