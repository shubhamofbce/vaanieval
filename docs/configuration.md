# Configuration

Configuration for the current VaaniEval app lives in the backend service and connected provider settings. VaaniEval is not currently published as a Python package and does not expose a supported CLI.

## Environment variables

Start from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

Key backend settings include:

- `APP_ENV`
- `ALLOWED_ORIGINS`
- `FRONTEND_APP_URL`
- `DATABASE_URL`
- `SECRET_KEY`
- `CREDENTIAL_ENCRYPTION_KEY`
- `CRON_SECRET`
- `ELEVENLABS_API_BASE`
- `VAPI_API_BASE`
- `OPENAI_API_BASE`

Provider credentials should be entered through the frontend Provider settings where possible. Local development can also use environment variables when backend services require them directly.

## Frontend configuration

Start from `frontend/.env.example` when frontend-specific settings are needed. The most common setting is the backend API base URL used by the React app.

## API docs

When the backend is running, open the generated FastAPI docs:

```text
http://localhost:8000/docs
```

