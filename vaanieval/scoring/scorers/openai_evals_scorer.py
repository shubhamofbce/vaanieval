from __future__ import annotations

import importlib
import json
from typing import Any

from vaanieval.config import EvalConfig
from vaanieval.models import EvalScenario, ScenarioExecution, ScenarioScore
from vaanieval.scoring.scorers.base import ExternalScorer


class OpenAIEvalsScorer(ExternalScorer):
    """OpenAI-backed model grader for transcript-level scoring.

    This scorer uses the OpenAI API to grade scenario outcomes and returns
    structured metrics in a provider-neutral payload shape.
    """

    name = "openai_evals"

    def __init__(self, config: EvalConfig):
        self._config = config
        self._client = self._create_client(config)

    def score_scenario(
        self,
        scenario: EvalScenario,
        execution: ScenarioExecution,
        deterministic_score: ScenarioScore,
    ) -> dict[str, Any]:
        if execution.adapter_error:
            return {
                "available": False,
                "error": f"adapter_error: {execution.adapter_error}",
                "pass": False,
                "task_success_score": 0.0,
                "factuality_score": 0.0,
                "confidence": 0.0,
                "rationale": "Cannot grade scenario because adapter execution failed.",
            }

        transcript = self._render_transcript(execution)
        prompt = self._build_prompt(scenario, transcript, deterministic_score)

        try:
            response = self._client.responses.create(
                model=self._config.openai_model,
                input=[
                    {
                        "role": "system",
                        "content": (
                            "You are a strict evaluation judge. Return JSON only with keys: "
                            "pass, task_success_score, factuality_score, confidence, rationale, issues."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            parsed = self._parse_response(getattr(response, "output_text", ""))
            parsed["available"] = True
            return parsed
        except Exception as exc:
            return {
                "available": False,
                "error": str(exc),
                "pass": False,
                "task_success_score": 0.0,
                "factuality_score": 0.0,
                "confidence": 0.0,
                "rationale": "OpenAI scorer request failed.",
            }

    def _create_client(self, config: EvalConfig):
        try:
            openai_module = importlib.import_module("openai")
            OpenAI = getattr(openai_module, "OpenAI")
        except Exception as exc:
            raise RuntimeError(
                "OpenAI scorer enabled but openai package is not installed. "
                "Install with: pip install openai"
            ) from exc

        return OpenAI(
            api_key=config.openai_api_key,
            timeout=config.external_scorer_timeout_seconds,
        )

    def _build_prompt(
        self,
        scenario: EvalScenario,
        transcript: str,
        deterministic_score: ScenarioScore,
    ) -> str:
        return (
            "Evaluate this conversational agent outcome.\n\n"
            f"Scenario ID: {scenario.id}\n"
            f"Category: {scenario.category}\n"
            f"User request seed: {scenario.user_message}\n"
            f"Expected facts: {scenario.expected_facts}\n"
            f"Forbidden claims: {scenario.forbidden_claims}\n"
            f"Completion rule: {scenario.completion_rule}\n"
            f"Deterministic score passed: {deterministic_score.passed}\n"
            f"Deterministic notes: {deterministic_score.notes}\n\n"
            f"Transcript:\n{transcript}\n\n"
            "Return strict JSON with:\n"
            "- pass: boolean\n"
            "- task_success_score: float 0..1\n"
            "- factuality_score: float 0..1\n"
            "- confidence: float 0..1\n"
            "- rationale: short string\n"
            "- issues: list of short strings\n"
        )

    def _render_transcript(self, execution: ScenarioExecution) -> str:
        lines: list[str] = []
        for turn in execution.turns:
            lines.append(f"{turn.role}: {turn.message}")
        return "\n".join(lines)

    def _parse_response(self, text: str) -> dict[str, Any]:
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = _extract_first_json_object(text)

        if not isinstance(data, dict):
            raise ValueError("OpenAI scorer returned non-object response")

        return {
            "pass": bool(data.get("pass", False)),
            "task_success_score": _as_unit_float(data.get("task_success_score", 0.0)),
            "factuality_score": _as_unit_float(data.get("factuality_score", 0.0)),
            "confidence": _as_unit_float(data.get("confidence", 0.0)),
            "rationale": str(data.get("rationale", "")),
            "issues": _as_str_list(data.get("issues", [])),
        }


def _extract_first_json_object(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in scorer response")
    parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("OpenAI scorer returned non-object response")
    return parsed


def _as_unit_float(value: Any) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return round(numeric, 4)


def _as_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(v) for v in value]
