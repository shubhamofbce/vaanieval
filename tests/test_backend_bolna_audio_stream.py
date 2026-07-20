from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.api.v1 import media
from app.db.base import Base
from app.models import Conversation, ProviderAccount, Workspace
from app.models.conversation import AudioAsset


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)()


def _seed_bolna_conversation(db: Session, *, with_audio_asset: bool) -> Conversation:
    workspace = Workspace(name="ws")
    db.add(workspace)
    db.flush()

    provider_account = ProviderAccount(workspace_id=workspace.id, provider_name="bolna", api_key="encrypted")
    db.add(provider_account)
    db.flush()

    conversation = Conversation(
        workspace_id=workspace.id,
        provider_account_id=provider_account.id,
        provider_conversation_id="exec-1",
    )
    db.add(conversation)
    db.flush()

    if with_audio_asset:
        db.add(
            AudioAsset(
                conversation_id=conversation.id,
                source_url="https://bolna.example/recording.wav",
                mime_type="audio/mpeg",
            )
        )
        db.flush()

    db.commit()
    return conversation


def test_bolna_audio_metadata_never_exposes_raw_recording_url() -> None:
    db = _session()
    conversation = _seed_bolna_conversation(db, with_audio_asset=True)

    result = media.get_audio_metadata(conversation.id, workspace_id=conversation.workspace_id, db=db)

    assert result.source_url == f"/api/v1/media/conversations/{conversation.id}/audio/stream"


def test_bolna_audio_stream_proxies_authenticated_bytes(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    db = _session()
    conversation = _seed_bolna_conversation(db, with_audio_asset=True)

    monkeypatch.setattr(media.tempfile, "gettempdir", lambda: str(tmp_path))
    monkeypatch.setattr(media, "decrypt_secret", lambda value: "plain-key")

    class _FakeAdapter:
        def get_conversation_audio_bytes(
            self,
            conversation_id: str,
            *,
            agent_id: str | None = None,
        ) -> bytes:
            assert conversation_id == "exec-1"
            assert agent_id is None
            return b"audio-bytes"

    monkeypatch.setattr(media, "get_provider_adapter", lambda **kwargs: _FakeAdapter())

    response = media.stream_audio(conversation.id, workspace_id=conversation.workspace_id, db=db)

    cached_path = tmp_path / "vaanieval_audio_cache" / f"{conversation.id}.mp3"
    assert cached_path.exists()
    assert cached_path.read_bytes() == b"audio-bytes"
    assert response.media_type == "audio/mpeg"


def test_elevenlabs_audio_stream_uses_authenticated_endpoint_without_a_source_url(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    db = _session()
    conversation = _seed_bolna_conversation(db, with_audio_asset=True)
    account = db.get(ProviderAccount, conversation.provider_account_id)
    assert account
    account.provider_name = "elevenlabs"
    db.flush()

    audio = db.scalar(select(AudioAsset).where(AudioAsset.conversation_id == conversation.id))
    assert audio
    audio.source_url = None
    db.commit()

    monkeypatch.setattr(media.tempfile, "gettempdir", lambda: str(tmp_path))
    monkeypatch.setattr(media, "decrypt_secret", lambda value: "plain-key")

    class _FakeAdapter:
        def get_conversation_audio_bytes(
            self,
            conversation_id: str,
            *,
            agent_id: str | None = None,
        ) -> bytes:
            assert conversation_id == "exec-1"
            return b"elevenlabs-audio"

    monkeypatch.setattr(media, "get_provider_adapter", lambda **kwargs: _FakeAdapter())

    response = media.stream_audio(conversation.id, workspace_id=conversation.workspace_id, db=db)

    cached_path = tmp_path / "vaanieval_audio_cache" / f"{conversation.id}.mp3"
    assert cached_path.read_bytes() == b"elevenlabs-audio"
    assert response.media_type == "audio/mpeg"


def test_elevenlabs_audio_metadata_exposes_proxy_when_detail_has_no_audio_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _session()
    conversation = _seed_bolna_conversation(db, with_audio_asset=False)
    account = db.get(ProviderAccount, conversation.provider_account_id)
    assert account
    account.provider_name = "elevenlabs"
    db.commit()

    monkeypatch.setattr(media, "decrypt_secret", lambda value: "plain-key")

    class _FakeAdapter:
        def get_conversation_detail(self, *args: object, **kwargs: object) -> dict[str, object]:
            return {"has_audio": False}

        def extract_audio_url(self, detail: dict[str, object]) -> None:
            return None

    monkeypatch.setattr(media, "get_provider_adapter", lambda **kwargs: _FakeAdapter())

    result = media.get_audio_metadata(conversation.id, workspace_id=conversation.workspace_id, db=db)

    assert result.source_url == f"/api/v1/media/conversations/{conversation.id}/audio/stream"
