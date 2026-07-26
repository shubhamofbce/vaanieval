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


def recover_stale_leases(db: Session, *, stale_after_seconds: int = 120) -> int:
    """
    Recover jobs that were leased but never completed (crashed workers).
    Resets their status to PENDING so they can be picked up again.
    Returns count of recovered jobs.

    Lease timing semantics: ``lease_next_job`` stores ``leased_until`` as the
    absolute instant at which the lease expires. A lease is therefore stale as
    soon as ``leased_until <= now`` — a lease whose ``leased_until`` is exactly
    equal to now IS recovered, while one strictly in the future is NOT. The
    predicate compares against ``leased_until`` directly; subtracting an extra
    window would defer recovery by a full lease duration past expiry. Recovery
    clears ``lease_owner`` and ``leased_until`` and is idempotent: a second
    pass recovers nothing further.

    ``stale_after_seconds`` is retained for API compatibility with existing
    callers but no longer affects the recovery predicate.
    """
    now = datetime.now(timezone.utc)

    stmt = select(JobQueue).where(
        and_(
            JobQueue.status == JobStatus.LEASED.value,
            JobQueue.leased_until <= now,
        )
    )

    stale_jobs = db.scalars(stmt).all()
    recovered_count = 0

    for job in stale_jobs:
        job.status = JobStatus.PENDING.value
        job.lease_owner = None
        job.leased_until = None
        recovered_count += 1

    if recovered_count > 0:
        db.flush()

    return recovered_count

