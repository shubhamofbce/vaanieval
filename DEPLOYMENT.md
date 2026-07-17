# Deployment

VaaniEval uses three independently deployed services:

| Service | Source | Production |
| --- | --- | --- |
| Public site | `site/` | Vercel at `https://www.vaanieval.com` |
| Product app | `frontend/` | Vercel at `https://app.vaanieval.com` |
| API and worker | `backend/` | Azure Container Apps, API at `https://api.vaanieval.com` |

The API and worker use the same container image, PostgreSQL database, and secrets. Only the API receives public ingress.

## Public site

The root `vercel.json` builds and routes the Next.js site.

```bash
npm --prefix site install
npm --prefix site run build
```

Import the repository into Vercel using the root project configuration and attach `www.vaanieval.com`.

## Product app

The product is a separate Vercel project rooted at `frontend/`.

```bash
npm --prefix frontend install
npm --prefix frontend run build
```

`frontend/vercel.json` proxies `/api/v1/*` to `https://api.vaanieval.com` and adds `noindex, nofollow` headers. Attach `app.vaanieval.com`.

## Backend

Required Azure resources:

- Azure Container Registry
- Azure Container Apps environment
- Azure Database for PostgreSQL Flexible Server
- Public API Container App
- Private worker Container App

Build the shared image:

```bash
az acr build \
  --registry <acr-name> \
  --image vaanieval-backend:latest \
  --file backend/Dockerfile \
  backend
```

Run migrations from the built image before routing production traffic:

```bash
alembic upgrade head
```

Container start commands:

```bash
# API
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Worker
python -m app.worker
```

## Backend environment

Start from `backend/.env.example` and configure at least:

```env
APP_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/vaanieval?sslmode=require
SECRET_KEY=<strong-random-value>
CREDENTIAL_ENCRYPTION_KEY=<fernet-key>
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

Do not reuse development secrets or commit production values.

## Verification

```bash
curl https://api.vaanieval.com/health/live
curl https://api.vaanieval.com/health/ready
```

Also verify:

- `https://www.vaanieval.com` serves the public site.
- `https://app.vaanieval.com` serves the product and remains excluded from indexing.
- API and worker logs show the same database configuration.
- Migrations completed before imports or evaluations are started.
