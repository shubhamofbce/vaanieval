"""Evaluation service using pluggable providers."""

from __future__ import annotations

import json

from app.models.conversation import Conversation, ConversationTurn
from app.models.evaluation import (
    ConversationEvaluationRun,
    ConversationMetricScore,
    EvalProviderAccount,
)
from app.services.credentials import decrypt_secret
from app.services.eval_providers import (
    OllamaModelNotFoundError,
    create_provider,
    get_available_models,
    get_provider_catalog_entry,
)
from app.services.queue_service import enqueue_job
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

EVAL_CONVERSATION_SCORES = "eval_conversation_scores"

METRIC_KEYS = {
    "task_completion_score",
    "intent_understanding_score",
    "required_info_capture_score",
    "ai_detectability_score",
}


def enqueue_evaluation_job(
    db: Session,
    *,
    workspace_id: str,
    conversation_id: str,
    provider_name: str = "openai",
    model_name: str | None = None,
) -> ConversationEvaluationRun:
    """Enqueue an evaluation job for a conversation.

    Args:
        db: Database session
        workspace_id: Workspace ID
        conversation_id: Conversation to evaluate
        provider_name: Provider name (default: "openai")
        model_name: Optional model override. If not provided, uses provider's default.

    Returns:
        ConversationEvaluationRun record
    """
    provider_account = db.scalar(
        select(EvalProviderAccount).where(
            EvalProviderAccount.workspace_id == workspace_id,
            EvalProviderAccount.provider_name == provider_name,
        )
    )
    if not provider_account:
        raise ValueError(f"Eval provider '{provider_name}' is not configured for this workspace")

    provider_entry = get_provider_catalog_entry(provider_name)

    # Use provided model_name or fall back to provider's default
    model_to_use = model_name or provider_account.model_name or provider_entry.default_model
    if not model_to_use:
        raise ValueError(f"No model is configured for provider '{provider_name}'")
    available_models = get_available_models(provider_name)
    if model_to_use not in available_models:
        if provider_entry.models_are_dynamic:
            raise OllamaModelNotFoundError(
                f"Ollama model '{model_to_use}' is not installed. "
                f"Run 'ollama pull {model_to_use}' on the Ollama host."
            )
        raise ValueError(f"Model '{model_to_use}' is not supported for provider '{provider_name}'")

    run = ConversationEvaluationRun(
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        provider_name=provider_account.provider_name,
        provider_model=model_to_use,
        status="queued",
    )
    db.add(run)
    db.flush()

    enqueue_job(
        db,
        job_type=EVAL_CONVERSATION_SCORES,
        payload={"evaluation_run_id": run.id},
        priority=70,
    )
    return run


def run_evaluation_job(db: Session, payload: dict) -> None:
    """Execute an evaluation job.

    Args:
        db: Database session
        payload: Job payload with evaluation_run_id
    """
    evaluation_run_id = payload["evaluation_run_id"]
    run = db.scalar(
        select(ConversationEvaluationRun).where(ConversationEvaluationRun.id == evaluation_run_id)
    )
    if not run:
        raise ValueError("Evaluation run not found")

    provider_account = db.scalar(
        select(EvalProviderAccount).where(
            EvalProviderAccount.workspace_id == run.workspace_id,
            EvalProviderAccount.provider_name == run.provider_name,
        )
    )
    if not provider_account:
        run.status = "failed"
        run.error_message = "Eval provider account not found"
        db.flush()
        return

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == run.conversation_id,
            Conversation.workspace_id == run.workspace_id,
        )
    )
    if not conversation:
        run.status = "failed"
        run.error_message = "Conversation not found"
        db.flush()
        return

    turns = db.scalars(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == conversation.id)
        .order_by(ConversationTurn.turn_order.asc())
    ).all()

    if not turns:
        run.status = "failed"
        run.error_message = "No transcript turns found"
        db.flush()
        return

    run.status = "running"
    db.flush()

    # Build transcript
    transcript = "\n".join(f"{turn.role}: {turn.text}" for turn in turns if turn.text)

    # Get provider instance with the specific model to use
    provider = _get_provider(
        provider_name=run.provider_name,
        api_key=decrypt_secret(provider_account.api_key),
        model_name=run.provider_model,  # Use the model specified in this run
    )

    try:
        scores = provider.evaluate_conversation(
            transcript=transcript,
            context={
                "language": conversation.language,
                "outcome": conversation.outcome,
                "provider_agent_id": conversation.provider_agent_id,
            },
        )
    except Exception as exc:  # noqa: BLE001
        run.status = "failed"
        run.error_message = str(exc)
        db.flush()
        return

    # Delete previous scores for this run
    db.execute(
        delete(ConversationMetricScore).where(ConversationMetricScore.evaluation_run_id == run.id)
    )

    # Store new scores
    for metric in scores:
        metric_key = metric.get("metric_key")
        if metric_key not in METRIC_KEYS:
            continue

        value = metric.get("score_value")
        try:
            normalized_value = int(value)
        except (TypeError, ValueError):
            normalized_value = 0
        normalized_value = max(0, min(100, normalized_value))

        confidence = metric.get("confidence")
        confidence_value: float | None
        if isinstance(confidence, (int, float)):
            confidence_value = round(float(confidence), 4)
            confidence_value = max(0.0, min(1.0, confidence_value))
        else:
            confidence_value = None

        evidence = metric.get("evidence")
        evidence_json = json.dumps(evidence) if isinstance(evidence, (list, dict)) else None

        db.add(
            ConversationMetricScore(
                evaluation_run_id=run.id,
                metric_key=metric_key,
                score_value=normalized_value,
                confidence=confidence_value,
                rationale=str(metric.get("rationale", ""))[:4000] or None,
                evidence_json=evidence_json,
            )
        )

    run.status = "completed"
    run.error_message = None
    db.flush()


def _get_provider(provider_name: str, api_key: str | None, model_name: str):
    return create_provider(provider_name=provider_name, api_key=api_key, model_name=model_name)


# Public alias for API usage
def _get_provider_instance(provider_name: str, api_key: str | None, model_name: str):
    """Public alias for _get_provider. Used by API endpoints."""
    return _get_provider(provider_name, api_key, model_name)


def get_latest_evaluation_run(db: Session, conversation_id: str) -> ConversationEvaluationRun | None:
    """Get the latest evaluation run for a conversation.

    Args:
        db: Database session
        conversation_id: Conversation ID

    Returns:
        Latest ConversationEvaluationRun or None
    """
    return db.scalar(
        select(ConversationEvaluationRun)
        .where(ConversationEvaluationRun.conversation_id == conversation_id)
        .order_by(ConversationEvaluationRun.created_at.desc())
        .limit(1)
    )
