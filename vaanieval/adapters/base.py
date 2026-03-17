from __future__ import annotations

from abc import ABC, abstractmethod

from vaanieval.models import EvalScenario, ScenarioExecution


class BaseAdapter(ABC):
    @abstractmethod
    def run_scenario(self, scenario: EvalScenario) -> ScenarioExecution:
        raise NotImplementedError

