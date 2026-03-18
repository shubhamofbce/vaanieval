from __future__ import annotations

from pathlib import Path
from typing import Optional

from vaanieval.config import load_config
from vaanieval.models import EvalRunResult
from vaanieval.progress import log_event
from vaanieval.reporting import write_json_report, write_markdown_report
from vaanieval.scenarios import load_scenarios
from vaanieval.scoring import evaluate_scenarios


def run_smoke(
    config_path: str | None = None,
    output_dir: str | None = None,
    external_scorers: Optional[list[str]] = None,
    openai_api_key: str | None = None,
    openai_model: str | None = None,
) -> EvalRunResult:
    dataset = _default_dataset_path("smoke", "smoke_core.yaml")
    return _run(
        dataset=dataset,
        config_path=config_path,
        output_dir=output_dir,
        run_type="smoke",
        external_scorers=external_scorers,
        openai_api_key=openai_api_key,
        openai_model=openai_model,
    )


def run_regression(
    config_path: str | None = None,
    output_dir: str | None = None,
    external_scorers: Optional[list[str]] = None,
    openai_api_key: str | None = None,
    openai_model: str | None = None,
) -> EvalRunResult:
    dataset = _default_dataset_path("regression", "retrieval_regression.yaml")
    return _run(
        dataset=dataset,
        config_path=config_path,
        output_dir=output_dir,
        run_type="regression",
        external_scorers=external_scorers,
        openai_api_key=openai_api_key,
        openai_model=openai_model,
    )


def run_custom(
    dataset_path: str,
    config_path: str | None = None,
    output_dir: str | None = None,
    external_scorers: Optional[list[str]] = None,
    openai_api_key: str | None = None,
    openai_model: str | None = None,
) -> EvalRunResult:
    return _run(
        dataset=dataset_path,
        config_path=config_path,
        output_dir=output_dir,
        run_type="custom",
        external_scorers=external_scorers,
        openai_api_key=openai_api_key,
        openai_model=openai_model,
    )


def _run(
    dataset: str,
    config_path: str | None,
    output_dir: str | None,
    run_type: str,
    external_scorers: Optional[list[str]],
    openai_api_key: str | None,
    openai_model: str | None,
) -> EvalRunResult:
    log_event(f"Starting eval run type='{run_type}' dataset='{dataset}'")
    if config_path:
        log_event(f"Using config file: {config_path}")

    log_event("Loading configuration...")
    config = load_config(config_path=config_path)
    if output_dir:
        config.output_dir = output_dir
        Path(config.output_dir).mkdir(parents=True, exist_ok=True)
        log_event(f"Overriding output directory: {config.output_dir}")

    if external_scorers is not None:
        config.enabled_external_scorers = external_scorers
        log_event(f"Using external scorers override: {', '.join(external_scorers)}")
    if openai_api_key is not None:
        config.openai_api_key = openai_api_key
        log_event("OpenAI API key override applied")
    if openai_model is not None:
        config.openai_model = openai_model
        log_event(f"OpenAI model override: {openai_model}")

    config.ensure_valid()
    log_event("Configuration validated")

    log_event("Loading scenarios...")
    scenarios = load_scenarios(dataset)
    log_event(f"Loaded {len(scenarios)} scenarios")

    log_event("Running evaluation pipeline...")
    result = evaluate_scenarios(scenarios=scenarios, config=config, run_type=run_type)

    log_event("Writing reports...")
    json_path = write_json_report(result, config.output_dir)
    markdown_path = write_markdown_report(result, config.output_dir)
    log_event(f"Wrote JSON report: {json_path}")
    log_event(f"Wrote Markdown report: {markdown_path}")
    log_event("Evaluation run complete")

    return result


def _default_dataset_path(tier: str, filename: str) -> str:
    package_dir = Path(__file__).resolve().parent
    return str(package_dir / "datasets" / tier / filename)
