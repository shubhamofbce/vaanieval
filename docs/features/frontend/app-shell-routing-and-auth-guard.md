# App Shell, Routing, And Auth Guard

## Scope

Covers app layout, route registration, auth gating, and navigation behavior.

## Entry Points

- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout.tsx`
- `frontend/src/components/RequireAuth.tsx` (or equivalent)
- `frontend/src/pages/LoginPage.tsx`

## Routing Surface

Primary routes include dashboard, conversations, imports, providers, agents, onboarding, and login.

## Common Agent Tasks

1. Add a new protected route.
2. Add a new sidebar navigation item.
3. Change post-login redirect behavior.

## Change Checklist

- Register route in app router and nav consistently.
- Keep protected routes wrapped in auth guard.
- Ensure deep links behave correctly for logged-out users.

## Validation Checklist

- Unauthenticated user gets redirected to login.
- Authenticated user can navigate between major pages.
- Sidebar links and route paths stay aligned.

## Known Pitfalls

- Orphaned routes not represented in sidebar/nav.
- Route path changes without updating deep links.
