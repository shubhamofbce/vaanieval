# Conversations List Workspace

## Scope

Covers list filtering, selection, inline detail tabs, call-player preview, transcript panel, and per-row evaluation summary.

## Entry Points

- `frontend/src/pages/ConversationsPage.tsx`
- `frontend/src/api/endpoints.ts`
- `frontend/src/api/types.ts`
- `frontend/src/index.css` (workspace and player styles)

## Data Inputs

- Conversations list
- Selected conversation detail
- Audio metadata
- Insights payload
- Latest evaluation run per conversation

## Common Agent Tasks

1. Add list filters/sort modes.
2. Improve inline player/timeline/subtitle behavior.
3. Extend score badges and row-level evaluation indicators.

## Change Checklist

- Keep list and selected detail state transitions stable.
- Avoid desync between currentTime, active subtitle, and transcript highlight.
- Preserve pagination + selected row behavior after filtering.

## Validation Checklist

- Filters update visible rows and selection safely.
- Inline player controls work (play/pause/seek/rate/skip).
- Active subtitle and transcript highlight track playback.
- Open full detail link keeps selected context.

## Known Pitfalls

- Subtitle drift from inconsistent timing normalization.
- Race conditions between selected row change and detail fetch.
