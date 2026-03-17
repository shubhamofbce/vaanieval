# Configuration

Configuration can be provided through environment variables and optionally a YAML or JSON config file.

## Environment variables

Required:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`

Optional:

- `VAANIEVAL_OUTPUT_DIR` default `.eval-reports`
- `VAANIEVAL_TIMEOUT_SECONDS` default `45`
- `VAANIEVAL_MAX_RETRIES` default `1`
- `VAANIEVAL_TSR_THRESHOLD` default `0.85`
- `VAANIEVAL_UNRESOLVED_TURN_THRESHOLD` default `0.10`
- `VAANIEVAL_HALLUCINATION_THRESHOLD` default `0.05`
- `VAANIEVAL_LATENCY_P95_THRESHOLD_MS` default `1200`
- `VAANIEVAL_EXTERNAL_SCORERS` default empty
- `OPENAI_API_KEY` required when `openai_evals` scorer is enabled
- `VAANIEVAL_OPENAI_MODEL` default `gpt-4o-mini`
- `VAANIEVAL_EXTERNAL_SCORER_TIMEOUT_SECONDS` default `30`

## Config file

Pass config with `--config`:

```bash
python -m vaanieval smoke --config ./eval-config.yaml
```

YAML example:

```yaml
elevenlabs_api_key: xi_xxxxxxxxxxxxxxxxxxxx
elevenlabs_agent_id: agent_xxxxxxxxxxxxxxxxx
output_dir: .eval-reports
timeout_seconds: 45
max_retries: 1
tsr_threshold: 0.85
unresolved_turn_rate_threshold: 0.10
hallucination_rate_threshold: 0.05
latency_p95_threshold_ms: 1200
enabled_external_scorers:
  - openai_evals
openai_api_key: sk_xxxxxxxxxxxxxxxxxxxxx
openai_model: gpt-4o-mini
external_scorer_timeout_seconds: 30
```

## Precedence

- Config file values override environment defaults.
- CLI threshold flags can override threshold env values for a run.

## CLI threshold overrides

```bash
python -m vaanieval regression \
  --tsr-threshold 0.88 \
  --latency-p95-threshold-ms 1500 \
  --unresolved-turn-threshold 0.12 \
  --hallucination-threshold 0.03
```

Enable external scorers from CLI:

```bash
python -m vaanieval smoke \
  --external-scorers openai_evals \
  --openai-model gpt-4o-mini
```

Pluggable custom provider format:

```bash
python -m vaanieval smoke \
  --external-scorers "python:my_package.my_scorer:MyScorer"
```

