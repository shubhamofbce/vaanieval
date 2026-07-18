from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from app.providers.base import (
    ProviderAdapter,
    ProviderAgentInfo,
    ProviderConversationDetail,
    clean_conversation_display_name,
)
from app.services.bolna_client import BolnaClient


class BolnaProviderAdapter(ProviderAdapter):
    def __init__(self, api_key: str) -> None:
        self._client = BolnaClient(api_key=api_key)

    @property
    def provider_name(self) -> str:
        return "bolna"

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
        # Bolna's /agent/{id}/executions endpoint has no server-side pagination or date
        # filters, so we fetch the (per-agent) execution history and paginate/filter
        # client-side. This is fine for small-to-medium call volumes but means a full
        # per-agent fetch on every page for accounts with very large call histories.
        executions = self._client.list_executions(agent_id=agent_id)

        start_bound = _normalize_date_bound(start_date, is_end=False)
        end_bound = _normalize_date_bound(end_date, is_end=True)
        if start_bound or end_bound:
            executions = [item for item in executions if _within_bounds(item, start_bound, end_bound)]

        executions.sort(key=lambda item: (str(item.get("created_at") or ""), str(item.get("id") or "")), reverse=True)

        offset = _decode_offset(cursor)
        page_items = executions[offset : offset + page_size]
        next_cursor = json.dumps({"offset": offset + page_size}) if offset + page_size < len(executions) else None

        return {"conversations": page_items, "next_cursor": next_cursor}

    def get_conversation_detail(
        self,
        conversation_id: str,
        *,
        refresh_analysis: bool = False,
        agent_id: str | None = None,
    ) -> dict[str, Any]:
        # Bolna does not currently expose a separate analysis-run endpoint.
        return self._client.get_execution(execution_id=conversation_id, agent_id=agent_id)

    def normalize_conversation_detail(self, detail: dict[str, Any]) -> ProviderConversationDetail:
        started_at = _parse_datetime(detail.get("initiated_at") or detail.get("created_at"))
        duration_seconds = _extract_duration_seconds(detail)
        ended_at = _parse_datetime(detail.get("updated_at"))
        if started_at and isinstance(duration_seconds, (int, float)) and duration_seconds > 0:
            ended_at = started_at + timedelta(seconds=duration_seconds)

        return ProviderConversationDetail(
            display_name=_extract_display_name(detail),
            provider_agent_id=detail.get("agent_id"),
            language=None,
            outcome=detail.get("status") if isinstance(detail.get("status"), str) else None,
            started_at=started_at,
            ended_at=ended_at,
            turns=_extract_turns(detail),
            audio_url=self.extract_audio_url(detail),
        )

    def extract_audio_url(self, detail: dict[str, Any]) -> str | None:
        telephony = detail.get("telephony_data") if isinstance(detail.get("telephony_data"), dict) else {}
        recording_url = telephony.get("recording_url")
        return recording_url if isinstance(recording_url, str) and recording_url else None

    def build_insight_payload(
        self,
        *,
        conversation_id: str,
        provider_agent_id: str | None,
        outcome: str | None,
        detail: dict[str, Any],
    ) -> dict[str, Any]:
        telephony = detail.get("telephony_data") if isinstance(detail.get("telephony_data"), dict) else {}
        cost_breakdown = detail.get("cost_breakdown") if isinstance(detail.get("cost_breakdown"), dict) else {}
        extracted_data = detail.get("extracted_data") if isinstance(detail.get("extracted_data"), dict) else {}

        warnings: list[str] = []
        error_message = detail.get("error_message")
        if isinstance(error_message, str) and error_message.strip():
            warnings.append(error_message)

        total_cost = detail.get("total_cost")
        quality_signals = [
            {"label": "Conversation flow", "value": str(detail.get("status") or outcome or "Unknown")},
            {"label": "Answered by voicemail", "value": str(bool(detail.get("answered_by_voice_mail")))},
            {
                "label": "Total cost (cents)",
                "value": f"{total_cost:.2f}" if isinstance(total_cost, (int, float)) else "0",
            },
            {"label": "Hangup by", "value": str(telephony.get("hangup_by") or "Unknown")},
        ]
        if extracted_data:
            quality_signals.append({"label": "Extracted fields", "value": str(len(extracted_data))})
        if cost_breakdown:
            quality_signals.append(
                {
                    "label": "Cost breakdown",
                    "value": ", ".join(f"{key}: {value}" for key, value in cost_breakdown.items()),
                }
            )

        started_at = _parse_datetime(detail.get("initiated_at") or detail.get("created_at"))
        return {
            "conversation_id": conversation_id,
            "assistant_name": provider_agent_id,
            "call_status": detail.get("status") if isinstance(detail.get("status"), str) else None,
            "call_result": detail.get("status") if isinstance(detail.get("status"), str) else outcome,
            "summary_title": None,
            "summary_text": detail.get("summary") if isinstance(detail.get("summary"), str) else None,
            "duration_seconds": _extract_duration_seconds(detail),
            "started_at_unix": int(started_at.timestamp()) if started_at else None,
            "end_reason": telephony.get("hangup_reason") if isinstance(telephony.get("hangup_reason"), str) else None,
            "environment": telephony.get("call_type") if isinstance(telephony.get("call_type"), str) else None,
            "warnings": warnings,
            "quality_signals": quality_signals,
        }

    def get_conversation_audio_bytes(self, conversation_id: str) -> bytes | None:
        # Recording URLs require the same bearer token used for the REST API, so we
        # cannot redirect the browser directly at them; fetch and proxy the bytes.
        detail = self._client.get_execution(execution_id=conversation_id, agent_id=None)
        recording_url = self.extract_audio_url(detail)
        if not recording_url:
            return None
        return self._client.get_recording_bytes(recording_url)


