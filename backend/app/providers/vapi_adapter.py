from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.providers.base import ProviderAdapter, ProviderAgentInfo, ProviderConversationDetail
from app.services.vapi_client import VapiClient


class VapiProviderAdapter(ProviderAdapter):
    def __init__(self, api_key: str) -> None:
        self._client = VapiClient(api_key=api_key)

    @property
    def provider_name(self) -> str:
        return "vapi"

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
        return self._client.list_calls(
            cursor=cursor,
            page_size=page_size,
            assistant_id=agent_id,
            start_date=start_date,
            end_date=end_date,
        )

    def get_conversation_detail(
        self,
        conversation_id: str,
        *,
        refresh_analysis: bool = False,
        agent_id: str | None = None,
    ) -> dict[str, Any]:
        # Vapi does not currently expose a separate analysis-run endpoint in this path.
        return self._client.get_call(conversation_id)

    def normalize_conversation_detail(self, detail: dict[str, Any]) -> ProviderConversationDetail:
        started_at = _parse_datetime(detail.get("startedAt") or detail.get("started_at") or detail.get("createdAt"))
        ended_at = _parse_datetime(detail.get("endedAt") or detail.get("ended_at"))
        return ProviderConversationDetail(
            provider_agent_id=detail.get("assistantId") or detail.get("assistant", {}).get("id"),
            language=_extract_language(detail),
            outcome=_extract_outcome(detail),
            started_at=started_at,
            ended_at=ended_at,
            turns=_extract_turns(detail),
            audio_url=self.extract_audio_url(detail),
        )

    def extract_audio_url(self, detail: dict[str, Any]) -> str | None:
        artifact = detail.get("artifact") if isinstance(detail.get("artifact"), dict) else {}
        recording = artifact.get("recording") if isinstance(artifact.get("recording"), dict) else {}
        mono = recording.get("mono") if isinstance(recording.get("mono"), dict) else {}
        for candidate in (
            artifact.get("recordingUrl"),
            artifact.get("stereoRecordingUrl"),
            recording.get("stereoUrl"),
            mono.get("combinedUrl"),
            mono.get("assistantUrl"),
            mono.get("customerUrl"),
        ):
            if isinstance(candidate, str) and candidate:
                return candidate
        return None

    def build_insight_payload(
        self,
        *,
        conversation_id: str,
        provider_agent_id: str | None,
        outcome: str | None,
        detail: dict[str, Any],
    ) -> dict[str, Any]:
        analysis = detail.get("analysis") if isinstance(detail.get("analysis"), dict) else {}
        artifact = detail.get("artifact") if isinstance(detail.get("artifact"), dict) else {}
        messages = artifact.get("messages") if isinstance(artifact.get("messages"), list) else detail.get("messages", [])

        tool_calls_count = sum(
            len(item.get("tool_calls", []))
            for item in messages
            if isinstance(item, dict) and isinstance(item.get("tool_calls"), list)
        )
        tool_results_count = sum(
            1 for item in messages if isinstance(item, dict) and str(item.get("role") or "") == "tool"
        )

        performance_metrics = artifact.get("performanceMetrics") if isinstance(artifact.get("performanceMetrics"), dict) else {}
        interruption_count = performance_metrics.get("numUserInterrupted")
        interruption_value = str(int(interruption_count)) if isinstance(interruption_count, (int, float)) else "0"

        quality_signals = [
            {"label": "Conversation flow", "value": str(analysis.get("successEvaluation") or outcome or "Unknown")},
            {"label": "Tool actions", "value": str(tool_calls_count)},
            {"label": "Tool outcomes", "value": str(tool_results_count)},
            {"label": "Interruptions", "value": interruption_value},
        ]

        warnings: list[str] = []
        ended_message = detail.get("endedMessage")
        ended_message_text = _coerce_text(ended_message)
        if ended_message_text:
            warnings.append(ended_message_text)

        started_at = _parse_datetime_to_unix(detail.get("startedAt"))
        duration_seconds = _compute_duration_seconds(detail.get("startedAt"), detail.get("endedAt"))
        assistant = detail.get("assistant") if isinstance(detail.get("assistant"), dict) else {}
        assistant_name = _coerce_text(assistant.get("name"))

        return {
            "conversation_id": conversation_id,
            "assistant_name": assistant_name,
            "call_status": detail.get("status") if isinstance(detail.get("status"), str) else None,
            "call_result": analysis.get("successEvaluation") if isinstance(analysis.get("successEvaluation"), str) else outcome,
            "summary_title": None,
            "summary_text": _extract_summary_text(analysis=analysis, artifact=artifact, messages=messages),
            "duration_seconds": duration_seconds,
            "started_at_unix": started_at,
            "end_reason": detail.get("endedReason") if isinstance(detail.get("endedReason"), str) else None,
            "environment": detail.get("type") if isinstance(detail.get("type"), str) else None,
            "warnings": warnings,
            "quality_signals": quality_signals,
        }


