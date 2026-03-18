from __future__ import annotations

import json
from pathlib import Path

from vaanieval.models import EvalRunResult


def write_json_report(result: EvalRunResult, output_dir: str) -> Path:
    path = Path(output_dir) / "summary.json"
    path.write_text(json.dumps(result.to_dict(), indent=2), encoding="utf-8")
    return path
