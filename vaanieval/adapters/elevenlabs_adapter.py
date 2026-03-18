from __future__ import annotations

import time
from typing import Any

from elevenlabs import AgentConfig, ConversationSimulationSpecification, ElevenLabs

from vaanieval.adapters.base import BaseAdapter
from vaanieval.config import EvalConfig
from vaanieval.models import EvalScenario, ScenarioExecution, TurnEvent


class ElevenLabsSimulationAdapter(BaseAdapter):
    """Runs simulated conversations against an ElevenLabs agent."""

    def __init__(self, config: EvalConfig):
        self._config = config
        self._client = ElevenLabs(api_key=config.elevenlabs_api_key)

    def run_scenario(self, scenario: EvalScenario) -> ScenarioExecution:
        last_error: Exception | None = None

        for attempt in range(self._config.max_retries + 1):
            try:
                spec = ConversationSimulationSpecification(
                    simulated_user_config=AgentConfig(
                        first_message=scenario.user_message,
                        language=scenario.language,
                    )
                )

                started = time.time()
                response = self._client.conversational_ai.agents.simulate_conversation(
                    agent_id=self._config.elevenlabs_agent_id,
                    simulation_specification=spec,
                    new_turns_limit=scenario.max_turns,
                )
                duration_ms = (time.time() - started) * 1000.0

                turns = self._parse_turns(getattr(response, "simulated_conversation", []) or [])
                analysis_dict = _model_to_dict(getattr(response, "analysis", None))
                analysis_dict["simulation_call_duration_ms"] = round(duration_ms, 2)

                return ScenarioExecution(
                    scenario_id=scenario.id,
                    category=scenario.category,
                    turns=turns,
                    analysis=analysis_dict,
                )
            except Exception as exc:  # broad catch to keep batch eval running
                last_error = exc
                if attempt >= self._config.max_retries:
                    break

        return ScenarioExecution(
            scenario_id=scenario.id,
            category=scenario.category,
            turns=[],
            analysis={},
            adapter_error=str(last_error) if last_error else "Unknown adapter failure",
        )

    def _parse_turns(self, turns: list[Any]) -> list[TurnEvent]:
        parsed: list[TurnEvent] = []
        for turn in turns:
            role = str(getattr(turn, "role", "unknown"))
            message = str(getattr(turn, "message", "") or "")
            interrupted = bool(getattr(turn, "interrupted", False) or False)
            time_in_call_secs = int(getattr(turn, "time_in_call_secs", 0) or 0)
            latency_ms, raw_metrics = _extract_latency(
                getattr(turn, "conversation_turn_metrics", None)
            )
            parsed.append(
                TurnEvent(
                    role=role,
                    message=message,
                    interrupted=interrupted,
                    time_in_call_secs=time_in_call_secs,
                    latency_ms=latency_ms,
                    raw_metrics=raw_metrics,
                )
            )
        return parsed


def _extract_latency(metrics_obj: Any) -> tuple[float | None, dict[str, float]]:
    if not metrics_obj:
        return None, {}

    metrics = getattr(metrics_obj, "metrics", None)
    if not isinstance(metrics, dict):
        return None, {}

    raw: dict[str, float] = {}
    total_ms = 0.0
    has_value = False
    for key, value in metrics.items():
        elapsed = getattr(value, "elapsed_time", None)
        if isinstance(elapsed, (int, float)):
            has_value = True
            ms = float(elapsed) * 1000.0
            raw[str(key)] = ms
            total_ms += ms

    if not has_value:
        return None, {}
    return round(total_ms, 2), raw


def _model_to_dict(model: Any) -> dict[str, Any]:
    if model is None:
        return {}
    if hasattr(model, "model_dump"):
        dumped = model.model_dump()
        if isinstance(dumped, dict):
            return dumped
        return {"value": dumped}
    if hasattr(model, "dict"):
        dumped = model.dict()
        if isinstance(dumped, dict):
            return dumped
        return {"value": dumped}
    if isinstance(model, dict):
        return model
    return {"value": str(model)}
