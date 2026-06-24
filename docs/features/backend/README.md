# Backend Feature Playbooks

Use these documents when implementing or debugging backend features.

## Features

1. [Auth, Workspace, And Session](auth-workspace-session.md)
2. [Provider Accounts And Agent Discovery](provider-accounts-and-agent-discovery.md)
3. [Import Jobs And Progress Tracking](import-jobs-and-progress.md)
4. [Conversations, Insights, And Media](conversations-insights-and-media.md)
5. [Evaluation Runs And Metric Scores](evaluation-runs-and-metric-scores.md)
6. [Dashboard Aggregates](dashboard-aggregates.md)
7. [Worker And Job Queue Lifecycle](worker-and-job-queue-lifecycle.md)

## Change Safety Rules

- Preserve workspace scoping on all queries and writes.
- Keep API and worker behavior in sync when adding queue-backed flows.
- Treat provider adapters as integration boundaries; do not leak provider-specific shapes into shared models.
