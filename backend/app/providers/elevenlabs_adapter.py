from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.providers.base import (
    ProviderAdapter,
    ProviderAgentInfo,
    ProviderConversationDetail,
    clean_conversation_display_name,
)
from app.services.elevenlabs_client import ElevenLabsClient


class ElevenLabsProviderAdapter(ProviderAdapter):
    def __init__(self, api_key: str) -> None:
        self._client = ElevenLabsClient(api_key=api_key)

    @property
    def provider_name(self) -> str:
        return "elevenlabs"

    def list_agents(self) -> list[ProviderAgentInfo]:
        return [ProviderAgentInfo(agent_id=item.agent_id, name=item.name) for item in self._client.list_agents()]

    def list_conversations(
        self,
        *,
        cursor: str | None,
        page_size: int,
        agent_id: str | None,
        start_date: str | None,
        end_date: str | None,
    ) -> dict[str, Any]:
        # ElevenLabs list endpoint handles provider-side pagination and does not support
        # agent/date filtering in this integration path today.
        return self._client.list_conversations(cursor=cursor, page_size=page_size)

    def get_conversation_detail(
        self,
        conversation_id: str,
        *,
        refresh_analysis: bool = False,
        agent_id: str | None = None,
    ) -> dict[str, Any]:
        if refresh_analysis:
            return self._client.run_conversation_analysis(conversation_id)
        return self._client.get_conversation_detail(conversation_id)

    def normalize_conversation_detail(self, detail: dict[str, Any]) -> ProviderConversationDetail:
        metadata = detail.get("metadata", {}) if isinstance(detail.get("metadata"), dict) else {}
        analysis = detail.get("analysis", {}) if isinstance(detail.get("analysis"), dict) else {}
        started_at = _parse_unix_datetime(metadata.get("start_time_unix_secs")) or _parse_datetime(
            detail.get("start_time") or detail.get("started_at") or detail.get("created_at")
        )
        ended_at = _parse_datetime(detail.get("end_time") or detail.get("ended_at"))
        duration = metadata.get("call_duration_secs")
        if ended_at is None and started_at and isinstance(duration, (int, float)):
            ended_at = started_at + timedelta(seconds=duration)

        return ProviderConversationDetail(
            display_name=_display_name(
                analysis.get("call_summary_title"),
                detail.get("call_summary_title"),
                analysis.get("transcript_summary"),
                detail.get("transcript_summary"),
            ),
            provider_agent_id=detail.get("agent_id") or detail.get("agent", {}).get("agent_id"),
            language=detail.get("language"),
            outcome=detail.get("outcome"),
            started_at=started_at,
            ended_at=ended_at,
            turns=(detail.get("transcript") if isinstance(detail.get("transcript"), list) else []),
            audio_url=detail.get("audio_url"),
        )

    def extract_audio_url(self, detail: dict[str, Any]) -> str | None:
        value = detail.get("audio_url")
        return value if isinstance(value, str) and value else None

    def build_insight_payload(
        self,
        *,
        conversation_id: str,
        provider_agent_id: str | None,
        outcome: str | None,
        detail: dict[str, Any],
    ) -> dict[str, Any]:
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

        quality_signals: list[dict[str, str]] = [
            {"label": "Conversation flow", "value": str(analysis.get("call_successful") or "Unknown")},
            {"label": "Tool actions", "value": str(tool_calls_count)},
            {"label": "Tool outcomes", "value": str(tool_results_count)},
            {"label": "Interruptions", "value": str(interruption_count)},
        ]

        criteria_results = analysis.get("evaluation_criteria_results_list")
        if isinstance(criteria_results, list) and criteria_results:
            passed = sum(
                1
                for item in criteria_results
                if isinstance(item, dict) and str(item.get("result", "")).lower() in {"pass", "passed", "true"}
            )
            quality_signals.append({"label": "Checks passed", "value": f"{passed}/{len(criteria_results)}"})

        data_collection = analysis.get("data_collection_results_list")
        if isinstance(data_collection, list) and data_collection:
            captured = sum(1 for item in data_collection if isinstance(item, dict) and item.get("value") not in (None, ""))
            quality_signals.append({"label": "Data captured", "value": f"{captured}/{len(data_collection)}"})

        duration_secs = metadata.get("call_duration_secs")
        return {
            "conversation_id": conversation_id,
            "assistant_name": detail.get("agent_name") or provider_agent_id,
            "call_status": detail.get("status"),
            "call_result": analysis.get("call_successful") or outcome,
            "summary_title": analysis.get("call_summary_title"),
            "summary_text": analysis.get("transcript_summary"),
            "duration_seconds": int(duration_secs) if isinstance(duration_secs, (int, float)) else None,
            "started_at_unix": (
                int(metadata.get("start_time_unix_secs"))
                if isinstance(metadata.get("start_time_unix_secs"), (int, float))
                else None
            ),
            "end_reason": metadata.get("termination_reason"),
            "environment": detail.get("environment"),
            "warnings": warning_values,
            "quality_signals": quality_signals,
        }

    def get_conversation_audio_bytes(self, conversation_id: str) -> bytes | None:
        return self._client.get_conversation_audio_bytes(conversation_id)


def _parse_datetime(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _parse_unix_datetime(value: object) -> datetime | None:
    if not isinstance(value, (int, float)):
        return None
    timestamp = float(value)
    if timestamp > 1_000_000_000_000:
        timestamp = timestamp / 1000
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def _display_name(*values: object) -> str | None:
    for value in values:
        display_name = clean_conversation_display_name(value)
        if display_name:
            return display_name
    return None
