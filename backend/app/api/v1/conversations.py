from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.conversation import Conversation, ConversationTurn
from app.models.evaluation import ConversationEvaluationRun, ConversationMetricScore
from app.models.provider import ProviderAccount, ProviderAgent
from app.providers.factory import get_provider_adapter
from app.schemas.conversations import (
    ConversationDetailResponse,
    ConversationInsightResponse,
    ConversationListItem,
    ConversationListResponse,
    ConversationTurnItem,
)
from app.services.credentials import decrypt_secret

router = APIRouter()

_QA_PASS_OVERALL = 80
_QA_PASS_METRIC_FLOOR = 60
_QA_ATTENTION_OVERALL = 60
_QA_ATTENTION_METRIC_FLOOR = 50


def _compute_qa_verdict(
    overall_score: float | None,
    lowest_score: float | None,
    eval_status: str | None,
) -> str:
    """Compute the QA verdict for a conversation.

    Logic mirrors the frontend ``buildQaSummary`` in ``qa.ts``.
    """
    if eval_status == "failed":
        return "needs_attention"

    if overall_score is None:
        return "pending"

    if (
        overall_score < _QA_ATTENTION_OVERALL
        or (lowest_score is not None and lowest_score < _QA_ATTENTION_METRIC_FLOOR)
    ):
        return "needs_attention"

    if (
        overall_score >= _QA_PASS_OVERALL
        and (lowest_score is None or lowest_score >= _QA_PASS_METRIC_FLOOR)
    ):
        return "passed"

    return "review"


def _load_evaluation_summaries(
    db: Session,
    *,
    workspace_id: str,
    conversation_ids: list[str],
) -> dict[str, dict]:
    """Load the latest evaluation summary for each conversation.

    Returns a dict mapping conversation_id -> {overall_score, lowest_score, eval_status, qa_verdict}.
    """
    if not conversation_ids:
        return {}

    runs = db.scalars(
        select(ConversationEvaluationRun)
        .where(
            ConversationEvaluationRun.workspace_id == workspace_id,
            ConversationEvaluationRun.conversation_id.in_(conversation_ids),
        )
        .order_by(
            ConversationEvaluationRun.conversation_id.asc(),
            ConversationEvaluationRun.created_at.desc(),
        )
    ).all()

    latest_by_conversation: dict[str, ConversationEvaluationRun] = {}
    for run in runs:
        latest_by_conversation.setdefault(run.conversation_id, run)
    completed_by_conversation: dict[str, ConversationEvaluationRun] = {}
    for run in runs:
        if run.status == "completed":
            completed_by_conversation.setdefault(run.conversation_id, run)

    completed_run_ids = [run.id for run in completed_by_conversation.values()]
    scores_by_run: dict[str, list[ConversationMetricScore]] = defaultdict(list)
    if completed_run_ids:
        score_rows = db.scalars(
            select(ConversationMetricScore)
            .where(ConversationMetricScore.evaluation_run_id.in_(completed_run_ids))
        ).all()
        for score in score_rows:
            scores_by_run[score.evaluation_run_id].append(score)

    result: dict[str, dict] = {}
    for cid in conversation_ids:
        latest_run = latest_by_conversation.get(cid)
        completed_run = completed_by_conversation.get(cid)
        metrics = scores_by_run.get(completed_run.id, []) if completed_run else []
        finite_scores = [m.score_value for m in metrics if m.score_value is not None]

        overall_score = int(mean(finite_scores) + 0.5) if finite_scores else None
        lowest_score = min(finite_scores) if finite_scores else None
        eval_status = latest_run.status if latest_run else None
        qa_verdict = (
            completed_run.qa_verdict
            if completed_run and completed_run.qa_verdict
            else _compute_qa_verdict(overall_score, lowest_score, eval_status)
        )

        result[cid] = {
            "overall_score": overall_score,
            "lowest_score": lowest_score,
            "eval_status": eval_status,
            "qa_verdict": qa_verdict,
        }

    return result


