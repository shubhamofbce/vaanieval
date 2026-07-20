from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

MAX_CONVERSATION_DISPLAY_NAME_LENGTH = 160


def clean_conversation_display_name(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = " ".join(value.split())
    if not normalized:
        return None
    if len(normalized) <= MAX_CONVERSATION_DISPLAY_NAME_LENGTH:
        return normalized

    truncated = normalized[: MAX_CONVERSATION_DISPLAY_NAME_LENGTH - 1].rsplit(" ", 1)[0].rstrip()
    return f"{truncated or normalized[: MAX_CONVERSATION_DISPLAY_NAME_LENGTH - 1]}…"


@dataclass
class ProviderAgentInfo:
    agent_id: str
    name: str


@dataclass
class ProviderConversationDetail:
    provider_agent_id: str | None
    language: str | None
    outcome: str | None
    started_at: datetime | None
    ended_at: datetime | None
    turns: list[dict[str, Any]]
    audio_url: str | None
    display_name: str | None = None


class ProviderAdapter(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def list_agents(self) -> list[ProviderAgentInfo]:
        raise NotImplementedError

    @abstractmethod
    def list_conversations(
        self,
        *,
        cursor: str | None,
        page_size: int,
        agent_id: str | None,
        start_date: str | None,
        end_date: str | None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_conversation_detail(
        self,
        conversation_id: str,
        *,
        refresh_analysis: bool = False,
        agent_id: str | None = None,
    ) -> dict[str, Any]:
        # `agent_id` is optional and only required by providers (e.g. Bolna) whose
        # conversation-detail endpoint is nested under the owning agent. Callers should
        # pass it when available (e.g. Conversation.provider_agent_id) so those
        # providers can address the endpoint directly instead of resolving it.
        raise NotImplementedError

    @abstractmethod
    def normalize_conversation_detail(self, detail: dict[str, Any]) -> ProviderConversationDetail:
        raise NotImplementedError

    @abstractmethod
    def extract_audio_url(self, detail: dict[str, Any]) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def build_insight_payload(
        self,
        *,
        conversation_id: str,
        provider_agent_id: str | None,
        outcome: str | None,
        detail: dict[str, Any],
    ) -> dict[str, Any]:
        raise NotImplementedError

    def get_conversation_audio_bytes(
        self,
        conversation_id: str,
        *,
        agent_id: str | None = None,
    ) -> bytes | None:
        return None