def _extract_summary_text(*, analysis: dict[str, Any], artifact: dict[str, Any], messages: Any) -> str | None:
    summary = _coerce_text(analysis.get("summary"))
    if summary:
        return summary

    transcript = artifact.get("transcript")
    transcript_text = _coerce_text(transcript)
    if transcript_text:
        return transcript_text

    if isinstance(transcript, list):
        parts = [_coerce_text(item) for item in transcript]
        joined = "\n".join(part for part in parts if part)
        if joined:
            return joined

    if isinstance(messages, list):
        message_parts = [_coerce_text(item) for item in messages]
        joined = "\n".join(part for part in message_parts if part)
        if joined:
            return joined

    return None


def _coerce_text(value: Any) -> str | None:
    if isinstance(value, str):
        text = value.strip()
        return text or None

    if isinstance(value, (int, float, bool)):
        return str(value)

    if isinstance(value, dict):
        for key in ("summary", "text", "message", "content", "transcript", "result"):
            nested = _coerce_text(value.get(key))
            if nested:
                return nested
        return None

    if isinstance(value, list):
        parts = [_coerce_text(item) for item in value]
        joined = " ".join(part for part in parts if part)
        return joined or None

    return None


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


def _extract_language(detail: dict[str, Any]) -> str | None:
    assistant = detail.get("assistant") if isinstance(detail.get("assistant"), dict) else {}
    transcriber = assistant.get("transcriber") if isinstance(assistant.get("transcriber"), dict) else {}
    language = transcriber.get("language")
    return str(language) if isinstance(language, str) and language else None


def _extract_outcome(detail: dict[str, Any]) -> str | None:
    analysis = detail.get("analysis") if isinstance(detail.get("analysis"), dict) else {}
    success_evaluation = analysis.get("successEvaluation")
    if isinstance(success_evaluation, str) and success_evaluation.strip():
        return success_evaluation
    status = detail.get("status")
    if isinstance(status, str) and status:
        return status
    ended_reason = detail.get("endedReason")
    return str(ended_reason) if isinstance(ended_reason, str) and ended_reason else None


def _extract_turns(detail: dict[str, Any]) -> list[dict[str, Any]]:
    artifact = detail.get("artifact") if isinstance(detail.get("artifact"), dict) else {}
    raw_turns = artifact.get("messages") if isinstance(artifact.get("messages"), list) else detail.get("messages", [])
    turns: list[dict[str, Any]] = []
    for item in raw_turns:
        if not isinstance(item, dict):
            continue
        raw_role = str(item.get("role") or "unknown").strip().lower()
        if raw_role in {"system", "developer"}:
            continue

        text = _extract_text(item)
        if not text:
            continue

        started_ms = _extract_ms(item.get("time"), item.get("secondsFromStart"))
        ended_ms = _extract_end_ms(item, started_ms)
        normalized_role = "agent" if raw_role in {"bot", "assistant", "ai"} else raw_role
        turns.append(
            {
                "role": normalized_role,
                "text": text,
                "start_ms": started_ms,
                "end_ms": ended_ms,
            }
        )
    return turns


def _extract_text(message: dict[str, Any]) -> str:
    for key in ("message", "content", "result", "originalMessage"):
        value = message.get(key)
        if isinstance(value, str) and value.strip():
            return value
    tool_calls = message.get("toolCalls")
    if isinstance(tool_calls, list) and tool_calls:
        names = [item.get("name") for item in tool_calls if isinstance(item, dict) and item.get("name")]
        if names:
            return ", ".join(str(name) for name in names)
    return ""


def _extract_ms(time_value: object, seconds_from_start: object) -> int | None:
    if isinstance(seconds_from_start, (int, float)):
        return int(seconds_from_start * 1000)
    if isinstance(time_value, (int, float)):
        value = int(time_value)
        # Large values are typically absolute epoch milliseconds, not timeline offsets.
        if value >= 1_000_000_000_000:
            return None
        return value
    return None


def _extract_end_ms(message: dict[str, Any], started_ms: int | None) -> int | None:
    end_time = message.get("endTime")
    if isinstance(end_time, (int, float)):
        value = int(end_time)
        if value < 1_000_000_000_000:
            return value
    duration = message.get("duration")
    if started_ms is not None and isinstance(duration, (int, float)):
        duration_value = int(duration)
        if duration_value >= 1000:
            return started_ms + duration_value
        return started_ms + int(duration * 1000)
    return None


def _parse_datetime_to_unix(value: object) -> int | None:
    parsed = _parse_datetime(value)
    return int(parsed.timestamp()) if parsed else None


def _compute_duration_seconds(started_at: object, ended_at: object) -> int | None:
    started_at_unix = _parse_datetime_to_unix(started_at)
    ended_at_unix = _parse_datetime_to_unix(ended_at)
    if started_at_unix is None or ended_at_unix is None:
        return None
    return max(0, ended_at_unix - started_at_unix)
