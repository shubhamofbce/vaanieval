# Backend API Reference

VaaniEval does not currently ship a supported Python package, PyPI install, or `python -m vaanieval` CLI. The supported runtime is the full-stack app:

- `backend/` FastAPI service
- `backend/app/worker.py` queue worker
- `frontend/` React + Vite app

## Local API

Start the backend from `backend/`:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Run the worker in a second terminal:

```bash
python -m app.worker
```

Open the generated API docs:

```text
http://localhost:8000/docs
```

## Main API Areas

- Auth and workspace session
- Provider account connection and agent discovery
- Conversation imports and import progress
- Conversation detail, transcript, insights, and media
- Evaluation runs and metric scores
- Dashboard aggregates
- Worker drain and job lifecycle

## Useful References

- [Development Guide](development.md)
- [Backend Architecture](backend-architecture.md)
- [Backend Feature Playbooks](features/backend/README.md)
- [Frontend Feature Playbooks](features/frontend/README.md)

