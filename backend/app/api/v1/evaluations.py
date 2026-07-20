from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id, get_current_workspace_owner
from app.db.session import get_db
from app.models.evaluation import (
    ConversationEvaluationRun,
    ConversationMetricScore,
    EvalProviderAccount,
    EvaluationRubricVersion,
)
from app.schemas.evaluations import (
    EvalProviderCatalogResponse,
    ConnectEvalProviderRequest,
    ConversationEvaluationRunResponse,
    ConversationMetricScoreResponse,
    EvalProviderResponse,
    ProviderModelsResponse,
    RubricDraftRequest,
    RubricVersionResponse,
)
from app.services.evaluation_service import enqueue_evaluation_job, _get_provider_instance
from app.services.rubric_service import BUILT_IN_RUBRIC, RUBRIC_FIELDS, get_or_create_draft, publish_rubric, resolve_active_rubric
from app.services.credentials import encrypt_secret
from app.services.eval_providers import get_provider_catalog, get_provider_catalog_entry

router = APIRouter()


def _rubric_response(row: EvaluationRubricVersion | None, provider_agent_id: str | None = None) -> RubricVersionResponse:
    if not row:
        return RubricVersionResponse(provider_agent_id=provider_agent_id, status="built_in", is_active=True,
            task_completion_instructions="", intent_understanding_instructions="", required_info_capture_instructions="",
            ai_detectability_instructions="", **BUILT_IN_RUBRIC)
    return RubricVersionResponse(id=row.id, provider_agent_id=row.provider_agent_id, name=row.name, version=row.version,
        status=row.status, is_active=row.is_active, created_at=row.created_at, updated_at=row.updated_at, published_at=row.published_at,
        **{field: getattr(row, field) for field in RUBRIC_FIELDS})


@router.get("/rubrics/resolved", response_model=RubricVersionResponse)
def get_resolved_rubric(provider_agent_id: str | None = None, workspace_id: str = Depends(get_current_workspace_id), db: Session = Depends(get_db)) -> RubricVersionResponse:
    return _rubric_response(resolve_active_rubric(db, workspace_id, provider_agent_id), provider_agent_id)


@router.get("/rubrics", response_model=list[RubricVersionResponse])
def list_rubrics(provider_agent_id: str | None = None, workspace_id: str = Depends(get_current_workspace_id), db: Session = Depends(get_db)) -> list[RubricVersionResponse]:
    query = select(EvaluationRubricVersion).where(EvaluationRubricVersion.workspace_id == workspace_id)
    query = query.where(EvaluationRubricVersion.provider_agent_id == provider_agent_id) if provider_agent_id else query.where(EvaluationRubricVersion.provider_agent_id.is_(None))
    return [_rubric_response(row) for row in db.scalars(query.order_by(EvaluationRubricVersion.version.desc())).all()]


@router.put("/rubrics/draft", response_model=RubricVersionResponse)
def save_rubric_draft(payload: RubricDraftRequest, workspace_id: str = Depends(get_current_workspace_id), db: Session = Depends(get_db)) -> RubricVersionResponse:
    row = get_or_create_draft(db, workspace_id, payload.provider_agent_id)
    row.name = payload.name.strip()
    for field in RUBRIC_FIELDS:
        setattr(row, field, getattr(payload, field).strip())
    db.commit(); db.refresh(row)
    return _rubric_response(row)


@router.post("/rubrics/{rubric_id}/publish", response_model=RubricVersionResponse)
def publish_rubric_version(rubric_id: str, workspace_id: str = Depends(get_current_workspace_owner), db: Session = Depends(get_db)) -> RubricVersionResponse:
    row = db.scalar(select(EvaluationRubricVersion).where(EvaluationRubricVersion.id == rubric_id, EvaluationRubricVersion.workspace_id == workspace_id))
    if not row: raise HTTPException(status_code=404, detail="Rubric not found")
    try: publish_rubric(db, row)
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit(); db.refresh(row)
    return _rubric_response(row)


@router.post("/rubrics/{rubric_id}/test/conversations/{conversation_id}", response_model=ConversationEvaluationRunResponse)
def test_rubric(rubric_id: str, conversation_id: str, workspace_id: str = Depends(get_current_workspace_id), db: Session = Depends(get_db)) -> ConversationEvaluationRunResponse:
    return _queue_run(conversation_id, "openai", None, rubric_id, True, workspace_id, db)


@router.get("/providers/catalog", response_model=list[EvalProviderCatalogResponse])
def list_provider_catalog() -> list[EvalProviderCatalogResponse]:
    return [
        EvalProviderCatalogResponse(
            provider_name=entry.provider_name,
            display_name=entry.display_name,
            default_model=entry.default_model,
            models=entry.models,
        )
        for entry in get_provider_catalog()
    ]