def _extract_duration_seconds(detail: dict[str, Any]) -> int | None:
    telephony = detail.get("telephony_data") if isinstance(detail.get("telephony_data"), dict) else {}
    duration = telephony.get("duration")
    if duration is None:
        duration = detail.get("conversation_duration")
    if isinstance(duration, (int, float)):
        return int(duration)
    if isinstance(duration, str) and duration.isdigit():
        return int(duration)
    return None


def _extract_turns(detail: dict[str, Any]) -> list[dict[str, Any]]:
    transcript = detail.get("transcript")
    if not isinstance(transcript, str) or not transcript.strip():
        return []

    turns: list[dict[str, Any]] = []
    for line in transcript.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        raw_role, _, text = line.partition(":")
        text = text.strip()
        if not text:
            continue
        normalized_role = "agent" if raw_role.strip().lower() in {"assistant", "bot", "ai"} else raw_role.strip().lower()
        turns.append({"role": normalized_role, "text": text, "start_ms": None, "end_ms": None})
    return turns


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


def _within_bounds(item: dict[str, Any], start_bound: str | None, end_bound: str | None) -> bool:
    created_at = item.get("created_at")
    if not isinstance(created_at, str):
        return True
    if start_bound and created_at < start_bound:
        return False
    if end_bound and created_at > end_bound:
        return False
    return True


def _normalize_date_bound(raw_value: str | None, *, is_end: bool) -> str | None:
    if not raw_value:
        return None

    # Detect bare date input (e.g. "2026-07-18") explicitly instead of relying on
    # datetime.fromisoformat() to raise ValueError: on Python 3.11+ that call now
    # happily parses date-only strings as midnight, which would silently turn an
    # "end date" bound into the start of that day (excluding same-day results)
    # instead of applying the intended end-of-day time.max.
    try:
        parsed_date = date.fromisoformat(raw_value)
        parsed_time = time.max if is_end else time.min
        parsed = datetime.combine(parsed_date, parsed_time)
    except ValueError:
        try:
            parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
        except ValueError:
            return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)

    return parsed.isoformat().replace("+00:00", "Z")


def _decode_offset(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        payload = json.loads(cursor)
    except json.JSONDecodeError:
        return 0
    offset = payload.get("offset") if isinstance(payload, dict) else None
    return offset if isinstance(offset, int) and offset >= 0 else 0


def _extract_display_name(detail: dict[str, Any]) -> str | None:
    # Bolna's execution schema has no canonical title field. Prefer an explicit
    # provider-supplied label, then a summary value deliberately configured in
    # extracted_data. Never derive a label from context_details: that commonly
    # contains recipient data from a batch upload.
    for key in ("name", "title", "call_title", "summary", "call_summary"):
        value = detail.get(key)
        if isinstance(value, str) and value.strip():
            return _clean_display_name(value)

    extracted_data = detail.get("extracted_data")
    if isinstance(extracted_data, dict):
        return _find_summary_value(extracted_data)
    return None


def _find_summary_value(value: object, *, summary_context: bool = False) -> str | None:
    if not isinstance(value, dict):
        return None
    for key, nested in value.items():
        key_normalized = str(key).strip().lower().replace("_", " ")
        is_summary_key = summary_context or any(token in key_normalized for token in ("summary", "title", "subject"))
        if is_summary_key and isinstance(nested, str) and nested.strip():
            return _clean_display_name(nested)
        if isinstance(nested, dict):
            if is_summary_key:
                for value_key in ("title", "summary", "subjective", "value", "text"):
                    candidate = nested.get(value_key)
                    if isinstance(candidate, str) and candidate.strip():
                        return _clean_display_name(candidate)
            found = _find_summary_value(nested, summary_context=is_summary_key)
            if found:
                return found
    return None


def _clean_display_name(value: str) -> str:
    return clean_conversation_display_name(value) or ""
