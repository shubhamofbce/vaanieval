from __future__ import annotations

from typing import Any

from vaanieval.config import EvalConfig
from vaanieval.scoring.scorers.base import ExternalScorer
from vaanieval.scoring.scorers.noop_scorer import NoopScorer
from vaanieval.scoring.scorers.openai_evals_scorer import OpenAIEvalsScorer


def get_external_scorers(config: EvalConfig) -> list[ExternalScorer]:
    scorers: list[ExternalScorer] = []
    for name in config.enabled_external_scorers:
        normalized = name.strip().lower()
        if not normalized:
            continue
        if normalized == "noop":
            scorers.append(NoopScorer())
            continue
        if normalized == "openai_evals":
            scorers.append(OpenAIEvalsScorer(config))
            continue
        if normalized.startswith("python:"):
            scorers.append(_load_custom_scorer(normalized[len("python:") :], config))
            continue
        raise ValueError(
            f"Unknown external scorer '{name}'. Supported: noop, openai_evals, python:<module>:<class>"
        )
    return scorers


def _load_custom_scorer(path_spec: str, config: EvalConfig) -> ExternalScorer:
    if ":" not in path_spec:
        raise ValueError("Custom scorer format must be python:<module>:<class>")

    module_name, class_name = path_spec.rsplit(":", 1)
    module = __import__(module_name, fromlist=[class_name])
    cls: Any = getattr(module, class_name)
    scorer = cls(config)
    if not isinstance(scorer, ExternalScorer):
        raise TypeError(f"{class_name} must implement ExternalScorer")
    return scorer


__all__ = ["ExternalScorer", "get_external_scorers", "NoopScorer", "OpenAIEvalsScorer"]

