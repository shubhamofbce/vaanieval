import json
import tempfile
import unittest
from pathlib import Path

from vaanieval.config import EvalConfig


class TestConfig(unittest.TestCase):
    def test_load_json_config(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "cfg.json"
            path.write_text(
                json.dumps(
                    {
                        "elevenlabs_api_key": "k",
                        "elevenlabs_agent_id": "a",
                        "tsr_threshold": 0.9,
                    }
                ),
                encoding="utf-8",
            )
            cfg = EvalConfig.from_file(str(path))
            self.assertEqual(cfg.elevenlabs_api_key, "k")
            self.assertEqual(cfg.elevenlabs_agent_id, "a")
            self.assertEqual(cfg.tsr_threshold, 0.9)


if __name__ == "__main__":
    unittest.main()
