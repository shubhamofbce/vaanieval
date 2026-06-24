# Conversation Detail Workspace

## Scope

Covers full-detail review surface: score table, provider insights, call player waveform, transcript synchronization, and facts sidebar.

## Entry Points

- `frontend/src/pages/ConversationDetailPage.tsx`
- `frontend/src/api/endpoints.ts`
- `frontend/src/api/types.ts`
- `frontend/src/index.css` (detail layout and player styles)

## Common Agent Tasks

1. Improve call-player UX and waveform rendering.
2. Add new insight cards/sections.
3. Refine transcript and active subtitle sync.

## Change Checklist

- Keep one waveform initialization path only.
- Keep active subtitle logic aligned with transcript highlight logic.
- Preserve responsive behavior for the right rail and transcript.

## Validation Checklist

- Waveform renders once and playback controls function.
- Active subtitle updates with playback and seek.
- Transcript double-click jump seeks accurately.
- Right rail layout behaves on desktop and mobile breakpoints.

## Known Pitfalls

- Duplicate player initialization causing stacked waveform visuals.
- Mixed turn role filtering between active subtitle and transcript list.
