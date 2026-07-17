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

On Windows, activate the environment with `.\.venv\Scripts\Activate.ps1` and copy the environment file with `Copy-Item .env.example .env`.

## Run

```bash
# API
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Worker, in a second terminal
python -m app.worker
```

Open http://localhost:8000/docs for the generated API reference.

See [development](../docs/development.md), [architecture](../docs/architecture.md), and [deployment](../DEPLOYMENT.md).
