<p align="center">
	<img src="docs/assets/screenshots/twitter_banner.png" alt="VaaniEval banner" width="100%">
</p>

<h1 align="center">VaaniEval</h1>

<p align="center">
	Open-source evaluation platform for Voice AI agents.
</p>

<p align="center">
	<a href="docs/quickstart.md">Quickstart</a> |
	<a href="docs/development.md">Development</a> |
	<a href="docs/backend-architecture.md">Architecture</a> |
	<a href="docs/features/README.md">Feature Playbooks</a> |
	<a href="docs/metrics-and-gates.md">Metrics</a> |
	<a href="docs/v2-plan/README.md">V2 Plan</a>
</p>

<p align="center">
	<a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
	<a href="pyproject.toml"><img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-blue.svg"></a>
	<a href="frontend/package.json"><img alt="Frontend" src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-00bcd4.svg"></a>
	<a href="backend/README.md"><img alt="Backend" src="https://img.shields.io/badge/Backend-FastAPI-009688.svg"></a>
</p>

VaaniEval is an open-source evaluation stack for teams that measure real conversation quality with production data from ElevenLabs and Vapi.

## Why VaaniEval

Most voice teams need more than a pass or fail result. They need replayable evidence, metric-level rationales, and workflows that help QA, product, and engineering ship improvements faster.

VaaniEval gives you:

- Real conversation ingestion (historical and ongoing imports)
- Conversation review workspace with transcript and audio playback
- Evaluation runs with score breakdowns and rationale
- Dashboard analytics with KPI cards, trend charts, and top-agent drilldowns
- Configurable voice providers and evaluator providers
- Queue-backed processing for reliability at scale

## Recently Added

- New analytics dashboard page with aggregated backend endpoint and trend visualizations
- Improved call-player waveform rendering in conversation detail
- Better subtitle sync strategy in both detail and list player views
- Agent-friendly feature playbooks split by backend and frontend folders

## Product Snapshot

- Frontend: React + Vite
- Backend API: FastAPI + SQLAlchemy
- Worker: DB-backed async job processing
- Voice providers: ElevenLabs and Vapi
- Evaluation provider: configurable, OpenAI-first defaults
- Storage: SQLite in local development (extensible to managed databases)

## Screenshots

<details>
<summary>Show screenshots</summary>

### Dashboard Analytics

![Dashboard Analytics](docs/assets/screenshots/dashboard-analytics.png)

### Conversations Overview

![Conversations Overview](docs/assets/screenshots/conversations-overview.png)

### Conversation Detail

![Conversation Detail](docs/assets/screenshots/conversation-detail.png)

### Provider Settings

![Provider Settings](docs/assets/screenshots/provider-settings.png)

</details>

## Quick Start

For full setup and troubleshooting, see [docs/development.md](docs/development.md).

### Windows

```powershell
./start-dev.cmd
```

or

```powershell
./start-dev.ps1
```

### macOS / Linux

```bash
chmod +x start-dev.sh
./start-dev.sh
```

Services:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Backend worker: started by the start scripts, required for imports and evaluations

If you run services manually, start the worker in a second terminal from backend:

```bash
python -m app.worker
```

## Architecture

For backend internals, see [docs/backend-architecture.md](docs/backend-architecture.md).

Provider support is adapter-based, so adding another voice platform follows the same factory and adapter pattern used for ElevenLabs and Vapi.

Highlights:

- Multi-layer backend (api, services, models, worker)
- Queue-driven ingestion and scoring jobs
- Conversation and evaluation run lifecycle tracking
- Encrypted provider credential support

## V2 Planning

- [V2 Plan Overview](docs/v2-plan/README.md)
- [V2 Roadmap](docs/v2-plan/roadmap.md)
- [V2 Score Taxonomy](docs/v2-plan/score-taxonomy.md)
- [V2 Audio Scalability Plan](docs/v2-plan/audio-scalability-plan.md)

## Documentation

- [Docs Index](docs/index.md)
- [Feature Playbooks For Agents](docs/features/README.md)
- [Backend Feature Playbooks](docs/features/backend/README.md)
- [Frontend Feature Playbooks](docs/features/frontend/README.md)
- [Quickstart](docs/quickstart.md)
- [Development Guide](docs/development.md)
- [Backend Architecture](docs/backend-architecture.md)
- [Metrics and Gates](docs/metrics-and-gates.md)
- [CLI and API](docs/cli-and-api.md)

## Build In Public

- [Day 2 Build Tweet Plan](tweets/day-2-build-update.md)

## Contributing

Contributions are welcome. Start with local setup from [docs/development.md](docs/development.md), then open a PR with:

- A clear problem statement
- Screenshots for UI changes
- Notes on migrations, jobs, or API behavior changes

## License

[MIT License](LICENSE)
