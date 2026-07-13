# VaaniEval Vercel Deployment Guide

This guide covers deploying VaaniEval to Vercel with a Neon PostgreSQL database and serverless cron-based job worker.

## Architecture Overview

- **Frontend**: React + Vite deployed to Vercel static hosting
- **Backend API**: FastAPI deployed as Vercel serverless functions (60s timeout)
- **Worker**: Python job processor running via Vercel Cron Jobs (calls `/api/v1/worker/drain` every 1 minute)
- **Database**: Neon PostgreSQL (free tier: 3 GiB storage, 7-day backups)
- **Cost**: $0/month (all free tiers)

## Prerequisites

1. **Vercel Account**: https://vercel.com (free tier)
2. **Neon Account**: https://neon.tech (free tier)
3. **Git Repository**: Your VaaniEval code pushed to GitHub
4. **Local Environment**: Node.js 18+, Python 3.9+, pip

## Phase 1: Local Testing (Verify Everything Works)

### 1.1 Set Up Local PostgreSQL

For local testing before deploying, you can use:

**Option A: Docker (Recommended)**
```bash
docker run --name vaanieval-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vaanieval -p 5432:5432 -d postgres:15
```

**Option B: Use Neon Connection Directly**
1. Skip to Phase 2 to create a Neon project
2. Use the Neon connection string in `.env` locally

### 1.2 Configure Local Environment

Create `backend/.env`:
```env
APP_ENV=dev
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vaanieval
# or use Neon:
# DATABASE_URL=postgresql://user:password@project-name.neon.tech/vaanieval

SECRET_KEY=dev-secret-key-change-in-prod
CREDENTIAL_ENCRYPTION_KEY=
CRON_SECRET=test-cron-secret
ELEVENLABS_API_KEY=
VAPI_API_KEY=
OPENAI_API_KEY=
```

### 1.3 Run Database Migrations

```bash
cd backend
alembic upgrade head
```

### 1.4 Start Local Services

Terminal 1 - Backend API:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Terminal 3 - Worker (polling mode):
```bash
cd backend
python -m app.worker
```

### 1.5 Test Job Processing

1. Create an import job via the UI
2. Verify worker processes jobs (check logs)
3. Manually test cron endpoint:
```bash
curl -X POST http://localhost:8000/api/v1/worker/drain \
  -H "X-Cron-Secret: test-cron-secret"
```

Expected response:
```json
{
  "processed": 5,
  "failed": 0,
  "errors": []
}
```

## Phase 2: Neon PostgreSQL Setup

### 2.1 Create Neon Project

1. Sign up at https://neon.tech
2. Create a new project (free tier)
3. Copy the connection string: `postgresql://user:password@project-name.neon.tech/vaanieval`

### 2.2 Run Migrations on Neon

```bash
export DATABASE_URL="postgresql://user:password@project-name.neon.tech/vaanieval"
cd backend
alembic upgrade head
```

Verify tables exist:
```bash
psql $DATABASE_URL -c "\dt"
```

## Phase 3: Vercel Deployment Setup

### 3.1 Create Vercel Project

1. Sign up at https://vercel.com (link your GitHub account)
2. Import your VaaniEval repository:
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Select Framework: **Other** (custom build steps)
   - Click "Deploy"

### 3.2 Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://user:password@project-name.neon.tech/vaanieval
SECRET_KEY=[strong-random-string]
CREDENTIAL_ENCRYPTION_KEY=[strong-random-string]
CRON_SECRET=[strong-random-string]
ELEVENLABS_API_BASE=https://api.elevenlabs.io
VAPI_API_BASE=https://api.vapi.ai
OPENAI_API_BASE=https://api.openai.com/v1
```

Generate strong random strings:
```bash
# Linux/Mac
openssl rand -hex 32

# Or use Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3.3 Verify Build Configuration

