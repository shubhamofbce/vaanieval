# Quickstart

This guide helps you run the VaaniEval full-stack app locally. VaaniEval is not currently published as a Python package and does not expose a supported CLI; the source of truth is the `backend/` service, `frontend/` app, and backend worker.

## 1. Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- Git
- ElevenLabs or Vapi credentials for importing production conversations
- Evaluator provider credentials, such as OpenAI, for scoring

## 2. Start the app

From the repository root:

Windows:

```powershell
./start-dev.cmd
```

or:

```powershell
./start-dev.ps1
```

macOS/Linux:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

Services:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Backend API docs: http://localhost:8000/docs
- Backend worker: started by the dev scripts

## 3. Configure providers

Open the frontend and use Provider settings to connect:

- A voice provider: ElevenLabs or Vapi
- An evaluator provider: OpenAI-first defaults, with additional provider support in the backend

For manual setup, copy the backend env example and fill in local values:

```bash
cd backend
cp .env.example .env
```

Then run migrations:

```bash
alembic upgrade head
```

## 4. Run your first evaluation

1. Log in with the local development flow.
2. Connect a provider account.
3. Import conversations.
4. Open the Conversations workspace.
5. Trigger an evaluation run and review metric scores, rationales, transcript, and audio playback.

For the full setup guide, see [development.md](development.md).

