from __future__ import annotations

import dataclasses
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.providers.base import ProviderConversationDetail
from app.providers.vapi_adapter import VapiProviderAdapter

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "vapi"


def load_fixture(name: str) -> dict:
    data: dict = json.loads((FIXTURES / name).read_text())
    return data


def make_adapter() -> VapiProviderAdapter:
    # Bypass __init__ so no real VapiClient / httpx session is constructed.
    return VapiProviderAdapter.__new__(VapiProviderAdapter)


class RecordingClient:
    """Stand-in for VapiClient that records forwarded calls and returns sentinels."""

    def __init__(self, *, agents=None, calls_result=None) -> None:
        self._agents = agents or []
        self._calls_result = calls_result if calls_result is not None else {}
        self.list_calls_kwargs: dict | None = None

    def list_agents(self):
        return self._agents

    def list_calls(self, **kwargs):
        self.list_calls_kwargs = kwargs
        return self._calls_result


# --- Agent discovery mapping ---------------------------------------------- #
def test_list_agents_maps_client_agents_to_provider_info() -> None:
    adapter = make_adapter()
    adapter._client = RecordingClient(
        agents=[
            SimpleNamespace(agent_id="a1", name="Sales Bot"),
            SimpleNamespace(agent_id="a2", name="Support Bot"),
        ]
    )
    agents = adapter.list_agents()
    assert [(a.agent_id, a.name) for a in agents] == [("a1", "Sales Bot"), ("a2", "Support Bot")]


def test_list_agents_empty_when_client_returns_nothing() -> None:
    adapter = make_adapter()
    adapter._client = RecordingClient(agents=[])
    assert adapter.list_agents() == []


# --- Conversation list parameter forwarding ------------------------------- #
@pytest.mark.parametrize(
    "call_kwargs,expected",
    [
        (
            dict(cursor="cur", page_size=25, agent_id="assistant-1", start_date="2026-07-01", end_date="2026-07-10"),
            dict(cursor="cur", page_size=25, assistant_id="assistant-1", start_date="2026-07-01", end_date="2026-07-10"),
        ),
        (
            dict(cursor=None, page_size=10, agent_id=None, start_date=None, end_date=None),
            dict(cursor=None, page_size=10, assistant_id=None, start_date=None, end_date=None),
        ),
    ],
)
def test_list_conversations_forwards_params_renaming_agent_id(call_kwargs, expected) -> None:
    sentinel: dict = {"conversations": [], "next_cursor": None}
    adapter = make_adapter()
    client = RecordingClient(calls_result=sentinel)
    adapter._client = client
    result = adapter.list_conversations(**call_kwargs)
    assert result is sentinel  # return value passed through untouched
    assert client.list_calls_kwargs == expected  # agent_id forwarded as assistant_id


# --- Full normalization contract on a complete payload -------------------- #
def test_normalize_complete_payload() -> None:
    adapter = make_adapter()
    normalized = adapter.normalize_conversation_detail(load_fixture("complete_call.json"))

    assert normalized.provider_agent_id == "assistant-1"
    assert normalized.language == "en"
    assert normalized.outcome == "true"  # analysis.successEvaluation wins
    assert normalized.audio_url == "https://example.test/recording.mp3"
    assert normalized.started_at == datetime(2026, 7, 10, 3, 5, 2, 767000, tzinfo=timezone.utc)
    assert normalized.ended_at == datetime(2026, 7, 10, 3, 5, 12, 767000, tzinfo=timezone.utc)

    # system dropped; assistant->agent; user kept; tool kept; toolCalls-name fallback text.
    assert [t["role"] for t in normalized.turns] == ["agent", "user", "tool", "agent"]
    assert [t["text"] for t in normalized.turns] == [
        "Hello, how can I help?",
        "I have a billing question.",
        "lookup ok",
        "lookup_account",
    ]
    # secondsFromStart -> ms; duration>=1000 treated as ms, <1000 as seconds.
    assert (normalized.turns[0]["start_ms"], normalized.turns[0]["end_ms"]) == (1190, 10561)
    assert (normalized.turns[1]["start_ms"], normalized.turns[1]["end_ms"]) == (10800, 13300)
    assert (normalized.turns[2]["start_ms"], normalized.turns[2]["end_ms"]) == (13000, None)


