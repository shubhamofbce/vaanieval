# Provider Settings And Connectivity UI

## Scope

Covers provider account setup, credential test flows, and agent discovery/default selection in the settings experience.

## Entry Points

- `frontend/src/pages/ProviderPage.tsx`
- `frontend/src/api/endpoints.ts`
- `frontend/src/api/types.ts`
- provider-related style blocks in `frontend/src/index.css`

## Common Agent Tasks

1. Add support for a new provider field.
2. Improve connect/test UX and error handling.
3. Extend default agent selection controls.

## Change Checklist

- Keep form payload keys aligned with backend provider routes.
- Show clear validation and API failure states.
- Avoid exposing secrets in UI logs/debug panels.

## Validation Checklist

- Connect/test succeeds with valid credentials.
- Invalid credentials show actionable error messages.
- Agent discovery and default-agent selection persist correctly.

## Known Pitfalls

- UI assumptions about provider-specific capabilities.
- Missing refresh after connect/test success.
