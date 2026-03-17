import tempfile
import unittest
from pathlib import Path

from vaanieval.models import EvalRunResult, RunSummary, ScenarioExecution, ScenarioScore
from vaanieval.reporting.json_report import write_json_report
from vaanieval.reporting.markdown_report import write_markdown_report


class TestReporting(unittest.TestCase):
    def test_reports_written(self):
        result = EvalRunResult(
            summary=RunSummary(
                run_type="smoke",
                scenario_count=1,
                passed_count=1,
                task_success_rate=1.0,
                unresolved_turn_rate=0.0,
                hallucination_rate=0.0,
                fallback_quality=1.0,
                latency_p50_ms=100.0,
                latency_p95_ms=120.0,
                latency_p99_ms=130.0,
                gate_passed=True,
                threshold_task_success_rate=0.85,
                threshold_unresolved_turn_rate=0.10,
                threshold_hallucination_rate=0.05,
                threshold_latency_p95_ms=1200.0,
            ),
            scenario_scores=[
                ScenarioScore(
                    scenario_id="s1",
                    category="retrieval",
                    passed=True,
                    task_success=True,
                    unresolved_turn=False,
                    hallucination=False,
                    fallback_good=True,
                    latency_ms_values=[100.0],
                    notes=[],
                )
            ],
            execution=[ScenarioExecution(scenario_id="s1", category="retrieval")],
        )

        with tempfile.TemporaryDirectory() as tmp:
            json_path = write_json_report(result, tmp)
            md_path = write_markdown_report(result, tmp)
            self.assertTrue(Path(json_path).exists())
            self.assertTrue(Path(md_path).exists())


if __name__ == "__main__":
    unittest.main()

