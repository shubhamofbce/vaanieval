# Auth, Workspace, And Session

## Scope

Covers login/session lifecycle, current-user context, and workspace scoping used by all protected APIs.

## Entry Points

- `backend/app/api/v1/auth.py`
- `backend/app/api/deps.py`
- `backend/app/models/auth.py`
- `backend/app/services/auth*` (if split into service files)

## API Surface

- `POST /api/v1/auth/magic-link`
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Core Data Concerns

- Session must resolve to one workspace context.
- Protected routes must derive workspace from auth context, not client input.
- Membership joins determine workspace access.

## Common Agent Tasks

1. Add claims/fields to auth response.
2. Enforce workspace checks in new route dependencies.
3. Update login/session failure handling.

## Change Checklist

- Keep dependency injection consistent for workspace resolution.
- Do not bypass auth dependency for protected routers.
- Ensure logout invalidates server-side session state.

## Validation Checklist

- Login and verify flow returns expected user/workspace metadata.
- Unauthorized requests receive 401/403 correctly.
- Cross-workspace access attempts are blocked.

## Known Pitfalls

- Workspace leakage from missing `workspace_id` filters.
- Assuming a default workspace without membership checks.
