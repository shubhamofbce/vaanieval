from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx
import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.eval_providers import ollama_provider as ollama_module  # noqa: E402
from app.services.eval_providers.ollama_provider import (  # noqa: E402
    OllamaError,
    OllamaEvaluationProvider,
    OllamaMalformedResponseError,
    OllamaModelNotFoundError,
    OllamaTimeoutError,
    OllamaUnavailableError,
)
from app.services.eval_providers.structured_evaluation import (  # noqa: E402
    EVALUATION_JSON_SCHEMA,
    METRIC_KEYS,
)


def _client(handler) -> httpx.Client:
    return httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="http://ollama.test",
    )


def _scores() -> list[dict]:
    return [
        {
            "metric_key": key,
            "score_value": 80 + index,
            "confidence": 0.9,
            "rationale": f"Rationale {index}",
            "evidence": [f"Evidence {index}"],
        }
        for index, key in enumerate(METRIC_KEYS)
    ]


def test_discovers_installed_models() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/api/tags"
        return httpx.Response(
            200,
            json={"models": [{"name": "llama3.2:latest"}, {"name": "qwen3:8b"}]},
        )

    with _client(handler) as client:
        assert OllamaEvaluationProvider.list_models(
            client=client,
            base_url="http://ollama.test",
        ) == ["llama3.2:latest", "qwen3:8b"]


def test_evaluate_uses_schema_constrained_non_streaming_chat() -> None:
    seen_chat_payload: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "llama3.2:latest"}]})
        assert request.url.path == "/api/chat"
        seen_chat_payload.update(json.loads(request.content))
        return httpx.Response(200, json={"message": {"content": json.dumps(_scores())}})

    with _client(handler) as client:
        provider = OllamaEvaluationProvider(
            api_key=None,
            model_name="llama3.2:latest",
            client=client,
            base_url="http://ollama.test",
        )
        scores = provider.evaluate_conversation(
            "user: hello\nagent: hello",
            {"language": "en"},
        )

    assert scores == _scores()
    assert seen_chat_payload["model"] == "llama3.2:latest"
    assert seen_chat_payload["stream"] is False
    assert seen_chat_payload["options"] == {"temperature": 0}
    assert seen_chat_payload["format"] == EVALUATION_JSON_SCHEMA
    assert seen_chat_payload["messages"][0]["role"] == "system"
    assert "Language: en" in seen_chat_payload["messages"][1]["content"]


def test_unavailable_server_has_actionable_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    with _client(handler) as client:
        with pytest.raises(OllamaUnavailableError, match="OLLAMA_BASE_URL"):
            OllamaEvaluationProvider.list_models(
                client=client,
                base_url="http://ollama.test",
            )


def test_timeout_has_actionable_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    with _client(handler) as client:
        with pytest.raises(OllamaTimeoutError, match="timed out after 17 seconds"):
            OllamaEvaluationProvider.list_models(
                client=client,
                base_url="http://ollama.test",
                timeout_seconds=17,
            )


@pytest.mark.parametrize(
    "payload",
    [{}, {"models": [{}]}, {"models": "not-a-list"}],
)
def test_rejects_malformed_model_responses(payload: object) -> None:
    with _client(lambda request: httpx.Response(200, json=payload)) as client:
        with pytest.raises(OllamaMalformedResponseError, match="malformed model"):
            OllamaEvaluationProvider.list_models(
                client=client,
                base_url="http://ollama.test",
            )


@pytest.mark.parametrize(
    "chat_payload",
    [{}, {"message": {}}, {"message": {"content": "not json"}}],
)
def test_rejects_malformed_chat_responses(chat_payload: object) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "model:latest"}]})
        return httpx.Response(200, json=chat_payload)

    with _client(handler) as client:
        provider = OllamaEvaluationProvider(
            None,
            "model:latest",
            client=client,
            base_url="http://ollama.test",
        )
        with pytest.raises(OllamaMalformedResponseError):
            provider.evaluate_conversation("transcript")


def test_missing_model_includes_pull_command() -> None:
    with _client(lambda request: httpx.Response(200, json={"models": []})) as client:
        provider = OllamaEvaluationProvider(
            None,
            "missing:7b",
            client=client,
            base_url="http://ollama.test",
        )
        with pytest.raises(OllamaModelNotFoundError, match="ollama pull missing:7b"):
            provider.evaluate_conversation("transcript")


def test_uses_configured_client_when_no_client_is_injected(monkeypatch) -> None:
    client = _client(
        lambda request: httpx.Response(200, json={"models": [{"name": "model:latest"}]})
    )
    monkeypatch.setattr(ollama_module.httpx, "Client", lambda **kwargs: client)

    assert OllamaEvaluationProvider.list_models(
        base_url="http://ollama.test",
    ) == ["model:latest"]


@pytest.mark.parametrize(
    ("response", "detail"),
    [
        (httpx.Response(500, json={"error": "runner crashed"}), "runner crashed"),
        (httpx.Response(500, json={"message": "bad"}), "unknown error"),
        (httpx.Response(500, text="plain failure"), "plain failure"),
    ],
)
def test_http_errors_include_server_detail(response: httpx.Response, detail: str) -> None:
    with _client(lambda request: response) as client:
        with pytest.raises(OllamaError, match=detail):
            OllamaEvaluationProvider.list_models(
                client=client,
                base_url="http://ollama.test",
            )


def test_rejects_non_json_response() -> None:
    with _client(lambda request: httpx.Response(200, text="not-json")) as client:
        with pytest.raises(OllamaMalformedResponseError, match="not valid JSON"):
            OllamaEvaluationProvider.list_models(
                client=client,
                base_url="http://ollama.test",
            )


def test_provider_metadata_and_supported_models() -> None:
    with _client(
        lambda request: httpx.Response(200, json={"models": [{"name": "model:latest"}]})
    ) as client:
        provider = OllamaEvaluationProvider(
            None,
            "model:latest",
            client=client,
            base_url="http://ollama.test",
        )
        assert provider.get_provider_name() == "ollama"
        assert provider.get_supported_models() == ["model:latest"]
