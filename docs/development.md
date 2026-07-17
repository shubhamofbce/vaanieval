# Development

This is the source of truth for local setup, configuration, validation, and common development problems.

- Backend API (FastAPI)
- Worker (queue processor)
- Frontend (React + Vite)
- Public site (Next.js, optional for product development)

## Prerequisites

- Python 3.11+ (3.13 also works)
- Node.js 20+ and npm
- Git

## One-command startup

### Windows

```powershell
./start-dev.cmd
```

or

```powershell
./start-dev.ps1
```

### macOS / Linux

```bash
chmod +x start-dev.sh
./start-dev.sh
```

## Manual startup (all platforms)

### 1. Backend setup

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create env file:

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Run migrations:

```bash
alembic upgrade head
```

### 2. Start backend API

From `backend/`:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Start worker

In a second terminal, from `backend/`:

```bash
python -m app.worker
```

### 4. Start frontend

From `frontend/` in a third terminal:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

### 5. Start the public site when needed

From the repository root:

```bash
npm --prefix site install
npm --prefix site run dev
```

## Configuration

Backend configuration starts from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

The important settings are:

- `DATABASE_URL`
- `SECRET_KEY`
- `CREDENTIAL_ENCRYPTION_KEY`
- `ALLOWED_ORIGINS`
- `FRONTEND_APP_URL`
- `SMTP_*`
- `ELEVENLABS_API_BASE`
- `VAPI_API_BASE`
- `OPENAI_API_BASE`

Use the product's Provider settings for provider credentials where possible. The frontend API URL can be overridden with `VITE_API_BASE_URL`.

## Verify the stack

- Frontend: http://localhost:5173
- Backend liveness: http://localhost:8000/health/live
- Backend readiness: http://localhost:8000/health/ready
- API docs: http://localhost:8000/docs

Suggested smoke flow:

1. Login using magic-link dev flow.
2. Open Provider settings and connect provider/eval model.
3. Run/import conversations.
4. Open Conversations workspace and trigger evaluation.

## Validation

Backend:

```bash
python -m ruff check .
python -m ruff format --check .
python -m pytest
```

Product frontend:

```bash
npm --prefix frontend run build
```

Public site:

```bash
npm --prefix site run build
```

## Troubleshooting

### Worker does not process jobs

- Ensure worker terminal is running from `backend/`.
- Ensure API and worker use the same `DATABASE_URL` value.

### API fails on startup

- Confirm `.env` exists in `backend/`.
- Re-run migrations: `alembic upgrade head`.
- Check that your venv Python is being used.

### Frontend cannot call backend

- Confirm backend is on `http://localhost:8000`.
- Confirm frontend is on `http://localhost:5173`.
- Verify `VITE_API_BASE_URL` if customized.

### Provider or evaluator credentials are rejected

- Reconnect the provider from Provider settings.
- Confirm the credential belongs to the selected provider.
- Check the API and worker logs for the underlying provider response.

### Import or evaluation stays queued

- Confirm the worker is running.
- Confirm the API and worker share the same `DATABASE_URL`.
- Inspect failed and dead-letter jobs before retrying.

### Port already in use

Use alternate ports:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
npm run dev -- --host 0.0.0.0 --port 5174
```

## API

The generated FastAPI OpenAPI documentation at http://localhost:8000/docs is the maintained API reference.
