from pathlib import Path
import tempfile
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.conversation import AudioAsset, Conversation
from app.models.provider import ProviderAccount
from app.providers.factory import get_provider_adapter
from app.schemas.media import AudioAssetResponse
from app.services.credentials import decrypt_secret

router = APIRouter()


@router.get("/conversations/{conversation_id}/audio", response_model=AudioAssetResponse)
def get_audio_metadata(
    conversation_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> AudioAssetResponse:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    audio = db.scalar(select(AudioAsset).where(AudioAsset.conversation_id == conversation.id))
    if not audio:
        # Fallback: historical imports may not persist audio URL even when provider has audio.
        provider_account = db.scalar(
            select(ProviderAccount).where(ProviderAccount.id == conversation.provider_account_id)
        )
        has_audio = False
        source_url: str | None = None
        if provider_account:
            try:
                adapter = get_provider_adapter(
                    provider_name=provider_account.provider_name,
                    api_key=decrypt_secret(provider_account.api_key),
                )
                detail = adapter.get_conversation_detail(
                    conversation.provider_conversation_id,
                    agent_id=conversation.provider_agent_id,
                )
                source_url = adapter.extract_audio_url(detail)
                has_audio = bool(source_url or detail.get("has_audio"))
            except Exception:  # noqa: BLE001
                has_audio = False

        return AudioAssetResponse(
            conversation_id=conversation.id,
            source_url=(
                f"/api/v1/media/conversations/{conversation.id}/audio/stream" if has_audio else None
            ),
            local_path=None,
            duration_ms=None,
            mime_type=("audio/mpeg" if has_audio else None),
        )

    provider_account = db.scalar(select(ProviderAccount).where(ProviderAccount.id == conversation.provider_account_id))
    source_url = (
        f"/api/v1/media/conversations/{conversation.id}/audio/stream"
        if provider_account and provider_account.provider_name == "vapi"
        else audio.source_url
    )

    return AudioAssetResponse(
        conversation_id=conversation.id,
        source_url=source_url,
        local_path=audio.local_path,
        duration_ms=audio.duration_ms,
        mime_type=audio.mime_type,
    )


@router.get("/conversations/{conversation_id}/audio/stream")
def stream_audio(
    conversation_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
):
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    provider_account = db.scalar(
        select(ProviderAccount).where(ProviderAccount.id == conversation.provider_account_id)
    )

    audio = db.scalar(select(AudioAsset).where(AudioAsset.conversation_id == conversation.id))
    if provider_account and provider_account.provider_name == "vapi":
        source_url = audio.source_url if audio and audio.source_url else None
        if not source_url:
            try:
                adapter = get_provider_adapter(
                    provider_name=provider_account.provider_name,
                    api_key=decrypt_secret(provider_account.api_key),
                )
                detail = adapter.get_conversation_detail(conversation.provider_conversation_id)
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found") from exc
            source_url = adapter.extract_audio_url(detail)

        if not source_url:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found")

        suffix = _guess_audio_suffix(source_url)
        media_type = _guess_media_type_from_suffix(suffix)
        cache_dir = Path(tempfile.gettempdir()) / "vaanieval_audio_cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        cached_path = cache_dir / f"{conversation.id}{suffix}"

        if not cached_path.exists():
            audio_bytes = _download_remote_audio_bytes(source_url)
            cached_path.write_bytes(audio_bytes)

        return FileResponse(path=str(cached_path), media_type=media_type)

    if not audio:
        cache_dir = Path(tempfile.gettempdir()) / "vaanieval_audio_cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        cached_path = cache_dir / f"{conversation.id}.mp3"

        if cached_path.exists():
            return FileResponse(path=str(cached_path), media_type="audio/mpeg")

        if not provider_account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found")

        try:
            adapter = get_provider_adapter(
                provider_name=provider_account.provider_name,
                api_key=decrypt_secret(provider_account.api_key),
            )
            audio_bytes = adapter.get_conversation_audio_bytes(conversation.provider_conversation_id)
            if not audio_bytes:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found")
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found") from exc

        cached_path.write_bytes(audio_bytes)

        return FileResponse(path=str(cached_path), media_type="audio/mpeg")

    if audio.local_path:
        file_path = Path(audio.local_path)
        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local audio file missing")
        return FileResponse(path=str(file_path), media_type=audio.mime_type or "audio/mpeg")

    if audio.source_url:
        return RedirectResponse(url=audio.source_url)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No stream source available")


def _download_remote_audio_bytes(source_url: str) -> bytes:
    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            response = client.get(source_url)
            response.raise_for_status()
            return response.content
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not found") from exc


def _guess_audio_suffix(source_url: str) -> str:
    suffix = Path(urlparse(source_url).path).suffix.lower()
    if suffix in {".wav", ".mp3", ".m4a", ".ogg", ".webm"}:
        return suffix
    return ".wav"


def _guess_media_type_from_suffix(suffix: str) -> str:
    return {
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
        ".wav": "audio/wav",
    }.get(suffix.lower(), "audio/wav")
