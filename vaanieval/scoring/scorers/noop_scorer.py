from __future__ import annotations

from typing import Any

from vaanieval.models import EvalScenario, ScenarioExecution, ScenarioScore
from vaanieval.scoring.scorers.base import ExternalScorer


class NoopScorer(ExternalScorer):
    name = "noop"

    def score_scenario(
        self,
        scenario: EvalScenario,
        execution: ScenarioExecution,
        deterministic_score: ScenarioScore,
    ) -> dict[str, Any]:
        return {
            "available": True,
            "pass": deterministic_score.passed,
            "task_success_score": 1.0 if deterministic_score.task_success else 0.0,
            "rationale": "No-op scorer mirrors deterministic score.",
        }

