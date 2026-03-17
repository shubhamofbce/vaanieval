from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from vaanieval.models import EvalScenario
from vaanieval.scenarios.schema import validate_scenario_payload


def load_scenarios(path: str) -> list[EvalScenario]:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Scenario file not found: {path}")

    data = yaml.safe_load(file_path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "scenarios" in data:
        scenarios_raw = data["scenarios"]
    elif isinstance(data, list):
        scenarios_raw = data
    else:
        raise ValueError("Scenario file must contain a list or a top-level 'scenarios' key")

    scenarios: list[EvalScenario] = []
    all_errors: list[str] = []

    for idx, payload in enumerate(scenarios_raw):
        if not isinstance(payload, dict):
            all_errors.append(f"scenario[{idx}] must be an object")
            continue
        errors = validate_scenario_payload(payload)
        if errors:
            all_errors.append(f"scenario[{idx}] {payload.get('id', '<no-id>')}: {'; '.join(errors)}")
            continue

        scenarios.append(
            EvalScenario(
                id=payload["id"],
                category=payload["category"],
                user_message=payload["user_message"],
                expected_facts=_to_str_list(payload.get("expected_facts", [])),
                forbidden_claims=_to_str_list(payload.get("forbidden_claims", [])),
                completion_rule=payload.get("completion_rule", "must_answer"),
                max_turns=payload.get("max_turns", 8),
                language=payload.get("language", "en"),
                safety_flags=_to_str_list(payload.get("safety_flags", [])),
            )
        )

    if all_errors:
        raise ValueError("Invalid scenarios:\n" + "\n".join(all_errors))

    return scenarios


def _to_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(v) for v in value]

