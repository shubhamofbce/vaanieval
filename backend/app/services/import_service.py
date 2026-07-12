from __future__ import annotations

import json

from sqlalchemy import and_, delete, select
from sqlalchemy.orm import Session

from app.models.conversation import AudioAsset, Conversation, ConversationTurn
from app.models.import_job import ImportJob, ImportJobStatus
from app.models.job_queue import JobQueue, JobStatus
from app.models.provider import ProviderAccount
from app.providers.factory import get_provider_adapter
from app.services.credentials import decrypt_secret
from app.services.evaluation_service import enqueue_evaluation_job
from app.services.queue_service import enqueue_job

IMPORT_PAGE_FETCH = "import_page_fetch"
IMPORT_CONVERSATION_DETAIL = "import_conversation_detail"
BACKFILL_CONVERSATION_TIMESTAMP = "backfill_conversation_timestamp"


def create_import_job(
    db: Session,
    *,
    workspace_id: str,
    provider_account_id: str,
    agent_id: str | None,
    start_date: str | None,
    end_date: str | None,
    page_size: int,
) -> ImportJob:
    account = db.scalar(
        select(ProviderAccount).where(
            ProviderAccount.id == provider_account_id,
            ProviderAccount.workspace_id == workspace_id,
        )
    )
    if not account:
        raise ValueError("Provider account not found")
    if account.provider_name not in {"elevenlabs", "vapi"}:
        raise ValueError(
            f"Historical import is not supported for provider {account.provider_name}."
        )

    job = ImportJob(
        workspace_id=workspace_id,
        provider_account_id=provider_account_id,
        status=ImportJobStatus.QUEUED.value,
        agent_id=agent_id,
        start_date=start_date,
        end_date=end_date,
        page_size=page_size,
    )
    db.add(job)
    db.flush()

    enqueue_job(db, job_type=IMPORT_PAGE_FETCH, payload={"import_job_id": job.id}, priority=50)
    db.commit()
    db.refresh(job)
    return job


def run_import_page_fetch(db: Session, payload: dict) -> None:
    import_job_id = payload["import_job_id"]
    import_job = db.scalar(select(ImportJob).where(ImportJob.id == import_job_id))
    if not import_job or import_job.status == ImportJobStatus.CANCELLED.value:
        return

    account = db.scalar(select(ProviderAccount).where(ProviderAccount.id == import_job.provider_account_id))
    if not account:
        raise ValueError("Provider account not found")

    import_job.status = ImportJobStatus.RUNNING.value

    adapter = get_provider_adapter(
        provider_name=account.provider_name,
        api_key=decrypt_secret(account.api_key),
    )
    response = adapter.list_conversations(
        cursor=import_job.cursor,
        page_size=import_job.page_size,
        agent_id=import_job.agent_id,
        start_date=import_job.start_date,
        end_date=import_job.end_date,
    )

    conversations = response.get("conversations", [])
    for item in conversations:
        conversation_id = item.get("conversation_id") or item.get("id")
        if not conversation_id:
            continue
        enqueue_job(
            db,
            job_type=IMPORT_CONVERSATION_DETAIL,
            payload={"import_job_id": import_job.id, "conversation_id": conversation_id},
            priority=60,
        )

    import_job.cursor = response.get("next_cursor")
    if import_job.cursor:
        enqueue_job(db, job_type=IMPORT_PAGE_FETCH, payload={"import_job_id": import_job.id}, priority=50)
    else:
        import_job.status = ImportJobStatus.COMPLETED.value


