from __future__ import annotations

import json
import socket
import time

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.evaluation import ConversationEvaluationRun
from app.models.job_queue import JobQueue, JobStatus
from app.services.import_service import (
    IMPORT_CONVERSATION_DETAIL,
    IMPORT_PAGE_FETCH,
    run_import_conversation_detail,
    run_import_page_fetch,
)
from app.services.evaluation_service import EVAL_CONVERSATION_SCORES, run_evaluation_job
from app.services.queue_service import lease_next_job, mark_job_failed, mark_job_succeeded


def process_job(db, job: JobQueue) -> None:
    payload = json.loads(job.payload_json)

    if job.type == IMPORT_PAGE_FETCH:
        run_import_page_fetch(db, payload)
    elif job.type == IMPORT_CONVERSATION_DETAIL:
        run_import_conversation_detail(db, payload)
    elif job.type == EVAL_CONVERSATION_SCORES:
        run_evaluation_job(db, payload)
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


def worker_loop(poll_seconds: float = 1.0) -> None:
    owner = f"worker-{socket.gethostname()}"
    while True:
        db = SessionLocal()
        try:
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
                    _mark_eval_run_failed_from_job_payload(
                        db,
                        job,
                        f"Evaluation job moved to dead-letter after retries: {exc}",
                    )
                db.commit()
            time.sleep(poll_seconds)
        finally:
            db.close()


def run_worker() -> None:
    worker_loop()


if __name__ == "__main__":
    run_worker()
