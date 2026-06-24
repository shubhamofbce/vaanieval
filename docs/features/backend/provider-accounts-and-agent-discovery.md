# Provider Accounts And Agent Discovery

## Scope

Covers connecting provider accounts (ElevenLabs/Vapi), testing credentials, and syncing agent catalogs.

## Entry Points

- `backend/app/api/v1/provider.py`
- `backend/app/providers/`
- `backend/app/providers/factory.py`
- `backend/app/models/provider.py`
- `backend/app/services/credentials.py`

## API Surface

- `POST /api/v1/provider/connect`
- `POST /api/v1/provider/test`
- `GET /api/v1/provider/agents`
- `POST /api/v1/provider/agents/{agent_id}/default`

## Core Data Concerns

- Provider credentials are encrypted at rest.
- Provider accounts and agents are workspace-scoped.
- Adapter output should be normalized before persistence.

## Common Agent Tasks

1. Add fields to provider account metadata.
2. Extend adapter mapping for new provider agent attributes.
3. Add support for a new provider adapter.

## Change Checklist

- Keep provider-specific API quirks inside adapters.
- Preserve normalized model contracts used by UI.
- Protect secrets in logs and error payloads.

## Validation Checklist

- Connect and test succeed for valid keys.
- Agent list returns expected normalized names/ids.
- Default agent selection persists and reads correctly.

## Known Pitfalls

- Returning raw provider payloads to shared endpoints.
- Missing workspace filter when fetching accounts/agents.
