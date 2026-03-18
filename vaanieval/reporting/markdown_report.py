from __future__ import annotations

from pathlib import Path

from vaanieval.models import EvalRunResult


def write_markdown_report(result: EvalRunResult, output_dir: str) -> Path:
    path = Path(output_dir) / "report.md"
    summary = result.summary

    lines: list[str] = []
    lines.append("# Voice Agent Eval Report")
    lines.append("")
    lines.append(f"- Run type: {summary.run_type}")
    lines.append(f"- Scenarios: {summary.scenario_count}")
    lines.append(f"- Passed scenarios: {summary.passed_count}")
    lines.append(f"- Gate passed: {summary.gate_passed}")
    lines.append("")
    lines.append("## Metrics")
    lines.append("")
    lines.append(f"- Task Success Rate: {summary.task_success_rate:.4f}")
    lines.append(f"- Unresolved Turn Rate: {summary.unresolved_turn_rate:.4f}")
    lines.append(f"- Hallucination Rate: {summary.hallucination_rate:.4f}")
    lines.append(f"- Fallback Quality: {summary.fallback_quality:.4f}")
    lines.append(f"- Latency p50 ms: {summary.latency_p50_ms:.2f}")
    lines.append(f"- Latency p95 ms: {summary.latency_p95_ms:.2f}")
    lines.append(f"- Latency p99 ms: {summary.latency_p99_ms:.2f}")

    if summary.external_scoring_enabled:
        lines.append("")
        lines.append("## External Scoring")
        lines.append("")
        lines.append(f"- Enabled providers: {', '.join(summary.external_scorers)}")
        lines.append(f"- Provider error count: {summary.external_error_count}")
        for provider, metric_map in summary.external_summary.items():
            lines.append(f"- {provider}:")
            for key, value in metric_map.items():
                lines.append(f"  {key}: {value:.4f}")

    lines.append("")
    lines.append("## Gate Thresholds")
    lines.append("")
    lines.append(f"- Task Success Rate >= {summary.threshold_task_success_rate:.2f}")
    lines.append(f"- Unresolved Turn Rate <= {summary.threshold_unresolved_turn_rate:.2f}")
    lines.append(f"- Hallucination Rate <= {summary.threshold_hallucination_rate:.2f}")
    lines.append(f"- Latency p95 ms <= {summary.threshold_latency_p95_ms:.2f}")
    lines.append("")
    lines.append("## Scenario Results")
    lines.append("")

    for score in result.scenario_scores:
        lines.append(
            f"- {score.scenario_id} | category={score.category} | passed={score.passed} | "
            f"task_success={score.task_success} | unresolved={score.unresolved_turn} | "
            f"hallucination={score.hallucination}"
        )
        if score.notes:
            lines.append(f"  notes: {', '.join(score.notes)}")
        if score.external_scores:
            for provider, payload in score.external_scores.items():
                lines.append(f"  external[{provider}]: {payload}")

    lines.append("")
    lines.append("## Artifact")
    lines.append("")
    lines.append("- summary.json")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path