def test_normalized_turns_only_expose_neutral_keys() -> None:
    """Provider-specific shapes (secondsFromStart, toolCalls, ...) must not leak."""
    adapter = make_adapter()
    normalized = adapter.normalize_conversation_detail(load_fixture("complete_call.json"))
    for turn in normalized.turns:
        assert set(turn.keys()) == {"role", "text", "start_ms", "end_ms"}


def test_conversation_detail_model_has_fixed_field_set() -> None:
    assert {f.name for f in dataclasses.fields(ProviderConversationDetail)} == {
        "provider_agent_id", "language", "outcome", "started_at", "ended_at", "turns", "audio_url",
    }


# --- Sparse / missing-field tolerance ------------------------------------- #
def test_normalize_sparse_payload_yields_all_empty() -> None:
    adapter = make_adapter()
    normalized = adapter.normalize_conversation_detail(load_fixture("sparse_call.json"))
    assert normalized == ProviderConversationDetail(
        provider_agent_id=None, language=None, outcome=None,
        started_at=None, ended_at=None, turns=[], audio_url=None,
    )


def test_build_insight_payload_sparse_defaults() -> None:
    adapter = make_adapter()
    payload = adapter.build_insight_payload(
        conversation_id="conv-x", provider_agent_id=None, outcome=None,
        detail=load_fixture("sparse_call.json"),
    )
    assert payload == {
        "conversation_id": "conv-x",
        "assistant_name": None,
        "call_status": None,
        "call_result": None,
        "summary_title": None,
        "summary_text": None,
        "duration_seconds": None,
        "started_at_unix": None,
        "end_reason": None,
        "environment": None,
        "warnings": [],
        "quality_signals": [
            {"label": "Conversation flow", "value": "Unknown"},
            {"label": "Tool actions", "value": "0"},
            {"label": "Tool outcomes", "value": "0"},
            {"label": "Interruptions", "value": "0"},
        ],
    }


# --- Insight payload: summary / outcome / warnings / signals / timing ------ #
def test_build_insight_payload_complete() -> None:
    adapter = make_adapter()
    payload = adapter.build_insight_payload(
        conversation_id="call-123", provider_agent_id="assistant-1", outcome="true",
        detail=load_fixture("complete_call.json"),
    )
    assert payload["assistant_name"] == "Support Bot"
    assert payload["call_status"] == "ended"
    assert payload["call_result"] == "true"
    assert payload["summary_text"] == "Customer asked about billing and was helped."
    assert payload["end_reason"] == "customer-ended-call"
    assert payload["environment"] == "webCall"
    assert payload["warnings"] == ["Thank you for calling, goodbye."]
    assert payload["started_at_unix"] == int(
        datetime(2026, 7, 10, 3, 5, 2, 767000, tzinfo=timezone.utc).timestamp()
    )
    assert payload["duration_seconds"] == 10
    assert payload["quality_signals"] == [
        {"label": "Conversation flow", "value": "true"},
        {"label": "Tool actions", "value": "1"},  # one message carries tool_calls
        {"label": "Tool outcomes", "value": "1"},  # one message has role == "tool"
        {"label": "Interruptions", "value": "2"},
    ]


def test_quality_signal_flow_falls_back_to_outcome() -> None:
    adapter = make_adapter()
    payload = adapter.build_insight_payload(
        conversation_id="c", provider_agent_id=None, outcome="resolved", detail={"analysis": {}},
    )
    flow = next(s for s in payload["quality_signals"] if s["label"] == "Conversation flow")
    assert flow["value"] == "resolved"


def test_call_result_uses_outcome_when_success_evaluation_not_string() -> None:
    adapter = make_adapter()
    # successEvaluation is a bool, not a str -> call_result falls back to outcome.
    payload = adapter.build_insight_payload(
        conversation_id="c", provider_agent_id=None, outcome="passed",
        detail={"analysis": {"successEvaluation": True}},
    )
    assert payload["call_result"] == "passed"


