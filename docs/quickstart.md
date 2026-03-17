# Quickstart

This guide helps you run your first evaluation in under 10 minutes.

## 1. Prerequisites

- Python 3.10+
- ElevenLabs API key
- ElevenLabs conversational agent id

## 2. Install

From PyPI (after publish):

```bash
pip install vaanieval
```

From source (local development):

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -e .
```

## 3. Configure credentials

Set environment variables:

```env
ELEVENLABS_API_KEY=xi_xxxxxxxxxxxxxxxxxxxx
ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxxxxxxx
```

On Windows PowerShell:

```powershell
$env:ELEVENLABS_API_KEY="xi_xxxxxxxxxxxxxxxxxxxx"
$env:ELEVENLABS_AGENT_ID="agent_xxxxxxxxxxxxxxxxx"
```

## 4. Run smoke eval

```bash
python -m vaanieval smoke
```

Optional output directory:

```bash
python -m vaanieval smoke --output-dir ./.eval-reports
```

## 5. Review outputs

By default, outputs are written to `.eval-reports/`:

- `summary.json` for machine-readable metrics
- `report.md` for human-readable summary

## 6. Run broader suites

```bash
python -m vaanieval regression
python -m vaanieval custom --dataset datasets/regression/retrieval_regression.yaml
```

## 7. Use as a Python library

```python
from vaanieval import run_smoke

result = run_smoke()
print(result.summary.task_success_rate)
```

## Notes

- This package is ElevenLabs-only in v1 by design.
- If you see pydantic warnings on Python 3.14, use Python 3.11 or 3.12 for best compatibility.