def _build_local_fallback_insight_payload(
    db: Session,
    *,
    row: Conversation,
    provider_name: str,
    error_message: str,
) -> dict[str, object]:
    turns = db.scalars(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == row.id)
        .order_by(ConversationTurn.turn_order.asc())
    ).all()

    usable_turns = [turn for turn in turns if turn.text and turn.text.strip()]
    first_turn = usable_turns[0].text.strip() if usable_turns else None
    last_turn = usable_turns[-1].text.strip() if usable_turns else None
    summary_lines = [part for part in (first_turn, last_turn) if part]

    started_at_unix = None
    if row.started_at is not None:
        started = row.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        started_at_unix = int(started.timestamp())

    duration_seconds = None
    if row.started_at is not None and row.ended_at is not None:
        duration_seconds = max(0, int((row.ended_at - row.started_at).total_seconds()))

    agent_name = _get_provider_agent_name(
        db,
        provider_account_id=row.provider_account_id,
        provider_agent_id=row.provider_agent_id,
    )

    warnings = [
        f"Live provider insights are temporarily unavailable ({_summarize_provider_error(error_message)}). Showing stored conversation data."
    ]

    return {
        "conversation_id": row.id,
        "assistant_name": agent_name,
        "call_status": row.outcome or "unknown",
        "call_result": row.outcome,
        "summary_title": "Conversation snapshot",
        "summary_text": "\n".join(summary_lines) if summary_lines else None,
        "duration_seconds": duration_seconds,
        "started_at_unix": started_at_unix,
        "end_reason": None,
        "environment": provider_name,
        "warnings": warnings,
        "quality_signals": [
            {"label": "Provider", "value": provider_name},
            {"label": "Turns captured", "value": str(len(usable_turns))},
            {"label": "Outcome", "value": row.outcome or "Unknown"},
            {"label": "Live provider fetch", "value": "Unavailable"},
        ],
    }


def _summarize_provider_error(error_message: str) -> str:
    normalized = (error_message or "").lower()
    if "unauthorized" in normalized or "401" in normalized:
        return "provider account authorization failed"
    if "decrypt" in normalized or "credential" in normalized:
        return "stored provider credential could not be read"
    if "timeout" in normalized:
        return "provider request timed out"
    return "provider request failed"


def _get_provider_agent_name(
    db: Session,
    *,
    provider_account_id: str,
    provider_agent_id: str | None,
) -> str | None:
    if not provider_agent_id:
        return None

    return db.scalar(
        select(ProviderAgent.name).where(
            ProviderAgent.provider_account_id == provider_account_id,
            ProviderAgent.provider_agent_id == provider_agent_id,
        )
    )


