# Frontend

Authenticated React product for reviewing conversations, running evaluations, and inspecting quality analytics.

## Run locally

```bash
npm install
npm run dev
```

The default backend URL is `http://localhost:8000`. Override it with `VITE_API_BASE_URL`.

## Validate

```bash
npm run lint
npm run build
```

Design tokens and shared styles live in `src/index.css`. Reuse existing components before adding page-specific primitives.

See [development](../docs/development.md) and [architecture](../docs/architecture.md).
