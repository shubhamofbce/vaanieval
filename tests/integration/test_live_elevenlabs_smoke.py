import os
import unittest

from vaanieval.api import run_smoke


class TestLiveElevenLabsSmoke(unittest.TestCase):
    @unittest.skipUnless(
        os.getenv("VAANIEVAL_RUN_LIVE") == "1",
        "Set VAANIEVAL_RUN_LIVE=1 to run live integration test",
    )
    def test_live_smoke(self):
        result = run_smoke()
        self.assertGreaterEqual(result.summary.scenario_count, 1)


if __name__ == "__main__":
    unittest.main()

