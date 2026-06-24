# Import Creation And Progress UI

## Scope

Covers creating import jobs, showing progress states, and handling terminal outcomes.

## Entry Points

- `frontend/src/pages/ImportNewPage.tsx`
- `frontend/src/pages/ImportProgressPage.tsx`
- `frontend/src/api/endpoints.ts`
- import-related style blocks in `frontend/src/index.css`

## Common Agent Tasks

1. Add import options or source filters.
2. Improve progress milestones and status copy.
3. Add cancellation/retry actions in UI.

## Change Checklist

- Keep progress polling intervals and stop conditions safe.
- Ensure terminal states (completed/failed/canceled) are explicit.
- Keep navigation between new/progress pages deterministic.

## Validation Checklist

- New import request creates a job and redirects to progress page.
- Progress updates until terminal state.
- Cancellation and failure states display correctly.

## Known Pitfalls

- Poll loops continuing after terminal status.
- UI mismatch with backend progress schema changes.
