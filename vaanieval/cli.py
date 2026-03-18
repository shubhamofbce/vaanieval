from __future__ import annotations

import argparse
import json
from dataclasses import asdict

from vaanieval.api import run_custom, run_regression, run_smoke


def main() -> None:
    parser = argparse.ArgumentParser(prog="vaanieval")
    subparsers = parser.add_subparsers(dest="command", required=True)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--config", default=None, help="Path to YAML/JSON config file")
    common.add_argument("--output-dir", default=None, help="Output report directory")
    common.add_argument("--tsr-threshold", type=float, default=None)
    common.add_argument("--latency-p95-threshold-ms", type=float, default=None)
    common.add_argument("--unresolved-turn-threshold", type=float, default=None)
    common.add_argument("--hallucination-threshold", type=float, default=None)
    common.add_argument(
        "--external-scorers",
        default=None,
        help="Comma-separated list of providers: openai_evals, noop, python:<module>:<class>",
    )
    common.add_argument("--openai-api-key", default=None)
    common.add_argument("--openai-model", default=None)
    common.add_argument("--external-scorer-timeout-seconds", type=int, default=None)

    subparsers.add_parser("smoke", help="Run smoke scenario pack", parents=[common])
    subparsers.add_parser("regression", help="Run regression scenario pack", parents=[common])

    custom = subparsers.add_parser("custom", help="Run custom scenario file", parents=[common])
    custom.add_argument("--dataset", required=True, help="Path to scenario YAML file")

    args = parser.parse_args()

    if args.tsr_threshold is not None:
        _set_env("VAANIEVAL_TSR_THRESHOLD", str(args.tsr_threshold))
    if args.latency_p95_threshold_ms is not None:
        _set_env("VAANIEVAL_LATENCY_P95_THRESHOLD_MS", str(args.latency_p95_threshold_ms))
    if args.unresolved_turn_threshold is not None:
        _set_env("VAANIEVAL_UNRESOLVED_TURN_THRESHOLD", str(args.unresolved_turn_threshold))
    if args.hallucination_threshold is not None:
        _set_env("VAANIEVAL_HALLUCINATION_THRESHOLD", str(args.hallucination_threshold))
    if args.external_scorers is not None:
        _set_env("VAANIEVAL_EXTERNAL_SCORERS", args.external_scorers)
    if args.openai_api_key is not None:
        _set_env("OPENAI_API_KEY", args.openai_api_key)
    if args.openai_model is not None:
        _set_env("VAANIEVAL_OPENAI_MODEL", args.openai_model)
    if args.external_scorer_timeout_seconds is not None:
        _set_env(
            "VAANIEVAL_EXTERNAL_SCORER_TIMEOUT_SECONDS",
            str(args.external_scorer_timeout_seconds),
        )

    scorer_list = _parse_scorer_csv(args.external_scorers)

    if args.command == "smoke":
        result = run_smoke(
            config_path=args.config,
            output_dir=args.output_dir,
            external_scorers=scorer_list,
            openai_api_key=args.openai_api_key,
            openai_model=args.openai_model,
        )
    elif args.command == "regression":
        result = run_regression(
            config_path=args.config,
            output_dir=args.output_dir,
            external_scorers=scorer_list,
            openai_api_key=args.openai_api_key,
            openai_model=args.openai_model,
        )
    else:
        result = run_custom(
            dataset_path=args.dataset,
            config_path=args.config,
            output_dir=args.output_dir,
            external_scorers=scorer_list,
            openai_api_key=args.openai_api_key,
            openai_model=args.openai_model,
        )

    print(json.dumps(asdict(result.summary), indent=2))


def _set_env(name: str, value: str) -> None:
    import os

    os.environ[name] = value


def _parse_scorer_csv(value: str | None) -> list[str] | None:
    if value is None:
        return None
    return [part.strip() for part in value.split(",") if part.strip()]


if __name__ == "__main__":
    main()
