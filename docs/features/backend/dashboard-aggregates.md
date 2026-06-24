# Dashboard Aggregates

## Scope

Covers API-level aggregation of conversation and evaluation KPIs for dashboard visualizations.

## Entry Points

- `backend/app/api/v1/dashboard.py`
- `backend/app/schemas/dashboard.py`
- `backend/app/api/v1/api.py` (router registration)

## API Surface

- `GET /api/v1/dashboard`
  - Query params: `start_date`, `end_date`

## Output Domains

- Summary KPIs
- Period-over-period comparison
- Metric summary rows
- Trend time series
- Agent breakdown

## Common Agent Tasks

1. Add a new aggregate KPI or trend series.
2. Tune date-range defaults or comparison windows.
3. Add agent/provider segmentation dimensions.

## Change Checklist

- Keep response schema and frontend type definitions synchronized.
- Avoid N+1 query patterns in aggregate builders.
- Ensure null handling is explicit for sparse metrics.

## Validation Checklist

- Endpoint returns valid payload for default and explicit date ranges.
- Empty-data windows return structurally valid zero/empty responses.
- Trend and comparison values remain internally consistent.

## Known Pitfalls

- Inconsistent period boundaries due to timezone/date coercion.
- Mixed current/previous window calculations when span logic changes.
