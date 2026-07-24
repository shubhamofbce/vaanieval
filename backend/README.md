# Backend

FastAPI API and queue worker for VaaniEval.

## Stack

- FastAPI
- SQLAlchemy and Alembic
- SQLite for local development
- PostgreSQL for production
- DB-backed queue with leases, retries, and dead-letter handling

## Layout

- `app/main.py`: FastAPI entrypoint
- `app/api/v1/`: API routers
- `app/providers/`: Voice-provider adapters
- `app/services/`: Auth, import, evaluation, credential, and queue services
- `app/models/`: SQLAlchemy models
- `app/worker.py`: Queue worker
- `alembic/`: Database migrations

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
```

Install `audiowaveform` to generate the real, clickable audio peaks used by the
call player. On macOS: `brew install audiowaveform`. Set `AUDIOWAVEFORM_BINARY`
in `.env` when the binary is not on `PATH`.

On Windows, activate the environment with `.\.venv\Scripts\Activate.ps1` and copy the environment file with `Copy-Item .env.example .env`.

## Run

```bash
# API
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Worker, in a second terminal
python -m app.worker
```

Open http://localhost:8000/docs for the generated API reference.

## Pipecat direct call ingestion

Workspace owners create a one-time ingest key with `POST /api/v1/ingest/keys`
(authenticated with their browser session). A Pipecat server then posts completed
call transcripts to `POST /api/v1/ingest/pipecat/calls` with that value in the
`X-VaaniEval-Key` header. Replaying the same `call_id` updates its transcript
instead of creating another conversation. The endpoint does not accept recording
URLs; this prevents an ingest client from causing server-side requests to an
arbitrary address.

Example Pipecat completion payload:

```json
{
  "call_id": "a-stable-pipecat-session-id",
  "agent_id": "concierge-v1",
  "agent_name": "Concierge",
  "started_at": "2026-07-24T08:00:00Z",
  "ended_at": "2026-07-24T08:01:12Z",
  "turns": [
    {"role": "user", "text": "I need to change my reservation.", "started_ms": 0},
    {"role": "assistant", "text": "I can help with that.", "started_ms": 860}
  ]
}
```

The first successful ingest queues an evaluation when the workspace has an
evaluation provider configured. Later deliveries of the same `call_id` replace
the transcript but do not create duplicate evaluation runs.

See [development](../docs/development.md), [architecture](../docs/architecture.md), and [deployment](../DEPLOYMENT.md).
