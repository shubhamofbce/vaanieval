from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import httpx
from app.models.conversation import AudioAsset, Conversation
from app.models.job_queue import JobQueue, JobStatus
from app.models.provider import ProviderAccount
from app.providers.factory import get_provider_adapter
from app.services.credentials import decrypt_secret
from app.services.queue_service import enqueue_job
from sqlalchemy import select
from sqlalchemy.orm import Session

GENERATE_AUDIO_WAVEFORM = "generate_audio_waveform"
WAVEFORM_PENDING = "pending"
WAVEFORM_READY = "ready"
MAX_WAVEFORM_PEAKS = 4096


def enqueue_audio_waveform_job(db: Session, *, conversation_id: str) -> None:
    asset = db.scalar(select(AudioAsset).where(AudioAsset.conversation_id == conversation_id))
    if not asset or asset.waveform_status == WAVEFORM_READY:
        return

    # A deployment can restart midway through a job, or an older worker can see
    # the new job type before it has been restarted. Keep a pending asset alive,
    # but never create a duplicate while a worker still owns a runnable job.
    active_job = db.scalar(
        select(JobQueue).where(
            JobQueue.type == GENERATE_AUDIO_WAVEFORM,
            JobQueue.payload_json.contains(conversation_id),
            JobQueue.status.in_([JobStatus.PENDING.value, JobStatus.LEASED.value]),
        )
    )
    if active_job:
        return

    asset.waveform_status = WAVEFORM_PENDING
    asset.waveform_peaks_json = None
    enqueue_job(
        db,
        job_type=GENERATE_AUDIO_WAVEFORM,
        payload={"conversation_id": conversation_id},
        # Import and evaluation work must always get ahead of waveform decoration.
        priority=90,
        max_attempts=3,
    )


def generate_audio_waveform(db: Session, payload: dict) -> None:
    conversation_id = payload["conversation_id"]
    conversation = db.scalar(select(Conversation).where(Conversation.id == conversation_id))
    asset = db.scalar(select(AudioAsset).where(AudioAsset.conversation_id == conversation_id))
    if not conversation or not asset:
        return

    try:
        audio_path = _get_cached_audio_path(db, conversation, asset)
        peaks = _extract_peaks(audio_path)
    except Exception:  # noqa: BLE001
        # Let the shared queue retry policy decide when this is terminal. Keeping
        # the asset pending prevents the client from giving up during a transient
        # provider download or worker failure.
        raise

    asset.waveform_status = WAVEFORM_READY
    asset.waveform_peaks_json = json.dumps(peaks, separators=(",", ":"))
    db.flush()


def _get_cached_audio_path(db: Session, conversation: Conversation, asset: AudioAsset) -> Path:
    if asset.local_path:
        path = Path(asset.local_path)
        if path.exists():
            return path

    cache_dir = Path(tempfile.gettempdir()) / "vaanieval_audio_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    suffix = _guess_audio_suffix(asset.source_url)
    cached_path = cache_dir / f"{conversation.id}{suffix}"
    if cached_path.exists():
        return cached_path

    account = db.scalar(select(ProviderAccount).where(ProviderAccount.id == conversation.provider_account_id))
    # Bolna recording URLs require the provider bearer token, so never fetch a
    # stored Bolna URL anonymously. ElevenLabs can also have an asset without a
    # URL and must use its authenticated recording endpoint.
    if asset.source_url and (not account or account.provider_name != "bolna"):
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            response = client.get(asset.source_url)
            response.raise_for_status()
            audio_bytes = response.content
    elif account:
        adapter = get_provider_adapter(
            provider_name=account.provider_name,
            api_key=decrypt_secret(account.api_key),
        )
        audio_bytes = adapter.get_conversation_audio_bytes(
            conversation.provider_conversation_id,
            agent_id=conversation.provider_agent_id,
        )
    else:
        raise ValueError("Audio source is unavailable")

    if not audio_bytes:
        raise ValueError("Audio source returned no bytes")
    cached_path.write_bytes(audio_bytes)
    return cached_path


def _extract_peaks(audio_path: Path) -> list[float]:
    binary = os.getenv("AUDIOWAVEFORM_BINARY") or shutil.which("audiowaveform")
    if not binary:
        raise RuntimeError("audiowaveform is not installed or AUDIOWAVEFORM_BINARY is not configured")

    descriptor, output_name = tempfile.mkstemp(prefix="vaanieval-waveform-", suffix=".json")
    os.close(descriptor)
    output_path = Path(output_name)
    try:
        result = subprocess.run(
            [
                binary,
                "-i",
                str(audio_path),
                "-o",
                str(output_path),
                "--output-format",
                "json",
                "--pixels-per-second",
                "12",
                "--bits",
                "8",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "audiowaveform failed")

        payload = json.loads(output_path.read_text())
        samples = payload.get("data")
        if not isinstance(samples, list) or not samples:
            raise ValueError("audiowaveform returned no peak data")

        # JSON output holds min/max pairs. Convert each pair to one normalized
        # magnitude, which is the compact shape the React player needs.
        raw_peaks = [max(abs(float(samples[index])), abs(float(samples[index + 1])))
                     for index in range(0, len(samples) - 1, 2)]
        maximum = max(raw_peaks, default=0)
        if maximum <= 0:
            return [0.0] * min(len(raw_peaks), MAX_WAVEFORM_PEAKS)

        return _downsample_max([round(peak / maximum, 4) for peak in raw_peaks])
    finally:
        output_path.unlink(missing_ok=True)


def _downsample_max(peaks: list[float]) -> list[float]:
    if len(peaks) <= MAX_WAVEFORM_PEAKS:
        return peaks
    bucket_size = len(peaks) / MAX_WAVEFORM_PEAKS
    return [
        max(peaks[int(index * bucket_size): max(int((index + 1) * bucket_size), int(index * bucket_size) + 1)])
        for index in range(MAX_WAVEFORM_PEAKS)
    ]


def _guess_audio_suffix(source_url: str | None) -> str:
    suffix = Path(urlparse(source_url or "").path).suffix.lower()
    return suffix if suffix in {".wav", ".mp3", ".ogg", ".flac"} else ".mp3"
