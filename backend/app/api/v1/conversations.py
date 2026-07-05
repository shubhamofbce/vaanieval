from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.conversation import Conversation, ConversationTurn
from app.models.provider import ProviderAccount, ProviderAgent
from app.providers.factory import get_provider_adapter
from app.schemas.conversations import (
    ConversationDetailResponse,
    ConversationInsightResponse,
    ConversationListItem,
    ConversationTurnItem,
)
from app.services.credentials import decrypt_secret

router = APIRouter()


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


@router.get("", response_model=list[ConversationListItem])
def list_conversations(
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    agent_id: str | None = Query(default=None),
    language: str | None = Query(default=None),
    outcome: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> list[ConversationListItem]:
    stmt = select(Conversation).where(Conversation.workspace_id == workspace_id)
    
    if agent_id:
        stmt = stmt.where(Conversation.provider_agent_id == agent_id)
    if language:
        stmt = stmt.where(Conversation.language == language)
    if outcome:
        stmt = stmt.where(Conversation.outcome == outcome)
    if date_from:
        stmt = stmt.where(Conversation.started_at >= date_from)
    if date_to:
        stmt = stmt.where(Conversation.started_at <= date_to)

    rows = db.scalars(
        stmt.order_by(Conversation.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    account_ids = {row.provider_account_id for row in rows}
    accounts = db.scalars(select(ProviderAccount).where(ProviderAccount.id.in_(account_ids))).all()
    provider_name_by_account_id = {account.id: account.provider_name for account in accounts}

    agents = db.scalars(
        select(ProviderAgent).where(ProviderAgent.provider_account_id.in_(account_ids))
    ).all()
    provider_agent_name_by_key = {
        (agent.provider_account_id, agent.provider_agent_id): agent.name for agent in agents
    }

    return [
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
        )
        for row in rows
    ]


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