@router.post("/providers/connect", response_model=EvalProviderResponse)
def connect_eval_provider(
    payload: ConnectEvalProviderRequest,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> EvalProviderResponse:
    provider_entry = get_provider_catalog_entry(payload.provider_name)
    if payload.model_name not in provider_entry.models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model '{payload.model_name}' is not supported for provider '{payload.provider_name}'",
        )

    row = db.scalar(
        select(EvalProviderAccount).where(
            EvalProviderAccount.workspace_id == workspace_id,
            EvalProviderAccount.provider_name == payload.provider_name,
        )
    )
    if row:
        row.api_key = encrypt_secret(payload.api_key)
        row.model_name = payload.model_name
    else:
        row = EvalProviderAccount(
            workspace_id=workspace_id,
            provider_name=payload.provider_name,
            api_key=encrypt_secret(payload.api_key),
            model_name=payload.model_name,
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
    try:
        provider_entry = get_provider_catalog_entry(provider_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return ProviderModelsResponse(
        provider_name=provider_name, models=provider_entry.models
    )



def _run_response(run: ConversationEvaluationRun) -> ConversationEvaluationRunResponse:
    return ConversationEvaluationRunResponse(
        id=run.id, conversation_id=run.conversation_id, provider_name=run.provider_name,
        provider_model=run.provider_model, status=run.status, error_message=run.error_message,
        qa_verdict=run.qa_verdict, qa_summary=run.qa_summary, failure_reason=run.failure_reason,
        recommended_next_step=run.recommended_next_step, supporting_evidence=run.supporting_evidence,
        rubric_version_id=run.rubric_version_id, rubric_name=run.rubric_name,
        rubric_version=run.rubric_version, is_test=run.is_test, created_at=run.created_at,
        updated_at=run.updated_at, metrics=[])


def _queue_run(conversation_id: str, provider_name: str, model_name: str | None, rubric_version_id: str | None, is_test: bool, workspace_id: str, db: Session) -> ConversationEvaluationRunResponse:
    try:
        run = enqueue_evaluation_job(db, workspace_id=workspace_id, conversation_id=conversation_id,
            provider_name=provider_name, model_name=model_name, rubric_version_id=rubric_version_id, is_test=is_test)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    db.commit(); db.refresh(run)
    return _run_response(run)


@router.get("/runs/{evaluation_run_id}", response_model=ConversationEvaluationRunResponse)
def get_evaluation_run(
    evaluation_run_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ConversationEvaluationRunResponse:
    run = db.scalar(select(ConversationEvaluationRun).where(
        ConversationEvaluationRun.id == evaluation_run_id,
        ConversationEvaluationRun.workspace_id == workspace_id,
    ))
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    metrics = db.scalars(select(ConversationMetricScore).where(
        ConversationMetricScore.evaluation_run_id == run.id
    ).order_by(ConversationMetricScore.created_at.asc())).all()
    response = _run_response(run)
    response.metrics = [ConversationMetricScoreResponse(
        metric_key=metric.metric_key, score_value=metric.score_value, confidence=metric.confidence,
        rationale=metric.rationale, evidence_json=metric.evidence_json,
    ) for metric in metrics]
    return response


@router.post("/conversations/{conversation_id}/run", response_model=ConversationEvaluationRunResponse)
def run_conversation_evaluation(
    conversation_id: str,
    provider_name: str = "openai",
    model_name: str | None = None,
    rubric_version_id: str | None = None,
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
    if rubric_version_id:
        rubric = db.scalar(select(EvaluationRubricVersion).where(
            EvaluationRubricVersion.id == rubric_version_id,
            EvaluationRubricVersion.workspace_id == workspace_id,
            EvaluationRubricVersion.status == "published",
        ))
        if not rubric:
            raise HTTPException(status_code=400, detail="Choose a published rubric version")
    return _queue_run(conversation_id, provider_name, model_name, rubric_version_id, False, workspace_id, db)


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
    summary_source = run

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
            summary_source = previous_scored_run
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
        qa_verdict=summary_source.qa_verdict,
        qa_summary=summary_source.qa_summary,
        failure_reason=summary_source.failure_reason,
        recommended_next_step=summary_source.recommended_next_step,
        supporting_evidence=summary_source.supporting_evidence,
        rubric_version_id=summary_source.rubric_version_id,
        rubric_name=summary_source.rubric_name,
        rubric_version=summary_source.rubric_version,
        is_test=summary_source.is_test,
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
