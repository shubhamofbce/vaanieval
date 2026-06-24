# Dashboard Analytics UI

## Scope

Covers analytics dashboard route, date-range controls, KPI cards, comparison panels, trend charts, and top-agent table.

## Entry Points

- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/api/endpoints.ts` (`getDashboardOverview`)
- `frontend/src/api/types.ts` (dashboard response models)
- dashboard style blocks in `frontend/src/index.css`

## Common Agent Tasks

1. Add a new KPI card or trend chart.
2. Add comparison widgets for new aggregate fields.
3. Tune loading/empty/error handling for dashboard data.

## Change Checklist

- Keep frontend types synchronized with backend dashboard schema.
- Handle null/empty series safely in charts.
- Preserve range query behavior and URL param updates.

## Validation Checklist

- Each range option loads the expected interval.
- KPI values and comparison deltas render without NaN/undefined leaks.
- Charts render with data and with no-data fallbacks.

## Known Pitfalls

- Breaking chart tooltips/tick formatters with type drift.
- Forgetting to update both endpoint parser and UI components for new fields.
