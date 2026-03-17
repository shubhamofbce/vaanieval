# Architecture

The package executes evaluation as a deterministic pipeline with a provider-specific runtime adapter.

## High-level flow

1. Load configuration from env and optional config file
2. Load and validate scenario dataset
3. Execute each scenario through ElevenLabs simulation adapter
4. Normalize turn events and collect analysis metadata
5. Score each scenario with deterministic rubric
6. Aggregate metrics and evaluate gates
7. Write JSON and Markdown reports

## Module map

- `vaanieval/config.py` config model and loading
- `vaanieval/scenarios/` schema and loader
- `vaanieval/adapters/elevenlabs_adapter.py` runtime execution and event normalization
- `vaanieval/scoring/rubric.py` scenario-level deterministic checks
- `vaanieval/scoring/metrics.py` run-level metric aggregation
- `vaanieval/reporting/` report emitters
- `vaanieval/api.py` Python API
- `vaanieval/cli.py` command-line interface

## Why ElevenLabs-only

The library is deliberately scoped to ElevenLabs in v1 so behavior and metrics stay reliable and easy to reason about.

## Extension strategy

A base adapter interface exists in `vaanieval/adapters/base.py` to support future adapters after the ElevenLabs path is hardened.

## Data model highlights

- `EvalScenario` scenario contract
- `TurnEvent` normalized conversation turn event
- `ScenarioScore` per-scenario scoring output
- `RunSummary` aggregate metrics and gate result
- `EvalRunResult` full output object

