import tempfile
import unittest
from pathlib import Path

from vaanieval.scenarios.loader import load_scenarios


class TestSchemaValidation(unittest.TestCase):
    def test_load_valid_scenarios(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "valid.yaml"
            path.write_text(
                """
scenarios:
  - id: s1
    category: retrieval
    user_message: hello
""".strip(),
                encoding="utf-8",
            )
            scenarios = load_scenarios(str(path))
            self.assertEqual(len(scenarios), 1)
            self.assertEqual(scenarios[0].id, "s1")

    def test_invalid_scenario_raises(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "invalid.yaml"
            path.write_text(
                """
scenarios:
  - id: 42
    category: retrieval
""".strip(),
                encoding="utf-8",
            )
            with self.assertRaises(ValueError):
                load_scenarios(str(path))


if __name__ == "__main__":
    unittest.main()
