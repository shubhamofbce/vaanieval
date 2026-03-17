# 🎤 VaaniEval

Evaluation infrastructure for voice agents.

The eval layer for voice agents.

VaaniEval is an open-source evaluation framework for voice agents, designed as a developer-first alternative to closed evaluation platforms.

It provides deterministic scoring, scenario-based testing, and CI-ready pipelines that teams can inspect, customize, and run in their own environments.

Keywords: voice agent evaluation, conversational AI evals, ElevenLabs agents, speech-to-text evaluation, text-to-speech benchmarking, LLM evaluation, voice AI metrics, AI observability.

The current version is intentionally scoped to ElevenLabs in order to provide stable behavior and clear evaluation semantics.

## Overview

Modern voice agents combine multiple moving parts:

- ASR (speech-to-text)
- LLM reasoning
- TTS (text-to-speech)

VaaniEval evaluates this flow end-to-end and helps teams:

- Benchmark quality across realistic scenarios
- Detect regressions before production
- Measure latency and reliability trends
- Enforce quality gates in CI/CD

## Evaluation pipeline

VaaniEval is organized as a modular pipeline:

1. Scenario layer: structured test cases for happy paths, edge cases, and regressions
2. Execution layer: run scenarios against ElevenLabs agents and capture turns
3. Normalization layer: convert raw traces into consistent structured events
4. Scoring layer: deterministic rubric scoring for task success and failure patterns
5. Aggregation layer: run-level metrics such as pass rates and latency percentiles
6. Reporting layer: machine-readable JSON and human-readable Markdown artifacts
7. Gate layer: configurable thresholds for fail/pass decisions in automation

## Who this is for

- Teams building ElevenLabs voice agents that need repeatable quality checks
- Contributors who want to add metrics, datasets, adapters, or reports
- Researchers and practitioners who want an open, inspectable eval pipeline

## What you can evaluate

The library currently evaluates the following dimensions:

- Task Success Rate
- Unresolved Turn Rate
- Hallucination Rate using forbidden-claim checks
- Fallback quality behavior
- End-to-end latency distribution p50 p95 p99 from normalized turn metrics
- Scenario-level pass/fail with notes for debugging

## Key features

- Standalone package with Python API and CLI
- Scenario schema with starter smoke regression stress packs
- Deterministic rubric-based scoring
- JSON and Markdown reports
- Configurable launch gates and threshold overrides
- Optional live integration test for CI
- Open-source-friendly docs and contribution workflow

## Quick start

Install from PyPI (after publish):

```bash
pip install vaanieval
```

For local development:

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -e .
```

Set credentials:

```env
ELEVENLABS_API_KEY=xi_xxxxxxxxxxxxxxxxxxxx
ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxxxxxxx
# Optional for external OpenAI scoring:
OPENAI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxx
```

Run eval:

```bash
python -m vaanieval smoke
python -m vaanieval regression
python -m vaanieval custom --dataset datasets/regression/retrieval_regression.yaml

# Optional: enable OpenAI external scorer
python -m vaanieval smoke --external-scorers openai_evals
```

Artifacts are written to `.eval-reports/` by default:

- `summary.json`
- `report.md`

## Python API

```python
from vaanieval import run_smoke, run_regression, run_custom

smoke_result = run_smoke()
reg_result = run_regression(output_dir="./.eval-reports")
custom_result = run_custom("datasets/stress/stress_noise_interruptions.yaml")

print(smoke_result.summary.task_success_rate)
```

## CLI reference

Base command:

```bash
python -m vaanieval <command> [options]
```

Commands:

- `smoke`
- `regression`
- `custom --dataset <path>`

Shared options:

- `--config <path>`
- `--output-dir <path>`
- `--tsr-threshold <float>`
- `--latency-p95-threshold-ms <float>`
- `--unresolved-turn-threshold <float>`
- `--hallucination-threshold <float>`
- `--external-scorers <csv>`
- `--openai-api-key <key>`
- `--openai-model <model>`
- `--external-scorer-timeout-seconds <int>`

Example:

```bash
python -m vaanieval regression --output-dir ./.eval-reports --tsr-threshold 0.90
```

## Dataset and scenario model

Required scenario fields:

- `id`
- `category`
- `user_message`

Common optional fields:

- `expected_facts`
- `forbidden_claims`
- `completion_rule`
- `max_turns`
- `language`
- `safety_flags`

Starter datasets:

- `datasets/smoke/smoke_core.yaml`
- `datasets/regression/retrieval_regression.yaml`
- `datasets/stress/stress_noise_interruptions.yaml`

## Metrics and gate defaults

Default thresholds:

- Task Success Rate >= 0.85
- Hallucination Rate <= 0.05
- Unresolved Turn Rate <= 0.10
- Latency p95 <= 1200 ms

These defaults are configurable through env vars, config files, and CLI flags.

## Architecture at a glance

Pipeline:

1. Load config
2. Load and validate scenarios
3. Execute each scenario through ElevenLabs simulation adapter
4. Normalize events
5. Score per scenario
6. Aggregate metrics and evaluate gates
7. Emit reports

Core modules:

- `vaanieval/config.py`
- `vaanieval/scenarios/`
- `vaanieval/adapters/elevenlabs_adapter.py`
- `vaanieval/scoring/`
- `vaanieval/reporting/`
- `vaanieval/api.py`
- `vaanieval/cli.py`

## Supported platforms

### Current

- [x] ElevenLabs conversational agents

### Coming soon

- [ ] Deepgram-based voice agent pipelines
- [ ] Vapi voice agent pipelines
- [ ] Custom ASR plus LLM plus TTS pipeline adapters

## Documentation

- [Documentation index](docs/index.md)
- [Quickstart](docs/quickstart.md)
- [Configuration](docs/configuration.md)
- [Scenario Authoring](docs/scenarios.md)
- [Metrics And Gates](docs/metrics-and-gates.md)
- [Architecture](docs/architecture.md)
- [CLI And API Reference](docs/cli-and-api.md)
- [Contributing](docs/contributing.md)
- [Troubleshooting](docs/troubleshooting.md)

## CI and automation

GitHub Actions workflow:

- `.github/workflows/vaanieval.yml`

It runs:

- unit tests on pull requests and main
- optional live smoke eval when ElevenLabs secrets are available

## Compatibility notes

- Recommended Python versions: 3.11 and 3.12
- Python 3.14 may show warnings from current ElevenLabs SDK internals related to pydantic compatibility

## Legacy app files in this repository

This repository also contains the original sample voice assistant app and setup scripts:

- `examples/setup_agent.py`
- `examples/run_conversation.py`
- `examples/audio_interface.py`
- `examples/web/index.html`

They are useful as reference and manual experimentation tools; the primary open-source deliverable is the evaluation package under `vaanieval/`.

## Contributing

Please read [Contributing](docs/contributing.md) before submitting changes.

## Need help

If you need help evaluating your voice agent or want us to review or build your AI or Voice Agent
- Email: sraj13169@gmail.com

## License

Project metadata declares MIT in `pyproject.toml`.
