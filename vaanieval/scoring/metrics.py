from __future__ import annotations

from statistics import median

from vaanieval.config import EvalConfig
from vaanieval.models import RunSummary, ScenarioScore


def summarize(
    run_type: str,
    scores: list[ScenarioScore],
    config: EvalConfig,
    external_scorers: list[str] | None = None,
) -> RunSummary:
    total = len(scores)
    passed_count = sum(1 for s in scores if s.passed)
    task_success_count = sum(1 for s in scores if s.task_success)
    unresolved_count = sum(1 for s in scores if s.unresolved_turn)
    hallucination_count = sum(1 for s in scores if s.hallucination)
    fallback_good_count = sum(1 for s in scores if s.fallback_good)

    all_latencies = [lat for score in scores for lat in score.latency_ms_values]

    task_success_rate = _safe_rate(task_success_count, total)
    unresolved_turn_rate = _safe_rate(unresolved_count, total)
    hallucination_rate = _safe_rate(hallucination_count, total)
    fallback_quality = _safe_rate(fallback_good_count, total)

    p50 = _percentile(all_latencies, 50)
    p95 = _percentile(all_latencies, 95)
    p99 = _percentile(all_latencies, 99)

    gate_passed = (
        task_success_rate >= config.tsr_threshold
        and unresolved_turn_rate <= config.unresolved_turn_rate_threshold
        and hallucination_rate <= config.hallucination_rate_threshold
        and p95 <= config.latency_p95_threshold_ms
    )

    external_summary, external_error_count = _aggregate_external(scores)
    active_external = external_scorers or []

    return RunSummary(
        run_type=run_type,
        scenario_count=total,
        passed_count=passed_count,
        task_success_rate=task_success_rate,
        unresolved_turn_rate=unresolved_turn_rate,
        hallucination_rate=hallucination_rate,
        fallback_quality=fallback_quality,
        latency_p50_ms=p50,
        latency_p95_ms=p95,
        latency_p99_ms=p99,
        gate_passed=gate_passed,
        threshold_task_success_rate=config.tsr_threshold,
        threshold_unresolved_turn_rate=config.unresolved_turn_rate_threshold,
        threshold_hallucination_rate=config.hallucination_rate_threshold,
        threshold_latency_p95_ms=config.latency_p95_threshold_ms,
        external_scoring_enabled=bool(active_external),
        external_scorers=active_external,
        external_summary=external_summary,
        external_error_count=external_error_count,
    )


def _safe_rate(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 4)


def _percentile(values: list[float], percentile: int) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    if percentile == 50:
        return round(float(median(sorted_values)), 2)

    rank = (percentile / 100) * (len(sorted_values) - 1)
    lower = int(rank)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = rank - lower
    interpolated = sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight
    return round(float(interpolated), 2)


def _aggregate_external(scores: list[ScenarioScore]) -> tuple[dict[str, dict[str, float]], int]:
    by_provider_numeric: dict[str, dict[str, list[float]]] = {}
    provider_error_count = 0

    for score in scores:
        for provider, payload in score.external_scores.items():
            if not isinstance(payload, dict):
                continue

            if payload.get("available") is False or payload.get("error"):
                provider_error_count += 1

            provider_metrics = by_provider_numeric.setdefault(provider, {})
            for key, value in payload.items():
                if isinstance(value, bool):
                    bucket = provider_metrics.setdefault(key, [])
                    bucket.append(1.0 if value else 0.0)
                elif isinstance(value, (int, float)):
                    bucket = provider_metrics.setdefault(key, [])
                    bucket.append(float(value))

    summary: dict[str, dict[str, float]] = {}
    for provider, metrics in by_provider_numeric.items():
        summary[provider] = {}
        for metric_name, values in metrics.items():
            if not values:
                continue
            summary[provider][f"avg_{metric_name}"] = round(sum(values) / len(values), 4)

    return summary, provider_error_count
