from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


@dataclass
class EvalConfig:
    elevenlabs_api_key: str
    elevenlabs_agent_id: str
    output_dir: str = ".eval-reports"
    timeout_seconds: int = 45
    max_retries: int = 1
    tsr_threshold: float = 0.85
    unresolved_turn_rate_threshold: float = 0.10
    hallucination_rate_threshold: float = 0.05
    latency_p95_threshold_ms: float = 1200.0
    enabled_external_scorers: list[str] = field(default_factory=list)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    external_scorer_timeout_seconds: int = 30

    @classmethod
    def from_env(cls) -> "EvalConfig":
        load_dotenv()
        scorer_list = _parse_scorer_list(os.getenv("VAANIEVAL_EXTERNAL_SCORERS", ""))
        return cls(
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY", ""),
            elevenlabs_agent_id=os.getenv("ELEVENLABS_AGENT_ID", ""),
            output_dir=os.getenv("VAANIEVAL_OUTPUT_DIR", ".eval-reports"),
            timeout_seconds=int(os.getenv("VAANIEVAL_TIMEOUT_SECONDS", "45")),
            max_retries=int(os.getenv("VAANIEVAL_MAX_RETRIES", "1")),
            tsr_threshold=float(os.getenv("VAANIEVAL_TSR_THRESHOLD", "0.85")),
            unresolved_turn_rate_threshold=float(
                os.getenv("VAANIEVAL_UNRESOLVED_TURN_THRESHOLD", "0.10")
            ),
            hallucination_rate_threshold=float(
                os.getenv("VAANIEVAL_HALLUCINATION_THRESHOLD", "0.05")
            ),
            latency_p95_threshold_ms=float(os.getenv("VAANIEVAL_LATENCY_P95_THRESHOLD_MS", "1200")),
            enabled_external_scorers=scorer_list,
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("VAANIEVAL_OPENAI_MODEL", "gpt-4o-mini"),
            external_scorer_timeout_seconds=int(
                os.getenv("VAANIEVAL_EXTERNAL_SCORER_TIMEOUT_SECONDS", "30")
            ),
        )

    @classmethod
    def from_file(cls, path: str) -> "EvalConfig":
        content = _read_config_file(path)
        base = cls.from_env()
        merged: dict[str, Any] = {
            "elevenlabs_api_key": content.get("elevenlabs_api_key", base.elevenlabs_api_key),
            "elevenlabs_agent_id": content.get("elevenlabs_agent_id", base.elevenlabs_agent_id),
            "output_dir": content.get("output_dir", base.output_dir),
            "timeout_seconds": int(content.get("timeout_seconds", base.timeout_seconds)),
            "max_retries": int(content.get("max_retries", base.max_retries)),
            "tsr_threshold": float(content.get("tsr_threshold", base.tsr_threshold)),
            "unresolved_turn_rate_threshold": float(
                content.get("unresolved_turn_rate_threshold", base.unresolved_turn_rate_threshold)
            ),
            "hallucination_rate_threshold": float(
                content.get("hallucination_rate_threshold", base.hallucination_rate_threshold)
            ),
            "latency_p95_threshold_ms": float(
                content.get("latency_p95_threshold_ms", base.latency_p95_threshold_ms)
            ),
            "enabled_external_scorers": _parse_scorer_list(
                content.get("enabled_external_scorers", base.enabled_external_scorers)
            ),
            "openai_api_key": content.get("openai_api_key", base.openai_api_key),
            "openai_model": content.get("openai_model", base.openai_model),
            "external_scorer_timeout_seconds": int(
                content.get("external_scorer_timeout_seconds", base.external_scorer_timeout_seconds)
            ),
        }
        return cls(**merged)

    def ensure_valid(self) -> None:
        if not self.elevenlabs_api_key:
            raise ValueError("ELEVENLABS_API_KEY missing. Set env var or config file value.")
        if not self.elevenlabs_agent_id:
            raise ValueError("ELEVENLABS_AGENT_ID missing. Set env var or config file value.")

        normalized = {name.strip().lower() for name in self.enabled_external_scorers}
        if "openai_evals" in normalized and not self.openai_api_key:
            raise ValueError(
                "OPENAI_API_KEY missing. Set env var or config file value when openai_evals scorer is enabled."
            )


def load_config(config_path: str | None = None) -> EvalConfig:
    if config_path:
        config = EvalConfig.from_file(config_path)
    else:
        config = EvalConfig.from_env()
    config.ensure_valid()
    Path(config.output_dir).mkdir(parents=True, exist_ok=True)
    return config


def _read_config_file(path: str) -> dict[str, Any]:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    text = file_path.read_text(encoding="utf-8")
    if file_path.suffix.lower() in {".yaml", ".yml"}:
        parsed = yaml.safe_load(text)
        if parsed is None:
            return {}
        if not isinstance(parsed, dict):
            raise ValueError("Config root must be a JSON/YAML object")
        return parsed
    if file_path.suffix.lower() == ".json":
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            raise ValueError("Config root must be a JSON object")
        return parsed
    raise ValueError("Unsupported config format. Use .yaml, .yml, or .json")


def _parse_scorer_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return []
