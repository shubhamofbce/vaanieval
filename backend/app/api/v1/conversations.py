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
) -> list[ConversationListItem]:
    rows = db.scalars(
        select(Conversation)
        .where(Conversation.workspace_id == workspace_id)
        .order_by(Conversation.created_at.desc())
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
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch provider insights") from exc
