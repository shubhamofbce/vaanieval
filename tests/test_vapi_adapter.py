from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.providers.vapi_adapter import VapiProviderAdapter


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
