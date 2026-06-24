# Worker And Job Queue Lifecycle

## Scope

Covers queue job leasing, retries, dead-letter behavior, and worker-driven side effects (imports/evaluations).

## Entry Points

- `backend/app/worker.py`
- `backend/app/models/job_queue.py`
- `backend/scripts/run_worker.py`
- any queue service modules under `backend/app/services/`

## Lifecycle

1. API enqueues a job row.
2. Worker leases the next eligible job.
3. Handler executes task payload.
4. Worker marks success, retry, or dead-letter.

## Retry And Failure Rules

- Retryable exceptions should increment attempt count and apply backoff.
- Terminal failures should mark dead-letter and sync related domain statuses.
- Worker must avoid duplicate concurrent leases.

## Common Agent Tasks

1. Add a new job type and handler.
2. Change retry policy or lease timeout behavior.
3. Add operational logging/telemetry around queue health.

## Change Checklist

- Register new job types in one canonical dispatch map.
- Keep handler payload shape versioned or backward compatible.
- Update run/import status updates for every failure path.

## Validation Checklist

- New jobs are consumed end-to-end by worker.
- Retry behavior triggers exactly as configured.
- Dead-letter transitions are visible and recoverable.

## Known Pitfalls

- Silent worker crashes leaving jobs leased forever.
- Partial side effects when handlers are not idempotent.