def test_interruptions_default_when_metric_non_numeric() -> None:
    adapter = make_adapter()
    payload = adapter.build_insight_payload(
        conversation_id="c", provider_agent_id=None, outcome=None,
        detail={"artifact": {"performanceMetrics": {"numUserInterrupted": "lots"}}},
    )
    interruptions = next(s for s in payload["quality_signals"] if s["label"] == "Interruptions")
    assert interruptions["value"] == "0"


@pytest.mark.parametrize(
    "detail,expected",
    [
        ({"analysis": {}, "artifact": {"transcript": "AI: hi\nUser: hello"}}, "AI: hi\nUser: hello"),
        ({"analysis": {}, "artifact": {"messages": [{"message": "first"}, {"content": "second"}]}}, "first\nsecond"),
    ],
)
def test_summary_fallback_chain(detail, expected) -> None:
    adapter = make_adapter()
    payload = adapter.build_insight_payload(
        conversation_id="c", provider_agent_id=None, outcome=None, detail=detail
    )
    assert payload["summary_text"] == expected


# --- Outcome extraction fallback chain ------------------------------------ #
@pytest.mark.parametrize(
    "detail,expected",
    [
        ({"analysis": {"successEvaluation": "great"}, "status": "ended"}, "great"),
        ({"analysis": {"successEvaluation": "   "}, "status": "ended"}, "ended"),  # blank -> next
        ({"analysis": {}, "endedReason": "hangup"}, "hangup"),
        ({}, None),
    ],
)
def test_outcome_fallback_chain(detail, expected) -> None:
    adapter = make_adapter()
    assert adapter.normalize_conversation_detail(detail).outcome == expected


# --- Recording URL selection and fallback order --------------------------- #
@pytest.mark.parametrize(
    "artifact,expected",
    [
        ({"recordingUrl": "top.mp3", "stereoRecordingUrl": "s.mp3"}, "top.mp3"),
        ({"stereoRecordingUrl": "s.mp3"}, "s.mp3"),
        ({"recording": {"stereoUrl": "rs.mp3"}}, "rs.mp3"),
        ({"recording": {"mono": {"combinedUrl": "c.mp3"}}}, "c.mp3"),
        ({"recording": {"mono": {"assistantUrl": "a.mp3"}}}, "a.mp3"),
        ({"recording": {"mono": {"customerUrl": "cu.mp3"}}}, "cu.mp3"),
        ({"recordingUrl": "", "stereoRecordingUrl": "s.mp3"}, "s.mp3"),  # empty string skipped
        ({}, None),
    ],
)
def test_extract_audio_url_fallback_order(artifact, expected) -> None:
    adapter = make_adapter()
    assert adapter.extract_audio_url({"artifact": artifact}) == expected


def test_extract_audio_url_missing_artifact() -> None:
    adapter = make_adapter()
    assert adapter.extract_audio_url({}) is None


# --- Role mapping and message-text extraction ----------------------------- #
@pytest.mark.parametrize(
    "raw_role,expected_role",
    [
        ("assistant", "agent"), ("bot", "agent"), ("ai", "agent"),
        (" Assistant ", "agent"), ("user", "user"), ("tool", "tool"),
    ],
)
def test_role_mapping(raw_role, expected_role) -> None:
    adapter = make_adapter()
    detail = {"artifact": {"messages": [{"role": raw_role, "message": "hi"}]}}
    assert adapter.normalize_conversation_detail(detail).turns[0]["role"] == expected_role


@pytest.mark.parametrize("dropped", ["system", "developer"])
def test_system_and_developer_turns_are_dropped(dropped) -> None:
    adapter = make_adapter()
    detail = {"artifact": {"messages": [{"role": dropped, "message": "hidden"}]}}
    assert adapter.normalize_conversation_detail(detail).turns == []


