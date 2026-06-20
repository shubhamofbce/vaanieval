# Backend MVP Implementation Notes

This document tracks what is implemented for slices 1-3 and what remains.

## Slice 1: Auth + Provider Connect + Agent Discovery

Implemented:
- Magic link request endpoint creates user/workspace on first login.
- Magic link verify endpoint creates session cookie.
- Logout and current-user endpoints.
- Provider connection endpoint stores ElevenLabs account key.
- Provider test endpoint validates API connectivity.
- Agent listing endpoint supports refresh from provider and local cache.
- Set-default-agent endpoint.

Open items before production:
- Replace dev token response with real email delivery.
- Encrypt provider API keys at rest.
- Add CSRF protection and stronger cookie security flags by environment.

## Slice 2: Historical Import + Queue + Progress Tracking

Implemented:
- `import_jobs` model and import lifecycle fields.
- DB-backed `job_queue` with retries and dead-letter table.
- Queue worker process with lease and retry flow.
- Import page-fetch job and conversation-detail job handlers.
- Import progress endpoint exposing queue depth and counters.
- Import cancel endpoint cancels pending jobs for import.

Open items:
- Add strict cursor checkpoint table for resumability audits.
- Add structured per-page import logs.
- Add bounded concurrency and provider rate limit handling.

## Slice 3: Conversations + Media Read APIs

Implemented:
- Conversation list endpoint with pagination.
- Conversation detail endpoint with ordered turns.
- Audio metadata endpoint.
- Audio stream endpoint (local file or remote redirect).

Open items:
- Add subtitle cue API derived from turn timestamps.
- Add filters by agent/date/outcome/language.
- Add signed URL layer for remote audio.

## Worker model

Current worker job types:
- `import_page_fetch`
- `import_conversation_detail`

Planned next worker type:
- `score_conversation`

## Safe extension guidelines

- Keep router handlers thin; business logic belongs in services.
- Every job handler must be idempotent.
- Prefer upsert semantics for provider-originated data.
- Keep provider payload references for troubleshooting.
