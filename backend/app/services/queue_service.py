from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.job_queue import DeadLetterJob, JobAttempt, JobQueue, JobStatus


def enqueue_job(
    db: Session,
    *,
    job_type: str,
    payload: dict,
    priority: int = 100,
    max_attempts: int = 5,
) -> JobQueue:
    job = JobQueue(
        type=job_type,
        payload_json=json.dumps(payload),
        priority=priority,
        max_attempts=max_attempts,
        status=JobStatus.PENDING.value,
    )
    db.add(job)
    db.flush()
    return job


def lease_next_job(db: Session, *, owner: str, lease_seconds: int = 60) -> JobQueue | None:
    now = datetime.now(timezone.utc)
    stmt = (
        select(JobQueue)
        .where(
            and_(
                JobQueue.status == JobStatus.PENDING.value,
                JobQueue.run_at <= now,
            )
        )
        .order_by(JobQueue.priority.asc(), JobQueue.created_at.asc())
        .limit(1)
    )
    job = db.scalar(stmt)
    if not job:
        return None

    job.status = JobStatus.LEASED.value
    job.lease_owner = owner
    job.leased_until = now + timedelta(seconds=lease_seconds)
    db.flush()
    return job


def mark_job_succeeded(db: Session, job: JobQueue) -> None:
    job.status = JobStatus.SUCCEEDED.value
    job.lease_owner = None
    job.leased_until = None
    db.flush()


def mark_job_failed(db: Session, job: JobQueue, error_message: str) -> None:
    job.attempts += 1
    db.add(
        JobAttempt(job_id=job.id, attempt_number=job.attempts, error_message=error_message[:2000])
    )

    if job.attempts >= job.max_attempts:
        job.status = JobStatus.DEAD_LETTER.value
        db.add(
            DeadLetterJob(
                original_job_id=job.id,
                type=job.type,
                payload_json=job.payload_json,
                reason=error_message[:2000],
            )
        )
    else:
        backoff_seconds = min(2**job.attempts, 300)
        job.status = JobStatus.PENDING.value
        job.run_at = datetime.now(timezone.utc) + timedelta(seconds=backoff_seconds)

    job.lease_owner = None
    job.leased_until = None
    db.flush()
