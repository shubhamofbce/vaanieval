# Azure Backend Deployment

This backend deploys to Azure as one container image with two Container Apps:

- `api`: public FastAPI HTTP service on port `8000`
- `worker`: private long-running queue worker using `python -m app.worker`

Both apps must share the same PostgreSQL database and secrets.

The production API is available at `https://api.vaanieval.com`, with application routes under
`https://api.vaanieval.com/api/v1`.

## Required Azure resources

- Azure Container Registry
- Azure Container Apps environment
- Azure Database for PostgreSQL Flexible Server
- Two Azure Container Apps using the same image

## Required environment variables

```env
APP_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/vaanieval?sslmode=require
SECRET_KEY=<strong-random-value>
CREDENTIAL_ENCRYPTION_KEY=<fernet-key>
CRON_SECRET=<strong-random-value>
ALLOWED_ORIGINS=https://app.vaanieval.com,https://www.vaanieval.com
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none
FRONTEND_APP_URL=https://app.vaanieval.com
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM_EMAIL="VaaniEval <noreply@vaanieval.com>"
SMTP_USE_TLS=true
ELEVENLABS_API_BASE=https://api.elevenlabs.io
VAPI_API_BASE=https://api.vapi.ai
OPENAI_API_BASE=https://api.openai.com/v1
```

For local development, keep `SESSION_COOKIE_SECURE=false`, `SESSION_COOKIE_SAMESITE=lax`, and localhost origins.

## Commands

Build the image in ACR:

```bash
az acr build --registry <acr-name> --image vaanieval-backend:latest --file backend/Dockerfile backend
```

Run migrations from the built image before starting production traffic:

```bash
alembic upgrade head
```

Start commands:

```bash
# API
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Worker
python -m app.worker
```
