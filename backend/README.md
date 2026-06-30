# Backend MVP (Slices 1-3)

This folder contains a greenfield Python backend for the first three MVP slices:

1. Auth + provider connect + agent discovery
2. Historical import + queue + progress tracking
3. Conversations + media read APIs

## Tech stack

- FastAPI
- SQLAlchemy 2.x
- DB-backed queue (in `job_queue` table)
- SQLite by default for local development

## Folder layout

- `app/main.py`: FastAPI app and startup lifecycle
- `app/api/v1/`: API routers
- `app/models/`: SQLAlchemy models
- `app/services/`: Domain services (auth, import, queue, ElevenLabs client)
- `app/worker.py`: Queue worker loop
- `scripts/run_worker.py`: Worker entrypoint

## Local setup

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate

pip install -r requirements.txt
copy .env.example .env
```

For local Ollama evaluation setup, including Docker and LAN endpoint overrides, see [Configuration](../docs/configuration.md#ollama-evaluation-provider).

## Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run worker

Use a second terminal:

```bash
python scripts/run_worker.py
```

## API surface implemented now

### Auth

- `POST /api/v1/auth/magic-link`
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Provider

- `POST /api/v1/provider/connect`
- `POST /api/v1/provider/test`
- `GET /api/v1/provider/agents`
- `POST /api/v1/provider/agents/{agent_id}/default`

### Imports

- `POST /api/v1/imports`
- `GET /api/v1/imports/{import_job_id}`
- `GET /api/v1/imports/{import_job_id}/progress`
- `POST /api/v1/imports/{import_job_id}/cancel`

### Conversations

- `GET /api/v1/conversations`
- `GET /api/v1/conversations/{conversation_id}`

### Media

- `GET /api/v1/media/conversations/{conversation_id}/audio`
- `GET /api/v1/media/conversations/{conversation_id}/audio/stream`

## Notes

- Magic link endpoint returns a raw dev token only outside production. Production creates accounts and emails a sign-in link through the configured SMTP provider.
- Provider API key is currently stored directly in DB for MVP. Add encryption before production.
- Webhook ingestion is intentionally deferred.
