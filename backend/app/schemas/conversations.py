from datetime import datetime

from pydantic import BaseModel


class ConversationListItem(BaseModel):
    id: str
    provider_conversation_id: str
    provider_agent_id: str | None
    language: str | None
    outcome: str | None
    created_at: datetime


class ConversationTurnItem(BaseModel):
    id: str
    role: str
    text: str
    started_ms: int | None
    ended_ms: int | None
    turn_order: int


class ConversationDetailResponse(BaseModel):
    id: str
    provider_conversation_id: str
    provider_agent_id: str | None
    language: str | None
    outcome: str | None
    turns: list[ConversationTurnItem]


class ConversationQualitySignal(BaseModel):
    label: str
    value: str


class ConversationInsightResponse(BaseModel):
    conversation_id: str
    assistant_name: str | None
    call_status: str | None
    call_result: str | None
    summary_title: str | None
    summary_text: str | None
    duration_seconds: int | None
    started_at_unix: int | None
    end_reason: str | None
    environment: str | None
    warnings: list[str]
    quality_signals: list[ConversationQualitySignal]