@router.get("", response_model=ConversationListResponse)
def list_conversations(
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    agent_id: str | None = Query(default=None),
    language: str | None = Query(default=None),
    provider_name: str | None = Query(default=None),
    search: str | None = Query(default=None),
    score_band: str | None = Query(default=None),
    qa_status: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> ConversationListResponse:

    stmt = (
        select(Conversation)
        .join(ProviderAccount, ProviderAccount.id == Conversation.provider_account_id)
        .where(Conversation.workspace_id == workspace_id)
    )

    if agent_id:
        stmt = stmt.where(Conversation.provider_agent_id == agent_id)
    if language:
        stmt = stmt.where(Conversation.language == language)
    if provider_name:
        stmt = stmt.where(ProviderAccount.provider_name == provider_name)
    if date_from:
        stmt = stmt.where(Conversation.started_at >= date_from)
    if date_to:
        stmt = stmt.where(Conversation.started_at <= date_to)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Conversation.provider_conversation_id.ilike(pattern),
                Conversation.provider_agent_id.ilike(pattern),
                ProviderAccount.provider_name.ilike(pattern),
                Conversation.language.ilike(pattern),
            )
        )

    all_rows = db.scalars(
        stmt.order_by(Conversation.created_at.desc())
    ).all()

    eval_summaries = _load_evaluation_summaries(
        db,
        workspace_id=workspace_id,
        conversation_ids=[row.id for row in all_rows],
    )

    if score_band and score_band != "all":
        filtered = []
        for row in all_rows:
            overall = eval_summaries.get(row.id, {}).get("overall_score")
            if overall is None:
                continue
            if score_band == "red" and overall < 60:
                filtered.append(row)
            elif score_band == "yellow" and 60 <= overall < 80:
                filtered.append(row)
            elif score_band == "green" and overall >= 80:
                filtered.append(row)
        all_rows = filtered

    if qa_status and qa_status != "all":
        filtered = []
        for row in all_rows:
            verdict = eval_summaries.get(row.id, {}).get("qa_verdict", "pending")
            if qa_status == "attention" and verdict in ("needs_attention", "pending"):
                filtered.append(row)
            elif qa_status == "passed" and verdict == "passed":
                filtered.append(row)
        all_rows = filtered

    if qa_status == "attention":
        def _severity_key(row: Conversation):
            summary = eval_summaries.get(row.id, {})
            verdict = summary.get("qa_verdict", "pending")
            overall = summary.get("overall_score")
            verdict_rank = {"needs_attention": 0, "pending": 1, "review": 2, "passed": 3}.get(verdict, 1)
            return (verdict_rank, overall if overall is not None else -1)

        all_rows = sorted(all_rows, key=_severity_key)

    total = len(all_rows)
    paginated_rows = all_rows[offset : offset + limit]

    account_ids = {row.provider_account_id for row in paginated_rows}
    accounts = (
        db.scalars(select(ProviderAccount).where(ProviderAccount.id.in_(account_ids))).all()
        if account_ids
        else []
    )
    provider_name_by_account_id = {account.id: account.provider_name for account in accounts}

    agents = (
        db.scalars(
            select(ProviderAgent).where(ProviderAgent.provider_account_id.in_(account_ids))
        ).all()
        if account_ids
        else []
    )
    provider_agent_name_by_key = {
        (agent.provider_account_id, agent.provider_agent_id): agent.name for agent in agents
    }

    items = [
        ConversationListItem(
            id=row.id,
            provider_account_id=row.provider_account_id,
            provider_name=provider_name_by_account_id.get(row.provider_account_id, "unknown"),
            provider_conversation_id=row.provider_conversation_id,
            provider_agent_id=row.provider_agent_id,
            provider_agent_name=provider_agent_name_by_key.get(
                (row.provider_account_id, row.provider_agent_id or "")
            ),
            language=row.language,
            outcome=row.outcome,
            started_at=row.started_at,
            ended_at=row.ended_at,
            created_at=row.created_at,
            overall_score=eval_summaries.get(row.id, {}).get("overall_score"),
            qa_verdict=eval_summaries.get(row.id, {}).get("qa_verdict"),
        )
        for row in paginated_rows
    ]

    return ConversationListResponse(items=items, total=total)


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_detail(
    conversation_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    row = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    turns = db.scalars(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == row.id)
        .order_by(ConversationTurn.turn_order.asc())
    ).all()

    return ConversationDetailResponse(
        id=row.id,
        provider_name=(
            db.scalar(select(ProviderAccount.provider_name).where(ProviderAccount.id == row.provider_account_id))
            or "unknown"
        ),
        provider_conversation_id=row.provider_conversation_id,
        provider_agent_id=row.provider_agent_id,
        provider_agent_name=_get_provider_agent_name(
            db,
            provider_account_id=row.provider_account_id,
            provider_agent_id=row.provider_agent_id,
        ),
        language=row.language,
        outcome=row.outcome,
        turns=[
            ConversationTurnItem(
                id=turn.id,
                role=turn.role,
                text=turn.text,
                started_ms=turn.started_ms,
                ended_ms=turn.ended_ms,
                turn_order=turn.turn_order,
            )
            for turn in turns
        ],
    )


@router.get("/{conversation_id}/insights", response_model=ConversationInsightResponse)
def get_conversation_insights(
    conversation_id: str,
    refresh_analysis: bool = Query(default=False),
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ConversationInsightResponse:
    row = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    account = db.scalar(select(ProviderAccount).where(ProviderAccount.id == row.provider_account_id))
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")

    try:
        adapter = get_provider_adapter(
            provider_name=account.provider_name,
            api_key=decrypt_secret(account.api_key),
        )
        detail = adapter.get_conversation_detail(
            row.provider_conversation_id,
            refresh_analysis=refresh_analysis,
        )
        payload = adapter.build_insight_payload(
            conversation_id=row.id,
            provider_agent_id=row.provider_agent_id,
            outcome=row.outcome,
            detail=detail,
        )
        return ConversationInsightResponse(**payload)
    except Exception as exc:  # noqa: BLE001
        fallback_payload = _build_local_fallback_insight_payload(
            db,
            row=row,
            provider_name=account.provider_name,
            error_message=str(exc) or "provider request failed",
        )
        return ConversationInsightResponse(**fallback_payload)
