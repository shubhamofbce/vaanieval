# Architecture

VaaniEval is currently a full-stack app, not an installable Python package. The architecture is centered on a FastAPI backend, a React frontend, and a backend worker that processes imports and evaluations.

## High-level flow

1. Connect a voice provider account from the frontend.
2. Discover agents and import production conversations.
3. Normalize provider-specific conversation, transcript, media, and metadata into backend models.
4. Queue import and evaluation jobs for the worker.
5. Run evaluator providers against conversations and store metric scores with rationales.
6. Surface transcripts, audio playback, scores, and aggregates in the frontend workspace.

## Module map

- `backend/app/main.py` FastAPI application entrypoint
- `backend/app/api/v1/` API routes
- `backend/app/providers/` voice provider adapters
- `backend/app/services/` import, evaluation, auth, queue, credential, and provider services
- `backend/app/models/` SQLAlchemy persistence models
- `backend/app/worker.py` queue worker
- `frontend/src/` React app, pages, components, and API client

## Provider strategy

Provider support is adapter-based. ElevenLabs and Vapi are supported through backend adapters so provider-specific behavior remains isolated from the rest of the app.

## Evaluation strategy

Evaluations are managed by backend services and worker jobs. Evaluator providers produce metric scores and rationales that are stored with the conversation and displayed in the review workspace and dashboard.

## Data model highlights

- Users, sessions, and workspace auth state
- Provider accounts and discovered agents
- Conversations, transcript turns, insights, and media
- Import jobs and queue jobs
- Evaluation runs and metric scores

