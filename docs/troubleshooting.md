# Troubleshooting

## Command not found for vaanieval

Use module execution directly:

```bash
python -m vaanieval --help
```

If needed, reinstall package:

```bash
pip install -e .
```

## Missing credentials

Error examples mention missing `ELEVENLABS_API_KEY` or `ELEVENLABS_AGENT_ID`.

Fix by setting env vars or config file values.

## High latency gate failures

Symptoms:

- `gate_passed` false while task success is high

Actions:

- verify network and service region
- tune threshold via `--latency-p95-threshold-ms`
- compare smoke vs regression behavior

## Adapter errors on simulation calls

Actions:

- verify API key and agent id
- verify agent exists and is accessible by key
- retry with `VAANIEVAL_MAX_RETRIES`

## YAML parse errors

Actions:

- validate indentation
- ensure required fields `id`, `category`, `user_message`
- test with existing starter datasets

## Python 3.14 warning from elevenlabs

You may see pydantic compatibility warnings with current ElevenLabs SDK internals.

Recommended:

- use Python 3.11 or 3.12 for local and CI runs

