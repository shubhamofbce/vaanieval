# Import Jobs And Progress Tracking

## Scope

Covers historical conversation import creation, queue dispatch, status polling, and cancellation.

## Entry Points

- `backend/app/api/v1/imports.py`
- `backend/app/worker.py`
- `backend/app/models/import_job.py`
- `backend/app/models/job_queue.py`
- `backend/app/services/import*`

## API Surface

- `POST /api/v1/imports`
- `GET /api/v1/imports/{import_job_id}`
- `GET /api/v1/imports/{import_job_id}/progress`
- `POST /api/v1/imports/{import_job_id}/cancel`

## Core Data Concerns

- Import job status must stay consistent with queued work.
- Progress should be monotonic and deterministic for polling UI.
- Imports are workspace and provider-account scoped.

## Common Agent Tasks

1. Add new import filters/options.
2. Improve progress granularity for long jobs.
3. Add cancellation checks inside worker handlers.

## Change Checklist

- Ensure new job payload fields are backward compatible.
- Handle retries without duplicating imported conversations.
- Update progress schema and UI expectations together.

## Validation Checklist

- New import appears as queued and transitions to running/completed.
- Progress endpoint updates until completion.
- Cancellation transitions to terminal canceled state.

## Known Pitfalls

- Double-import from missing idempotency checks.
- Job completion marked before DB writes commit.
