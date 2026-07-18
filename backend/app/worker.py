from __future__ import annotations

import json
import socket
import time

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.conversation import AudioAsset
from app.models.evaluation import ConversationEvaluationRun
from app.models.import_job import ImportJob, ImportJobStatus
from app.models.job_queue import JobQueue, JobStatus
from app.services.audio_waveform_service import GENERATE_AUDIO_WAVEFORM, generate_audio_waveform
from app.services.evaluation_service import EVAL_CONVERSATION_SCORES, run_evaluation_job
from app.services.import_service import (
    BACKFILL_CONVERSATION_DISPLAY_NAME,
    BACKFILL_CONVERSATION_TIMESTAMP,
    IMPORT_CONVERSATION_DETAIL,
    IMPORT_PAGE_FETCH,
    run_backfill_conversation_display_name,
    run_backfill_conversation_timestamp,
    run_import_conversation_detail,
    run_import_page_fetch,
)
from app.services.queue_service import (
    lease_next_job,
    mark_job_failed,
    mark_job_succeeded,
    recover_stale_leases,
)
from app.services.reporting_service import process_reporting_alerts
from app.services.security import utc_now
from sqlalchemy import select
from sqlalchemy.orm import Session


def process_job(db, job: JobQueue) -> None:
    payload = json.loads(job.payload_json)

    if job.type == IMPORT_PAGE_FETCH:
        run_import_page_fetch(db, payload)
    elif job.type == IMPORT_CONVERSATION_DETAIL:
        run_import_conversation_detail(db, payload)
    elif job.type == BACKFILL_CONVERSATION_DISPLAY_NAME:
        run_backfill_conversation_display_name(db, payload)
    elif job.type == BACKFILL_CONVERSATION_TIMESTAMP:
        run_backfill_conversation_timestamp(db, payload)
    elif job.type == EVAL_CONVERSATION_SCORES:
        run_evaluation_job(db, payload)
    elif job.type == GENERATE_AUDIO_WAVEFORM:
        generate_audio_waveform(db, payload)
    else:
        raise ValueError(f"Unsupported job type: {job.type}")


def _mark_eval_run_failed_from_job_payload(db, job: JobQueue, error_message: str) -> None:
    if job.type != EVAL_CONVERSATION_SCORES:
        return

    try:
        payload = json.loads(job.payload_json)
    except json.JSONDecodeError:
        return

    evaluation_run_id = payload.get("evaluation_run_id")
    if not evaluation_run_id:
        return

    run = db.scalar(
        select(ConversationEvaluationRun).where(ConversationEvaluationRun.id == evaluation_run_id)
    )
    if not run:
        return

    run.status = "failed"
    run.error_message = error_message[:2000]
    db.flush()


def _mark_waveform_failed_from_job_payload(db, job: JobQueue) -> None:
    if job.type != GENERATE_AUDIO_WAVEFORM:
        return
    try:
        payload = json.loads(job.payload_json)
    except json.JSONDecodeError:
        return
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        return
    asset = db.scalar(select(AudioAsset).where(AudioAsset.conversation_id == conversation_id))
    if asset:
        asset.waveform_status = "failed"
        asset.waveform_peaks_json = None
        db.flush()


def _mark_import_run_failed_from_job_payload(db, job: JobQueue, error_message: str) -> None:
    if job.type not in {IMPORT_PAGE_FETCH, IMPORT_CONVERSATION_DETAIL}:
        return

    try:
        payload = json.loads(job.payload_json)
    except json.JSONDecodeError:
        return

    import_job_id = payload.get("import_job_id")
    if not import_job_id:
        return

    run = db.scalar(select(ImportJob).where(ImportJob.id == import_job_id))
    if not run:
        return

    run.status = ImportJobStatus.FAILED.value
    run.failed_count = (run.failed_count or 0) + 1
    db.flush()


def worker_loop(poll_seconds: float = 1.0) -> None:
    owner = f"worker-{socket.gethostname()}"
    while True:
        db = SessionLocal()
        try:
            # Recover stale leases first (crashed workers)
            recover_stale_leases(db, stale_after_seconds=120)
            db.commit()
            
            # Process one job per iteration
            job = lease_next_job(db, owner=owner)
            if not job:
                db.commit()
                time.sleep(poll_seconds)
                continue

            process_job(db, job)
            mark_job_succeeded(db, job)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            if "job" in locals() and job is not None:
                mark_job_failed(db, job, str(exc))
                if job.status == JobStatus.DEAD_LETTER.value:
                    _mark_waveform_failed_from_job_payload(db, job)
                    _mark_eval_run_failed_from_job_payload(
                        db,
                        job,
                        f"Evaluation job moved to dead-letter after retries: {exc}",
                    )
                    _mark_import_run_failed_from_job_payload(
                        db,
                        job,
                        f"Import job moved to dead-letter after retries: {exc}",
                    )
                db.commit()
            time.sleep(poll_seconds)
        finally:
            db.close()


def process_jobs_batch(db: Session, *, max_jobs: int = 10) -> dict[str, int | list]:
    """
    Process up to max_jobs from the queue in a single batch.
    Returns dict with counts and errors.
    Used by both polling worker and Vercel Cron.
    """
    owner = f"worker-{socket.gethostname()}"
    processed_count = 0
    failed_count = 0
    errors = []

    # Recover stale leases first (crashed workers)
    recover_stale_leases(db, stale_after_seconds=120)
    process_reporting_alerts(db, get_settings(), utc_now())
    db.flush()

    for _ in range(max_jobs):
        try:
            job = lease_next_job(db, owner=owner)
            if not job:
                break

            try:
                process_job(db, job)
                mark_job_succeeded(db, job)
                processed_count += 1
            except Exception as exc:  # noqa: BLE001
                failed_count += 1
                error_msg = str(exc)
                errors.append(f"Job {job.id} ({job.type}): {error_msg}")
                mark_job_failed(db, job, error_msg)

                if job.status == JobStatus.DEAD_LETTER.value:
                    _mark_waveform_failed_from_job_payload(db, job)
                    _mark_eval_run_failed_from_job_payload(
                        db,
                        job,
                        f"Job moved to dead-letter after retries: {error_msg}",
                    )
                    _mark_import_run_failed_from_job_payload(
                        db,
                        job,
                        f"Job moved to dead-letter after retries: {error_msg}",
                    )

        except Exception as exc:  # noqa: BLE001
            error_msg = str(exc)
            errors.append(f"Lease error: {error_msg}")
            failed_count += 1

    db.commit()
    return {
        "processed": processed_count,
        "failed": failed_count,
        "errors": errors,
    }


def run_worker() -> None:
    worker_loop()


if __name__ == "__main__":
    run_worker()
