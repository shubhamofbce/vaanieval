import unittest

from vaanieval.config import EvalConfig
from vaanieval.models import ScenarioScore
from vaanieval.scoring.metrics import summarize


class TestScoringDeterminism(unittest.TestCase):
    def test_summary_is_deterministic(self):
        config = EvalConfig(
            elevenlabs_api_key="k",
            elevenlabs_agent_id="a",
        )
        scores = [
            ScenarioScore(
                scenario_id="s1",
                category="retrieval",
                passed=True,
                task_success=True,
                unresolved_turn=False,
                hallucination=False,
                fallback_good=True,
                latency_ms_values=[100.0, 150.0],
                notes=[],
            ),
            ScenarioScore(
                scenario_id="s2",
                category="retrieval",
                passed=False,
                task_success=False,
                unresolved_turn=True,
                hallucination=True,
                fallback_good=False,
                latency_ms_values=[200.0],
                notes=[],
            ),
        ]

        one = summarize("smoke", scores, config)
        two = summarize("smoke", scores, config)

        self.assertEqual(one.task_success_rate, two.task_success_rate)
        self.assertEqual(one.latency_p95_ms, two.latency_p95_ms)
        self.assertEqual(one.gate_passed, two.gate_passed)


if __name__ == "__main__":
    unittest.main()

