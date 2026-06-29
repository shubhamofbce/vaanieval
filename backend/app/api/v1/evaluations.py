from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.evaluation import (
    ConversationEvaluationRun,
    ConversationMetricScore,
    EvalProviderAccount,
)
from app.schemas.evaluations import (
    ConnectEvalProviderRequest,
    ConversationEvaluationRunResponse,
    ConversationMetricScoreResponse,
    EvalProviderCatalogResponse,
    EvalProviderResponse,
    ProviderModelsResponse,
)
from app.services.credentials import encrypt_secret
from app.services.eval_providers import (
    OllamaError,
    OllamaModelNotFoundError,
    get_available_models,
    get_provider_catalog,
    get_provider_catalog_entry,
)
from app.services.evaluation_service import enqueue_evaluation_job
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/providers/catalog", response_model=list[EvalProviderCatalogResponse])
def list_provider_catalog() -> list[EvalProviderCatalogResponse]:
    return [
        EvalProviderCatalogResponse(
            provider_name=entry.provider_name,
            display_name=entry.display_name,
            default_model=entry.default_model,
            models=entry.models,
            requires_api_key=entry.requires_api_key,
        )
        for entry in get_provider_catalog()
    ]


@router.post("/providers/connect", response_model=EvalProviderResponse)
def connect_eval_provider(
    payload: ConnectEvalProviderRequest,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> EvalProviderResponse:
    provider_name = payload.provider_name.lower().strip()
    model_name = payload.model_name.strip()
    try:
        provider_entry = get_provider_catalog_entry(provider_name)
        available_models = get_available_models(provider_name)
    except OllamaError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    api_key = payload.api_key.strip() if payload.api_key else None
    if provider_entry.requires_api_key and not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An API key is required for provider '{provider_name}'",
        )
    if not model_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An evaluation model is required",
        )
    if model_name not in available_models:
        if provider_name == "ollama":
            detail = (
                f"Ollama model '{model_name}' is not installed. "
                f"Run 'ollama pull {model_name}' on the Ollama host."
            )
        else:
            detail = f"Model '{model_name}' is not supported for provider '{provider_name}'"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    row = db.scalar(
        select(EvalProviderAccount).where(
            EvalProviderAccount.workspace_id == workspace_id,
            EvalProviderAccount.provider_name == provider_name,
        )
    )
    if row:
        row.api_key = encrypt_secret(api_key) if provider_entry.requires_api_key else None
        row.model_name = model_name
    else:
        row = EvalProviderAccount(
            workspace_id=workspace_id,
            provider_name=provider_name,
            api_key=encrypt_secret(api_key) if provider_entry.requires_api_key else None,
            model_name=model_name,
        )
        db.add(row)

    db.commit()
    db.refresh(row)
    return EvalProviderResponse(
        id=row.id,
        provider_name=row.provider_name,
        model_name=row.model_name,
        api_key_configured=bool(row.api_key),
        created_at=row.created_at,
    )


@router.get("/providers", response_model=list[EvalProviderResponse])
def list_eval_providers(
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> list[EvalProviderResponse]:
    rows = db.scalars(
        select(EvalProviderAccount).where(EvalProviderAccount.workspace_id == workspace_id)
    ).all()
    return [
        EvalProviderResponse(
            id=row.id,
            provider_name=row.provider_name,
            model_name=row.model_name,
            api_key_configured=bool(row.api_key),
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/providers/{provider_name}/models", response_model=ProviderModelsResponse)
def get_provider_models(
    provider_name: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ProviderModelsResponse:
    normalized_provider_name = provider_name.lower().strip()
    try:
        models = get_available_models(normalized_provider_name)
    except OllamaError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return ProviderModelsResponse(
        provider_name=normalized_provider_name, models=models
    )



@router.post("/conversations/{conversation_id}/run", response_model=ConversationEvaluationRunResponse)
def run_conversation_evaluation(
    conversation_id: str,
    provider_name: str = "openai",
    model_name: str | None = None,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ConversationEvaluationRunResponse:
    """Run evaluation for a conversation.

    Args:
        conversation_id: Conversation to evaluate
        provider_name: Eval provider ("openai", default)
        model_name: Optional model override (e.g., "gpt-4o" instead of default)
        workspace_id: Current workspace
        db: Database session

    Returns:
        Evaluation run response
    """
    try:
        run = enqueue_evaluation_job(
            db,
            workspace_id=workspace_id,
            conversation_id=conversation_id,
            provider_name=provider_name,
            model_name=model_name,
        )
    except OllamaError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except (OllamaModelNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db.commit()
    db.refresh(run)
    return ConversationEvaluationRunResponse(
        id=run.id,
        conversation_id=run.conversation_id,
        provider_name=run.provider_name,
        provider_model=run.provider_model,
        status=run.status,
        error_message=run.error_message,
        created_at=run.created_at,
        updated_at=run.updated_at,
        metrics=[],
    )


@router.get(
    "/conversations/{conversation_id}/latest",
    response_model=ConversationEvaluationRunResponse,
)
def get_latest_conversation_evaluation(
    conversation_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ConversationEvaluationRunResponse:
    run = db.scalar(
        select(ConversationEvaluationRun)
        .where(
            ConversationEvaluationRun.workspace_id == workspace_id,
            ConversationEvaluationRun.conversation_id == conversation_id,
        )
        .order_by(ConversationEvaluationRun.created_at.desc())
    )
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No evaluation run found")

    metrics = db.scalars(
        select(ConversationMetricScore)
        .where(ConversationMetricScore.evaluation_run_id == run.id)
        .order_by(ConversationMetricScore.created_at.asc())
    ).all()

    # Keep the previous scored metrics visible while a newer run is queued/running/failed.
    if not metrics and run.status in {"queued", "running", "failed"}:
        previous_scored_run = db.scalar(
            select(ConversationEvaluationRun)
            .where(
                ConversationEvaluationRun.workspace_id == workspace_id,
                ConversationEvaluationRun.conversation_id == conversation_id,
                ConversationEvaluationRun.status == "completed",
            )
            .order_by(ConversationEvaluationRun.created_at.desc())
        )
        if previous_scored_run:
            metrics = db.scalars(
                select(ConversationMetricScore)
                .where(ConversationMetricScore.evaluation_run_id == previous_scored_run.id)
                .order_by(ConversationMetricScore.created_at.asc())
            ).all()

    return ConversationEvaluationRunResponse(
        id=run.id,
        conversation_id=run.conversation_id,
        provider_name=run.provider_name,
        provider_model=run.provider_model,
        status=run.status,
        error_message=run.error_message,
        created_at=run.created_at,
        updated_at=run.updated_at,
        metrics=[
            ConversationMetricScoreResponse(
                metric_key=metric.metric_key,
                score_value=metric.score_value,
                confidence=metric.confidence,
                rationale=metric.rationale,
                evidence_json=metric.evidence_json,
            )
            for metric in metrics
        ],
    )
