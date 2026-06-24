# Frontend Feature Playbooks

Use these documents when implementing or debugging frontend features.

## Features

1. [App Shell, Routing, And Auth Guard](app-shell-routing-and-auth-guard.md)
2. [Conversations List Workspace](conversations-list-workspace.md)
3. [Conversation Detail Workspace](conversation-detail-workspace.md)
4. [Provider Settings And Connectivity UI](provider-settings-and-connectivity.md)
5. [Import Creation And Progress UI](import-creation-and-progress.md)
6. [Dashboard Analytics UI](dashboard-analytics-ui.md)

## Change Safety Rules

- Keep API type contracts aligned with backend response models.
- Prefer feature-local state transitions over broad global side effects.
- Validate both desktop and mobile behavior after layout changes.