def test_empty_text_turns_are_dropped() -> None:
    adapter = make_adapter()
    detail = {"artifact": {"messages": [{"role": "user", "message": "   "}]}}
    assert adapter.normalize_conversation_detail(detail).turns == []


def test_messages_fall_back_to_top_level_when_artifact_missing() -> None:
    adapter = make_adapter()
    detail = {"messages": [{"role": "user", "message": "hi there"}]}
    assert adapter.normalize_conversation_detail(detail).turns == [
        {"role": "user", "text": "hi there", "start_ms": None, "end_ms": None}
    ]


# --- Timestamp / duration edge cases (pinned current behavior) ------------ #
@pytest.mark.parametrize(
    "field,value,key,expected",
    [
        ("time", 500, "start_ms", 500),
        ("time", 1_700_000_000_000, "start_ms", None),  # absolute epoch, not an offset
        ("endTime", 5000, "end_ms", 5000),
        ("endTime", 1_700_000_000_000, "end_ms", None),  # absolute epoch ignored
    ],
)
def test_message_ms_offset_vs_absolute_epoch(field, value, key, expected) -> None:
    adapter = make_adapter()
    detail = {"artifact": {"messages": [{"role": "user", "message": "hi", field: value}]}}
    assert adapter.normalize_conversation_detail(detail).turns[0][key] == expected


@pytest.mark.parametrize(
    "started,field,expected",
    [
        ("not-a-date", "started_at", None),  # unparseable -> None
        ("2026-07-10T03:05:02", "started_at", datetime(2026, 7, 10, 3, 5, 2, tzinfo=timezone.utc)),  # naive -> utc
    ],
)
def test_timestamp_parsing(started, field, expected) -> None:
    adapter = make_adapter()
    normalized = adapter.normalize_conversation_detail({"startedAt": started})
    assert getattr(normalized, field) == expected


def test_started_at_falls_back_to_created_at() -> None:
    adapter = make_adapter()
    normalized = adapter.normalize_conversation_detail({"createdAt": "2026-07-10T03:00:00Z"})
    assert normalized.started_at == datetime(2026, 7, 10, 3, 0, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "detail,expected",
    [
        ({"startedAt": "2026-07-10T03:05:02Z"}, None),  # only one endpoint -> None
        ({"startedAt": "2026-07-10T03:05:02Z", "endedAt": "2026-07-10T03:05:12Z"}, 10),
        ({"startedAt": "2026-07-10T03:05:12Z", "endedAt": "2026-07-10T03:05:02Z"}, 0),  # clamped >= 0
    ],
)
def test_duration_seconds(detail, expected) -> None:
    adapter = make_adapter()
    payload = adapter.build_insight_payload(
        conversation_id="c", provider_agent_id=None, outcome=None, detail=detail
    )
    assert payload["duration_seconds"] == expected


# Pre-existing regression test, preserved verbatim.
def test_normalize_conversation_detail_handles_vapi_duration_milliseconds() -> None:
    adapter = VapiProviderAdapter.__new__(VapiProviderAdapter)
    detail = {
        "assistantId": "assistant-1",
        "startedAt": "2026-07-10T03:05:02.767Z",
        "endedAt": "2026-07-10T03:05:10.767Z",
        "status": "ended",
        "artifact": {
            "messages": [
                {
                    "role": "assistant",
                    "message": "Hello",
                    "secondsFromStart": 1.19,
                    "duration": 9371,
                },
                {
                    "role": "user",
                    "message": "Hi",
                    "secondsFromStart": 10.8,
                    "duration": 2.5,
                },
            ],
            "recordingUrl": "https://example.test/audio.mp3",
        },
    }

    normalized = adapter.normalize_conversation_detail(detail)

    assert normalized.provider_agent_id == "assistant-1"
    assert normalized.audio_url == "https://example.test/audio.mp3"
    assert normalized.turns[0]["start_ms"] == 1190
    assert normalized.turns[0]["end_ms"] == 10561
    assert normalized.turns[1]["start_ms"] == 10800
    assert normalized.turns[1]["end_ms"] == 13300
