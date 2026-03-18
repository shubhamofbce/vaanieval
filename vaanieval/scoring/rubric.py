from __future__ import annotations

from vaanieval.models import EvalScenario, ScenarioExecution, ScenarioScore

FALLBACK_MARKERS = (
    "could you clarify",
    "can you clarify",
    "i did not understand",
    "i'm not sure i understood",
    "please rephrase",
    "outside my scope",
)

UNRESOLVED_MARKERS = (
    "i don't know",
    "i do not know",
    "cannot help",
    "can't help",
    "unable to",
    "not sure",
)


def score_scenario(exec_result: ScenarioExecution, scenario: EvalScenario) -> ScenarioScore:
    if exec_result.adapter_error:
        return ScenarioScore(
            scenario_id=scenario.id,
            category=scenario.category,
            passed=False,
            task_success=False,
            unresolved_turn=True,
            hallucination=True,
            fallback_good=False,
            latency_ms_values=[],
            notes=[f"adapter_error: {exec_result.adapter_error}"],
        )

    agent_messages = [
        t.message.strip() for t in exec_result.turns if t.role == "agent" and t.message
    ]
    full_agent_text = "\n".join(agent_messages).lower()

    expected_ok = _all_expected_present(full_agent_text, scenario.expected_facts)
    forbidden_hit = _any_forbidden_present(full_agent_text, scenario.forbidden_claims)
    answered = len(agent_messages) > 0

    fallback_good = _fallback_quality(agent_messages)
    unresolved = _is_unresolved(agent_messages)

    task_success = _task_success(
        completion_rule=scenario.completion_rule,
        answered=answered,
        expected_ok=expected_ok,
        forbidden_hit=forbidden_hit,
        unresolved=unresolved,
    )

    latency_values = [
        float(turn.latency_ms)
        for turn in exec_result.turns
        if turn.latency_ms is not None and turn.role == "agent"
    ]

    notes: list[str] = []
    if not expected_ok and scenario.expected_facts:
        notes.append("missing expected facts")
    if forbidden_hit:
        notes.append("forbidden claim detected")
    if unresolved:
        notes.append("unresolved response pattern")

    passed = task_success and not forbidden_hit

    return ScenarioScore(
        scenario_id=scenario.id,
        category=scenario.category,
        passed=passed,
        task_success=task_success,
        unresolved_turn=unresolved,
        hallucination=forbidden_hit,
        fallback_good=fallback_good,
        latency_ms_values=latency_values,
        notes=notes,
    )


def _task_success(
    completion_rule: str,
    answered: bool,
    expected_ok: bool,
    forbidden_hit: bool,
    unresolved: bool,
) -> bool:
    if forbidden_hit:
        return False
    if completion_rule == "must_answer":
        return answered and not unresolved
    if completion_rule == "must_contain_all_expected_facts":
        return answered and expected_ok and not unresolved
    if completion_rule == "fallback_allowed":
        return answered
    return answered and expected_ok and not unresolved


def _all_expected_present(full_agent_text: str, expected_facts: list[str]) -> bool:
    for fact in expected_facts:
        if fact.lower() not in full_agent_text:
            return False
    return True


def _any_forbidden_present(full_agent_text: str, forbidden_claims: list[str]) -> bool:
    for forbidden in forbidden_claims:
        if forbidden.lower() in full_agent_text:
            return True
    return False


def _fallback_quality(agent_messages: list[str]) -> bool:
    if not agent_messages:
        return False
    text = "\n".join(agent_messages).lower()
    if any(marker in text for marker in FALLBACK_MARKERS):
        return True
    return True


def _is_unresolved(agent_messages: list[str]) -> bool:
    if not agent_messages:
        return True
    text = "\n".join(agent_messages).lower()
    return any(marker in text for marker in UNRESOLVED_MARKERS)
