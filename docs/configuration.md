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
- `OLLAMA_BASE_URL`
- `OLLAMA_REQUEST_TIMEOUT_SECONDS`

Provider credentials should be entered through the frontend Provider settings where possible. Local development can also use environment variables when backend services require them directly.

## Ollama evaluation provider

Install [Ollama](https://ollama.com/download), start it, and install at least one model:

```bash
ollama serve
ollama pull llama3.2
```

VaaniEval discovers installed models from Ollama and never pulls, deletes, or chooses a model automatically. Open **Providers & Integrations**, select **Ollama**, and choose one of the discovered models. Ollama runs without an API key.

The default endpoint is suitable when Ollama, the API, and the worker run on the same machine:

```dotenv
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_REQUEST_TIMEOUT_SECONDS=300
```

If the VaaniEval processes run in Docker while Ollama runs on the host, use the host address supported by your Docker installation, commonly:

```dotenv
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

For Ollama on another LAN host, configure its reachable HTTP address instead. Ollama must be configured to listen on the required interface and protected according to your network policy; VaaniEval does not add Ollama authentication.

The API process validates model selections before queuing and the worker calls Ollama when executing evaluations. Both processes must therefore use the same `OLLAMA_BASE_URL` and timeout settings.

## Frontend configuration

Start from `frontend/.env.example` when frontend-specific settings are needed. The most common setting is the backend API base URL used by the React app.

## API docs

When the backend is running, open the generated FastAPI docs:

```text
http://localhost:8000/docs
```

