# Contributing

Thanks for contributing to VaaniEval.

This document is a practical playbook for shipping high-quality changes quickly,
especially when using GitHub Copilot.

## Contribution areas

- Scenario packs for new domains
- Rubric improvements for deterministic scoring
- Reporting enhancements
- CI and release automation
- Documentation and examples

## Core principles

- Keep evaluator behavior deterministic by default.
- Keep provider-specific logic inside `vaanieval/adapters/`.
- Add tests for metric, rubric, schema, and scoring changes.
- Preserve backward compatibility for summary/report fields when possible.
- Prefer small, targeted changes over broad refactors.

## Local development setup

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -e .[dev]
```

Create local credentials from `.env.example`.

## Daily development loop

1. Pick one scoped task (feature, bug, docs, or tooling).
2. Make the smallest safe change.
3. Run checks locally.
4. Update docs if behavior changed.
5. Open a PR with a clear summary and validation output.

## Required quality checks before PR

```bash
python -m ruff check .
python -m ruff format --check .
python -m mypy vaanieval tests
python -m pytest
```

## Optional git hook automation

```bash
pre-commit install
pre-commit run --all-files
```

## Tests

Run all tests:

```bash
python -m pytest
```

Live integration test is opt-in:

```bash
# Windows PowerShell
$env:VAANIEVAL_RUN_LIVE="1"
python -m pytest tests/integration/test_live_elevenlabs_smoke.py
```

## Using Copilot effectively in this repo

### Always-on repository guidance

Copilot uses repository instructions from:

- `.github/copilot-instructions.md`
- `.github/instructions/python.instructions.md`
- `.github/instructions/datasets.instructions.md`
- `.github/instructions/docs.instructions.md`

When asking Copilot to change code, include:

- exact scope (files/modules)
- expected behavior
- non-goals
- required tests/docs updates

### Prompt templates available

Reuse these prompt files for consistent results:

- `.github/prompts/feature-implementation.prompt.md`
- `.github/prompts/bugfix-regression.prompt.md`
- `.github/prompts/docs-sync.prompt.md`

Recommended usage:

1. Open the prompt file.
2. Paste/adapt it into Copilot Chat with your task-specific details.
3. Ask Copilot to implement changes and run required checks.
4. Ask for a short validation summary before creating PR.

### Best Copilot workflow for productivity

1. Start with a precise task request.
2. Ask Copilot to propose a minimal plan.
3. Implement in small iterations.
4. Run checks after each meaningful change.
5. Request docs sync when CLI/API behavior changes.

### What to watch out for when using Copilot

- Avoid broad rewrites unless explicitly needed.
- Ensure new logic remains deterministic.
- Do not move provider-specific logic outside adapters.
- Do not introduce breaking CLI flag changes unintentionally.
- Confirm report summary field names remain stable.
- Never paste real secrets into tracked files or prompts.

## Pull request expectations

- Link related issue when applicable.
- Include what changed and why.
- Include validation commands run.
- Include tests for behavior changes.
- Update docs for user-facing changes.
- Keep PRs focused and reviewable.

Use `.github/PULL_REQUEST_TEMPLATE.md` when opening PRs.

## Security and secrets

- Never commit API keys, tokens, or credentials.
- Keep real values only in local `.env` and CI secret stores.
- Use placeholders in `.env.example`.
- If a secret is exposed, rotate it immediately and remove it from history if needed.

## Definition of done

A contribution is done when:

- local checks pass
- CI checks pass
- tests cover the change
- docs are updated (if needed)
- PR description clearly explains impact

## License

This project is licensed under MIT. See `LICENSE`.

