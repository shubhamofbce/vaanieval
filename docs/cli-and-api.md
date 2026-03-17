# CLI And API Reference

## CLI

Base command:

```bash
python -m vaanieval <command> [options]
```

Commands:

- `smoke`
- `regression`
- `custom --dataset <path>`

Common options:

- `--config <path>` YAML or JSON config
- `--output-dir <path>` report directory
- `--tsr-threshold <float>`
- `--latency-p95-threshold-ms <float>`
- `--unresolved-turn-threshold <float>`
- `--hallucination-threshold <float>`
- `--external-scorers <csv>`
- `--openai-api-key <key>`
- `--openai-model <model>`
- `--external-scorer-timeout-seconds <int>`

Examples:

```bash
python -m vaanieval smoke
python -m vaanieval regression --output-dir ./.eval-reports
python -m vaanieval custom --dataset datasets/stress/stress_noise_interruptions.yaml
python -m vaanieval smoke --external-scorers openai_evals
```

## Python API

```python
from vaanieval import run_smoke, run_regression, run_custom

smoke_result = run_smoke()
reg_result = run_regression(output_dir="./.eval-reports")
custom_result = run_custom("datasets/regression/retrieval_regression.yaml")

openai_scored = run_smoke(
	external_scorers=["openai_evals"],
	openai_api_key="sk-...",
	openai_model="gpt-4o-mini",
)
```

Return type:

- `EvalRunResult` with fields:
- `summary`
- `scenario_scores`
- `execution`

## Summary fields

- `run_type`
- `scenario_count`
- `passed_count`
- `task_success_rate`
- `unresolved_turn_rate`
- `hallucination_rate`
- `fallback_quality`
- `latency_p50_ms`
- `latency_p95_ms`
- `latency_p99_ms`
- `gate_passed`
- threshold fields
- `external_scoring_enabled`
- `external_scorers`
- `external_summary`
- `external_error_count`

