from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from vaanieval.models import EvalScenario, ScenarioExecution, ScenarioScore


class ExternalScorer(ABC):
    """Provider-agnostic interface for optional external scoring backends."""

    name: str

    @abstractmethod
    def score_scenario(
        self,
        scenario: EvalScenario,
        execution: ScenarioExecution,
        deterministic_score: ScenarioScore,
    ) -> dict[str, Any]:
        """Return a provider score payload for one scenario."""
        raise NotImplementedError

