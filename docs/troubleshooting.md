# Troubleshooting

## Command not found for vaanieval

VaaniEval no longer ships a supported Python package or CLI. Use the full-stack app from `backend/` and `frontend/` instead. See [development.md](development.md) for the current local setup.

## Missing credentials

Error examples may mention missing provider or evaluator credentials.

Fix by connecting providers in the frontend Provider settings or filling local values in `backend/.env`.

## High latency gate failures

Symptoms:

- `gate_passed` false while task success is high

Actions:

- verify network and service region
- review the evaluation score configuration
- compare recent imports against older conversations

## Adapter errors on simulation calls

Actions:

- verify the provider API key and selected agent
- verify the agent exists and is accessible by the connected account
- check the backend worker logs and retry the import or evaluation

## YAML parse errors

Actions:

- validate indentation
- ensure required fields `id`, `category`, `user_message`
- test with existing starter datasets

## Python compatibility

Use Python 3.11+ for the backend service. If a provider SDK emits compatibility warnings, prefer the Python version documented in [development.md](development.md).