Vercel will automatically:
1. Run the buildCommand from `vercel.json`:
   - Build frontend: `npm --prefix frontend run build`
   - Install backend dependencies: `pip install -r backend/requirements.txt`
2. Deploy frontend to static hosting
3. Deploy backend functions to serverless

### 3.4 Test Deployment

After first deploy, verify:

```bash
# Health checks
curl https://[your-vercel-domain].vercel.app/health/live
curl https://[your-vercel-domain].vercel.app/health/ready

# API endpoint
curl https://[your-vercel-domain].vercel.app/api/v1/auth/me
```

## Phase 4: Set Up Vercel Cron Job

### 4.1 Create Cron Job Configuration

Create `vercel.cron.json` in your repository root:

```json
{
  "jobs": [
    {
      "name": "vaanieval-worker-drain",
      "path": "/api/v1/worker/drain",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

Or update `vercel.json` to include cron configuration (Vercel will read this automatically).

### 4.2 Enable Cron in Vercel Dashboard

1. Go to your Vercel project → Settings → Crons
2. Create new cron job:
   - **URL**: `https://[your-vercel-domain].vercel.app/api/v1/worker/drain`
   - **Schedule**: `*/1 * * * *` (every minute)
   - **Timezone**: Your preferred timezone

### 4.3 Verify Cron Job Execution

Monitor cron job execution in Vercel Dashboard → Functions → Logs

## Phase 5: Monitoring & Troubleshooting

### 5.1 View Backend Logs

Vercel Dashboard → Functions → Logs

### 5.2 Debug Failed Jobs

Check dead-letter queue in Neon:
```bash
psql $DATABASE_URL -c "SELECT * FROM dead_letter_jobs ORDER BY created_at DESC LIMIT 10;"
```

### 5.3 Monitor Cron Job Health

Set up alerts:
1. Vercel Dashboard → Project Settings → Notifications
2. Enable email alerts for function errors

### 5.4 Common Issues

**Issue: Jobs not processing**
- Verify CRON_SECRET matches between env vars and header
- Check Function Logs for errors
- Verify DATABASE_URL is correct
- Check PostgreSQL connection limits (Neon free tier has limits)

**Issue: Worker crashes mid-execution**
- Lease recovery runs automatically (2-minute stale lease timeout)
- Check Vercel function logs for timeout errors
- Consider increasing max_jobs parameter if jobs are too heavy

**Issue: Frontend can't reach API**
- Verify VITE_API_BASE_URL in frontend/.env.production
- Check CORS settings in backend/app/main.py
- Verify the deployed frontend origin (for production, `https://app.vaanieval.com`) is in `ALLOWED_ORIGINS`

## Local Development + Vercel Coexistence

Both local polling worker and Vercel cron worker can run simultaneously:
- **Lease-based locking** prevents duplicate execution
- **Idempotent job payloads** make retries safe
- **Stale lease recovery** prevents deadlock if either crashes

To test this:
1. Deploy to Vercel
2. Keep local worker running (`python -m app.worker`)
3. Create import jobs via UI - both workers will process them safely

## Rollback Strategy

If something goes wrong:

1. **Disable cron job** in Vercel Dashboard → Crons
2. **Keep local worker running** for emergency job processing
3. **Investigate and fix** in development
4. **Re-deploy** to Vercel

## Cost Optimization

Current setup is $0/month:
- Vercel: Free tier (up to 100 serverless function invocations/day)
- Neon: Free tier (3 GiB storage, 7-day backups)
- Worker: Runs via cron (1-2 minutes execution per minute, well within free tier)

If you exceed free tier limits:
- **Vercel Pro**: $20/month (higher function limits)
- **Neon Paid**: $19/month (more storage + compute)
- Consider consolidating cron schedule if jobs are light

## Next Steps

1. ✅ Complete local testing
2. ✅ Create Neon project
3. ✅ Deploy to Vercel
4. ✅ Set up cron job
5. Monitor logs and job processing
6. Iterate on performance if needed