def run_import_conversation_detail(db: Session, payload: dict) -> None:
    import_job_id = payload["import_job_id"]
    conversation_id = payload["conversation_id"]

    import_job = db.scalar(select(ImportJob).where(ImportJob.id == import_job_id))
    if not import_job:
        raise ValueError("Import job not found")

    account = db.scalar(select(ProviderAccount).where(ProviderAccount.id == import_job.provider_account_id))
    if not account:
        raise ValueError("Provider account not found")

    adapter = get_provider_adapter(
        provider_name=account.provider_name,
        api_key=decrypt_secret(account.api_key),
    )
    detail = adapter.get_conversation_detail(conversation_id)
    normalized_detail = adapter.normalize_conversation_detail(detail)
    provider_agent_id = normalized_detail.provider_agent_id
    language = normalized_detail.language
    outcome = normalized_detail.outcome
    started_at = normalized_detail.started_at
    ended_at = normalized_detail.ended_at
    turns = normalized_detail.turns
    audio_url = normalized_detail.audio_url

    record = db.scalar(
        select(Conversation).where(
            and_(
                Conversation.provider_account_id == account.id,
                Conversation.provider_conversation_id == conversation_id,
            )
        )
    )
    if not record:
        record = Conversation(
            workspace_id=import_job.workspace_id,
            provider_account_id=account.id,
            provider_conversation_id=conversation_id,
            provider_agent_id=provider_agent_id,
            language=language,
            outcome=outcome,
            started_at=started_at,
            ended_at=ended_at,
        )
        db.add(record)
        db.flush()
    else:
        record.provider_agent_id = provider_agent_id
        record.language = language
        record.outcome = outcome
        record.started_at = started_at
        record.ended_at = ended_at

    db.execute(delete(ConversationTurn).where(ConversationTurn.conversation_id == record.id))

    for idx, turn in enumerate(turns):
        turn_text = (
            turn.get("text")
            or turn.get("message")
            or turn.get("original_message")
            or turn.get("content")
            or ""
        )

        # ElevenLabs commonly exposes per-turn relative time via time_in_call_secs.
        # Keep millisecond offsets when explicit start/end are not present.
        started_ms = turn.get("start_ms")
        ended_ms = turn.get("end_ms")
        if started_ms is None:
            secs = turn.get("time_in_call_secs")
            if isinstance(secs, (int, float)):
                started_ms = int(secs * 1000)

        db.add(
            ConversationTurn(
                conversation_id=record.id,
                role=turn.get("role", "unknown"),
                text=turn_text,
                started_ms=started_ms,
                ended_ms=ended_ms,
                turn_order=idx,
            )
        )

    if audio_url:
        asset = db.scalar(select(AudioAsset).where(AudioAsset.conversation_id == record.id))
        if asset:
            asset.source_url = audio_url
        else:
            db.add(AudioAsset(conversation_id=record.id, source_url=audio_url, mime_type="audio/mpeg"))

    # Best-effort: if an external evaluator is configured, queue scoring for this conversation.
    try:
        enqueue_evaluation_job(
            db,
            workspace_id=import_job.workspace_id,
            conversation_id=record.id,
        )
    except ValueError:
        pass

    import_job.imported_count += 1


def run_backfill_conversation_timestamp(db: Session, payload: dict) -> None:
    conversation_id = payload["conversation_id"]

    record = db.scalar(select(Conversation).where(Conversation.id == conversation_id))
    if not record or record.started_at is not None:
        return

    account = db.scalar(select(ProviderAccount).where(ProviderAccount.id == record.provider_account_id))
    if not account or account.provider_name not in {"elevenlabs", "vapi"}:
        return

    adapter = get_provider_adapter(
        provider_name=account.provider_name,
        api_key=decrypt_secret(account.api_key),
    )
    detail = adapter.get_conversation_detail(record.provider_conversation_id)
    normalized_detail = adapter.normalize_conversation_detail(detail)

    if normalized_detail.started_at is not None:
        record.started_at = normalized_detail.started_at
    if normalized_detail.ended_at is not None:
        record.ended_at = normalized_detail.ended_at


def queue_depth_for_import(db: Session, import_job_id: str) -> dict[str, int]:
    rows = db.scalars(
        select(JobQueue).where(
            and_(
                JobQueue.status.in_([JobStatus.PENDING.value, JobStatus.LEASED.value]),
                JobQueue.payload_json.contains(import_job_id),
            )
        )
    ).all()
    pending = sum(1 for item in rows if item.status == JobStatus.PENDING.value)
    leased = sum(1 for item in rows if item.status == JobStatus.LEASED.value)
    return {"pending": pending, "leased": leased}


def cancel_import(db: Session, import_job_id: str) -> ImportJob | None:
    job = db.scalar(select(ImportJob).where(ImportJob.id == import_job_id))
    if not job:
        return None
    job.status = ImportJobStatus.CANCELLED.value

    queued_jobs = db.scalars(
        select(JobQueue).where(
            and_(
                JobQueue.status == JobStatus.PENDING.value,
                JobQueue.payload_json.contains(import_job_id),
            )
        )
    ).all()
    for qj in queued_jobs:
        qj.status = JobStatus.CANCELLED.value

    db.commit()
    db.refresh(job)
    return job

