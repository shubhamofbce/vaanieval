from __future__ import annotations

from time import perf_counter
from typing import Optional

from vaanieval.adapters import BaseAdapter, ElevenLabsSimulationAdapter
from vaanieval.config import EvalConfig
from vaanieval.models import EvalRunResult, EvalScenario
from vaanieval.progress import finalize_progress, log_event, update_progress
from vaanieval.scoring.metrics import summarize
from vaanieval.scoring.rubric import score_scenario
from vaanieval.scoring.scorers import get_external_scorers


def evaluate_scenarios(
    scenarios: list[EvalScenario],
    config: EvalConfig,
    run_type: str,
    adapter: Optional[BaseAdapter] = None,
) -> EvalRunResult:
    log_event("Initializing runtime adapter...")
    runtime_adapter = adapter or ElevenLabsSimulationAdapter(config)

    log_event("Initializing external scorers...")
    external_scorers = get_external_scorers(config)
    if external_scorers:
        scorer_names = ", ".join(scorer.name for scorer in external_scorers)
        log_event(f"External scorers enabled: {scorer_names}")
    else:
        log_event("External scorers disabled")

    execution = []
    scenario_scores = []
    total = len(scenarios)

    for index, scenario in enumerate(scenarios, start=1):
        started = perf_counter()
        log_event(
            f"Scenario {index}/{total}: id='{scenario.id}' category='{scenario.category}' - running adapter"
        )

        exec_result = runtime_adapter.run_scenario(scenario)
        if exec_result.adapter_error:
            log_event(f"Scenario '{scenario.id}' adapter error: {exec_result.adapter_error}")

        log_event(f"Scenario '{scenario.id}' - scoring deterministically")
        score = score_scenario(exec_result, scenario)
        log_event(f"Scenario '{scenario.id}' deterministic result: passed={score.passed}")

        for scorer in external_scorers:
            log_event(f"Scenario '{scenario.id}' - running external scorer: {scorer.name}")
            try:
                payload = scorer.score_scenario(scenario, exec_result, score)
                score.external_scores[scorer.name] = payload
                _append_discrepancy_note(score, scorer.name, payload)
                external_pass = payload.get("pass")
                log_event(
                    f"Scenario '{scenario.id}' external '{scorer.name}' result: pass={external_pass}"
                )
            except Exception as exc:  # keep runs resilient even if one scorer fails
                score.external_scores[scorer.name] = {
                    "available": False,
                    "error": str(exc),
                }
                score.notes.append(f"{scorer.name}_error")
                log_event(f"Scenario '{scenario.id}' external '{scorer.name}' error: {exc}")

        execution.append(exec_result)
        scenario_scores.append(score)
        duration = perf_counter() - started
        log_event(f"Scenario '{scenario.id}' complete in {duration:.2f}s")
        update_progress(index, total, prefix="Evaluation progress")

    finalize_progress()
    log_event("Aggregating run summary...")
    summary = summarize(
        run_type=run_type,
        scores=scenario_scores,
        config=config,
        external_scorers=[scorer.name for scorer in external_scorers],
    )
    log_event(
        "Summary ready: "
        f"passed={summary.passed_count}/{summary.scenario_count}, gate_passed={summary.gate_passed}"
    )
    return EvalRunResult(summary=summary, scenario_scores=scenario_scores, execution=execution)


def _append_discrepancy_note(score, scorer_name: str, payload: dict) -> None:
    external_pass = payload.get("pass")
    if isinstance(external_pass, bool) and external_pass != score.passed:
        score.notes.append(f"{scorer_name}_disagrees_with_deterministic")
