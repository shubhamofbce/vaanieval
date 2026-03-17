# Contributing

Thanks for contributing.

## Contribution areas

- Scenario packs for new domains
- Rubric improvements for better deterministic scoring
- Reporting enhancements
- CI and release automation
- Documentation and examples

## Development setup

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -e .[dev]
```

## Run tests

```bash
python -m unittest discover -s tests -p "test_*.py"
```

Live integration test is opt-in:

```bash
# Windows PowerShell
$env:VAANIEVAL_RUN_LIVE="1"
python -m unittest tests.integration.test_live_elevenlabs_smoke
```

## Coding guidelines

- Keep evaluator behavior deterministic by default.
- Keep provider-specific logic inside adapters.
- Add tests for all metric or rubric changes.
- Maintain backward compatibility for report summary fields where possible.

## Pull request checklist

- Tests added or updated
- Docs updated
- No breaking changes without migration notes
- Scenario files validated

## Security and secrets

- Never commit API keys
- Use local env files or CI secret stores

## License

Project metadata currently declares MIT in `pyproject.toml`.

