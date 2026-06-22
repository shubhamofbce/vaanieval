#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PATH="$ROOT_DIR/backend"
FRONTEND_PATH="$ROOT_DIR/frontend"
PYTHON_BIN="${PYTHON_BIN:-python3}"

log() {
  printf '[vaanieval] %s\n' "$1"
}

log "Preparing backend environment..."
cd "$BACKEND_PATH"

if [ ! -x ".venv/bin/python" ]; then
  "$PYTHON_BIN" -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

log "Running migrations..."
alembic upgrade head

log "Preparing frontend environment..."
cd "$FRONTEND_PATH"
npm install

log "Clearing ports 8000 and 5173..."
fkill_port() { lsof -ti tcp:"$1" 2>/dev/null | xargs kill -9 2>/dev/null || true; }
fkill_port 8000
fkill_port 5173
sleep 1

log "Starting backend API, worker, and frontend dev server..."
cd "$ROOT_DIR"

(
  cd "$BACKEND_PATH"
  source .venv/bin/activate
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info --access-log
) &
API_PID=$!

(
  cd "$BACKEND_PATH"
  source .venv/bin/activate
  python -m app.worker
) &
WORKER_PID=$!

(
  cd "$FRONTEND_PATH"
  npm run dev -- --host 0.0.0.0 --port 5173
) &
FRONTEND_PID=$!

cleanup() {
  log "Stopping services..."
  kill "$API_PID" "$WORKER_PID" "$FRONTEND_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

log "Services launched."
log "Frontend: http://localhost:5173"
log "Backend:  http://localhost:8000"

wait
