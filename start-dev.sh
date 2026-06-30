#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PATH="$ROOT_DIR/backend"
FRONTEND_PATH="$ROOT_DIR/frontend"
MIN_PYTHON_MINOR=11

log() {
  printf '[vaanieval] %s\n' "$1"
}

python_is_supported() {
  "$1" -c "import sys; raise SystemExit(0 if sys.version_info >= (3, $MIN_PYTHON_MINOR) else 1)" >/dev/null 2>&1
}

find_python() {
  local candidate

  if [ -n "${PYTHON_BIN:-}" ]; then
    if command -v "$PYTHON_BIN" >/dev/null 2>&1 && python_is_supported "$PYTHON_BIN"; then
      printf '%s\n' "$PYTHON_BIN"
      return
    fi
    log "PYTHON_BIN must point to Python 3.$MIN_PYTHON_MINOR or newer." >&2
    return 1
  fi

  for candidate in python3.13 python3.12 python3.11 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && python_is_supported "$candidate"; then
      printf '%s\n' "$candidate"
      return
    fi
  done

  log "Python 3.$MIN_PYTHON_MINOR or newer is required. Install it with 'brew install python@3.13', or set PYTHON_BIN." >&2
  return 1
}

PYTHON_BIN="$(find_python)"

log "Preparing backend environment..."
cd "$BACKEND_PATH"

if [ -x ".venv/bin/python" ] && ! python_is_supported ".venv/bin/python"; then
  log "Rebuilding incompatible virtual environment with $PYTHON_BIN..."
  "$PYTHON_BIN" -m venv --clear .venv
elif [ ! -x ".venv/bin/python" ]; then
  "$PYTHON_BIN" -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

if ! grep -Eq '^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*[^[:space:]#]+' .env; then
  export DATABASE_URL='sqlite:///./backend.db'
  log "Using the local SQLite database."
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
