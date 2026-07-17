# Contributing

Thanks for contributing to VaaniEval.

## Principles

- Keep provider-specific logic inside backend provider adapters.
- Preserve workspace scoping and encrypted credential handling.
- Keep queue handlers idempotent and API/worker behavior aligned.
- Add tests for changed behavior.
- Prefer focused changes over broad rewrites.

## Setup

Follow [docs/development.md](docs/development.md).

## Before opening a pull request

Run the checks relevant to your change:

```bash
python -m ruff check .
python -m ruff format --check .
python -m pytest
npm --prefix frontend run build
npm --prefix site run build
```

- Explain what changed and why.
- Include the validation commands run.
- Add screenshots for visible UI changes.
- Update the maintained documentation when setup, architecture, or deployment changes.

## Security

- Never commit API keys, tokens, or credentials.
- Keep real values in local `.env` files or secret stores.
- Use placeholders in `.env.example`.
- Never include private conversation data, customer names, or personal information in issues, discussions, tests, or screenshots.

Use [GitHub Discussions](https://github.com/shubhamofbce/vaanieval/discussions) for questions and early proposals. Use [GitHub Issues](https://github.com/shubhamofbce/vaanieval/issues) for reproducible defects and scoped work.
