# Metrics And Gates

The library computes deterministic metrics from scenario outcomes and turn events.

## Primary metric

### Task Success Rate

Definition:

- successful scenarios divided by total scenarios

Interpretation:

- Primary quality gate for launch readiness

## Supporting metrics

### Unresolved Turn Rate

Definition:

- scenarios flagged with unresolved response patterns divided by total scenarios

### Hallucination Rate

Definition:

- scenarios where forbidden claims were detected divided by total scenarios

### Fallback Quality

Definition:

- scenarios with acceptable fallback behavior divided by total scenarios

### Latency p50 p95 p99

Definition:

- percentile latencies computed from normalized per-turn metrics returned by ElevenLabs simulation payloads

## Default gate thresholds

- Task Success Rate >= 0.85
- Hallucination Rate <= 0.05
- Unresolved Turn Rate <= 0.10
- Latency p95 <= 1200 ms

These defaults are conservative and should be tuned for your production environment.

## Reports

Machine-readable:

- `summary.json` includes full run summary plus scenario and execution details
- includes external scorer payloads when enabled

Human-readable:

- `report.md` includes gate status, metric summary, and scenario-level notes
- includes external scorer summaries and per-scenario provider outputs

## External scoring mode

When external scorers are enabled, run summaries also include:

- `external_scoring_enabled`
- `external_scorers`
- `external_summary`
- `external_error_count`

Current built-in providers:

- `openai_evals`
- `noop`

Custom providers can be loaded using `python:<module>:<class>` if they implement the external scorer interface.

## Known limitations in v1

- No direct MOS or subjective UX scoring module yet
- No true WER/CER module yet because simulations are text-first interactions
- No cross-provider metrics normalization
