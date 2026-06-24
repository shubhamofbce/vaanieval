# Conversations, Insights, And Media

## Scope

Covers conversation list/detail retrieval, provider insights shaping, and audio metadata/stream endpoints.

## Entry Points

- `backend/app/api/v1/conversations.py`
- `backend/app/api/v1/media.py`
- `backend/app/models/conversation.py`
- `backend/app/providers/*` (detail/audio retrieval)

## API Surface

- `GET /api/v1/conversations`
- `GET /api/v1/conversations/{conversation_id}`
- `GET /api/v1/conversations/{conversation_id}/insights`
- `GET /api/v1/media/conversations/{conversation_id}/audio`
- `GET /api/v1/media/conversations/{conversation_id}/audio/stream`

## Core Data Concerns

- Turn ordering and timestamps drive subtitle sync in UI.
- Insights payloads must coerce provider values into stable types.
- Audio stream endpoint may serve local cache, provider URL, or redirect.

## Common Agent Tasks

1. Add fields to conversation detail or insights response.
2. Improve transcript/timing normalization.
3. Adjust audio fallback/cache behavior for providers.

## Change Checklist

- Preserve backward-compatible response shapes for list/detail pages.
- Keep transcript timing fields consistent (`started_ms`, `ended_ms`).
- Ensure media route permissions match conversation workspace.

## Validation Checklist

- Conversations list and detail render with no schema errors.
- Insights endpoint handles provider-specific null/shape differences.
- Audio metadata and stream paths resolve for both providers.

## Known Pitfalls

- Returning non-string summary/transcript fragments that break schema validation.
- Missing cache/file existence guards in stream route.
