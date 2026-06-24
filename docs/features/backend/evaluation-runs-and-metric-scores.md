# Evaluation Runs And Metric Scores

## Scope

Covers creation/execution of evaluation runs and persistence/readback of per-metric scores and rationale.

## Entry Points

- `backend/app/api/v1/evaluations.py`
- `backend/app/models/evaluation.py`
- `backend/app/services/evaluation*`
- `backend/app/worker.py` (queued evaluation execution)

## API Surface

- `POST /api/v1/evaluations/conversations/{conversation_id}/run`
- `GET /api/v1/evaluations/conversations/{conversation_id}/latest`
- Any run status/progress endpoints exposed in router

## Core Data Concerns

- Evaluation run status lifecycle: queued -> running -> completed/failed.
- Metric scores are attached to one run and should remain immutable after completion.
- Failures should propagate meaningful error messages to UI.

## Common Agent Tasks

1. Add/retire metrics in response model and computation pipeline.
2. Change model/provider selection behavior.
3. Improve run retry and failure reporting.

## Change Checklist

- Keep metric keys aligned with frontend labels and dashboard aggregations.
- Ensure run status transitions are atomic and terminal states are respected.
- Update seed/default metric expectations in tests.

## Validation Checklist

- Triggering an evaluation creates a queued run.
- Latest endpoint returns completed run with metric scores and rationales.
- Failed runs expose actionable error state without breaking UI rendering.

## Known Pitfalls

- Metric key drift between evaluator output and frontend mapping.
- Leaving runs in running status on worker exceptions.
