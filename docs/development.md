# Development Guide (V2)

This guide gets the full V2 stack running locally:

- Backend API (FastAPI)
- Worker (queue processor)
- Frontend (React + Vite)

## Prerequisites

- Python 3.11+ (3.13 also works)
- Node.js 20+ and npm
- Git

## Project Layout

- `backend/` FastAPI API, DB models, migrations, worker
- `frontend/` React UI
- `start-dev.ps1` Windows bootstrap and launcher
- `start-dev.sh` macOS/Linux bootstrap and launcher

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

## Verify the stack

- Frontend: http://localhost:5173
- Backend API health root: http://localhost:8000
- API docs: http://localhost:8000/docs

Suggested smoke flow:

1. Login using magic-link dev flow.
2. Open Provider settings and connect provider/eval model.
3. Run/import conversations.
4. Open Conversations workspace and trigger evaluation.

## Common issues

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

### Port already in use

Use alternate ports:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
npm run dev -- --host 0.0.0.0 --port 5174
```

## Running tests

Backend tests (root):

```bash
pytest
```

Frontend type/build validation:

```bash
cd frontend
npm run build
```
