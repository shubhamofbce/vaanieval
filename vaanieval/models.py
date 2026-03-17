from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class EvalScenario:
    id: str
    category: str
    user_message: str
    expected_facts: list[str] = field(default_factory=list)
    forbidden_claims: list[str] = field(default_factory=list)
    completion_rule: str = "must_answer"
    max_turns: int = 8
    language: str = "en"
    safety_flags: list[str] = field(default_factory=list)


@dataclass
class TurnEvent:
    role: str
    message: str
    interrupted: bool = False
    time_in_call_secs: int = 0
    latency_ms: float | None = None
    raw_metrics: dict[str, float] = field(default_factory=dict)


@dataclass
class ScenarioExecution:
    scenario_id: str
    category: str
    turns: list[TurnEvent] = field(default_factory=list)
    analysis: dict[str, Any] = field(default_factory=dict)
    adapter_error: str | None = None


@dataclass
class ScenarioScore:
    scenario_id: str
    category: str
    passed: bool
    task_success: bool
    unresolved_turn: bool
    hallucination: bool
    fallback_good: bool
    latency_ms_values: list[float] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    external_scores: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class RunSummary:
    run_type: str
    scenario_count: int
    passed_count: int
    task_success_rate: float
    unresolved_turn_rate: float
    hallucination_rate: float
    fallback_quality: float
    latency_p50_ms: float
    latency_p95_ms: float
    latency_p99_ms: float
    gate_passed: bool
    threshold_task_success_rate: float
    threshold_unresolved_turn_rate: float
    threshold_hallucination_rate: float
    threshold_latency_p95_ms: float
    external_scoring_enabled: bool = False
    external_scorers: list[str] = field(default_factory=list)
    external_summary: dict[str, dict[str, float]] = field(default_factory=dict)
    external_error_count: int = 0


@dataclass
class EvalRunResult:
    summary: RunSummary
    scenario_scores: list[ScenarioScore]
    execution: list[ScenarioExecution]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
