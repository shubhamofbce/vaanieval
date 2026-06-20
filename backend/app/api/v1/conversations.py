from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.conversation import Conversation, ConversationTurn
from app.models.provider import ProviderAccount
from app.schemas.conversations import (
    ConversationDetailResponse,
    ConversationInsightResponse,
    ConversationListItem,
    ConversationQualitySignal,
    ConversationTurnItem,
)
from app.services.credentials import decrypt_secret
from app.services.elevenlabs_client import ElevenLabsClient

router = APIRouter()


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

    return [
        ConversationListItem(
            id=row.id,
            provider_conversation_id=row.provider_conversation_id,
            provider_agent_id=row.provider_agent_id,
            language=row.language,
            outcome=row.outcome,
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
        client = ElevenLabsClient(api_key=decrypt_secret(account.api_key))
        detail = (
            client.run_conversation_analysis(row.provider_conversation_id)
            if refresh_analysis
            else client.get_conversation_detail(row.provider_conversation_id)
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch provider insights") from exc

    metadata = detail.get("metadata", {}) if isinstance(detail.get("metadata"), dict) else {}
    analysis = detail.get("analysis", {}) if isinstance(detail.get("analysis"), dict) else {}

    warning_values: list[str] = []
    raw_warnings = metadata.get("warnings")
    if isinstance(raw_warnings, list):
        for warning in raw_warnings:
            if isinstance(warning, str):
                warning_values.append(warning)
            elif isinstance(warning, dict):
                message = warning.get("message") or warning.get("warning") or warning.get("code")
                if isinstance(message, str) and message.strip():
                    warning_values.append(message)

    turns = detail.get("transcript") if isinstance(detail.get("transcript"), list) else []
    interruption_count = sum(1 for turn in turns if isinstance(turn, dict) and turn.get("interrupted"))
    tool_calls_count = sum(
        len(turn.get("tool_calls", []))
        for turn in turns
        if isinstance(turn, dict) and isinstance(turn.get("tool_calls"), list)
    )
    tool_results_count = sum(
        len(turn.get("tool_results", []))
        for turn in turns
        if isinstance(turn, dict) and isinstance(turn.get("tool_results"), list)
    )

    quality_signals: list[ConversationQualitySignal] = [
        ConversationQualitySignal(label="Conversation flow", value=(analysis.get("call_successful") or "Unknown")),
        ConversationQualitySignal(label="Tool actions", value=str(tool_calls_count)),
        ConversationQualitySignal(label="Tool outcomes", value=str(tool_results_count)),
        ConversationQualitySignal(label="Interruptions", value=str(interruption_count)),
    ]

    criteria_results = analysis.get("evaluation_criteria_results_list")
    if isinstance(criteria_results, list) and criteria_results:
        passed = sum(
            1
            for item in criteria_results
            if isinstance(item, dict) and str(item.get("result", "")).lower() in {"pass", "passed", "true"}
        )
        quality_signals.append(
            ConversationQualitySignal(label="Checks passed", value=f"{passed}/{len(criteria_results)}")
        )

    data_collection = analysis.get("data_collection_results_list")
    if isinstance(data_collection, list) and data_collection:
        captured = sum(1 for item in data_collection if isinstance(item, dict) and item.get("value") not in (None, ""))
        quality_signals.append(
            ConversationQualitySignal(label="Data captured", value=f"{captured}/{len(data_collection)}")
        )

    duration_secs = metadata.get("call_duration_secs")
    return ConversationInsightResponse(
        conversation_id=row.id,
        assistant_name=detail.get("agent_name") or row.provider_agent_id,
        call_status=detail.get("status"),
        call_result=analysis.get("call_successful") or row.outcome,
        summary_title=analysis.get("call_summary_title"),
        summary_text=analysis.get("transcript_summary"),
        duration_seconds=int(duration_secs) if isinstance(duration_secs, (int, float)) else None,
        started_at_unix=(
            int(metadata.get("start_time_unix_secs"))
            if isinstance(metadata.get("start_time_unix_secs"), (int, float))
            else None
        ),
        end_reason=metadata.get("termination_reason"),
        environment=detail.get("environment"),
        warnings=warning_values,
        quality_signals=quality_signals,
    )
