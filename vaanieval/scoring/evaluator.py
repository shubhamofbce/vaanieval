from __future__ import annotations

from typing import Optional

from vaanieval.adapters import BaseAdapter, ElevenLabsSimulationAdapter
from vaanieval.config import EvalConfig
from vaanieval.models import EvalRunResult, EvalScenario
from vaanieval.scoring.metrics import summarize
from vaanieval.scoring.rubric import score_scenario
from vaanieval.scoring.scorers import get_external_scorers


def evaluate_scenarios(
    scenarios: list[EvalScenario],
    config: EvalConfig,
    run_type: str,
    adapter: Optional[BaseAdapter] = None,
) -> EvalRunResult:
    runtime_adapter = adapter or ElevenLabsSimulationAdapter(config)
    external_scorers = get_external_scorers(config)

    execution = []
    scenario_scores = []
    for scenario in scenarios:
        exec_result = runtime_adapter.run_scenario(scenario)
        score = score_scenario(exec_result, scenario)

        for scorer in external_scorers:
            try:
                payload = scorer.score_scenario(scenario, exec_result, score)
                score.external_scores[scorer.name] = payload
                _append_discrepancy_note(score, scorer.name, payload)
            except Exception as exc:  # keep runs resilient even if one scorer fails
                score.external_scores[scorer.name] = {
                    "available": False,
                    "error": str(exc),
                }
                score.notes.append(f"{scorer.name}_error")

        execution.append(exec_result)
        scenario_scores.append(score)

    summary = summarize(
        run_type=run_type,
        scores=scenario_scores,
        config=config,
        external_scorers=[scorer.name for scorer in external_scorers],
    )
    return EvalRunResult(summary=summary, scenario_scores=scenario_scores, execution=execution)


def _append_discrepancy_note(score, scorer_name: str, payload: dict) -> None:
    external_pass = payload.get("pass")
    if isinstance(external_pass, bool) and external_pass != score.passed:
        score.notes.append(f"{scorer_name}_disagrees_with_deterministic")

