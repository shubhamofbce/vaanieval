"""Ollama evaluation provider using the native local HTTP API."""

from __future__ import annotations

from collections.abc import Callable

import httpx
from app.core.config import get_settings
from app.services.eval_providers.structured_evaluation import (
    EVALUATION_JSON_SCHEMA,
    StructuredEvaluationProvider,
)


class OllamaError(RuntimeError):
    """Base error for actionable Ollama failures."""


class OllamaUnavailableError(OllamaError):
    """Raised when the configured Ollama server cannot be reached."""


class OllamaTimeoutError(OllamaError):
    """Raised when an Ollama request exceeds the configured timeout."""


class OllamaMalformedResponseError(OllamaError):
    """Raised when Ollama returns an unexpected response shape."""


class OllamaModelNotFoundError(ValueError):
    """Raised when a selected model is not installed in Ollama."""


class OllamaEvaluationProvider(StructuredEvaluationProvider):
    """Evaluate conversations with a model installed on the Ollama host."""

    def __init__(
        self,
        api_key: str | None,
        model_name: str,
        *,
        client: httpx.Client | None = None,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        super().__init__(api_key=api_key, model_name=model_name)
        settings = get_settings()
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.timeout_seconds = timeout_seconds or settings.ollama_request_timeout_seconds
        self._client = client

    @classmethod
    def list_models(
        cls,
        *,
        client: httpx.Client | None = None,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
    ) -> list[str]:
        provider = cls(
            api_key=None,
            model_name="",
            client=client,
            base_url=base_url,
            timeout_seconds=timeout_seconds,
        )
        payload = provider._request_json(lambda active: active.get("/api/tags"))
        models = payload.get("models") if isinstance(payload, dict) else None
        if not isinstance(models, list):
            raise OllamaMalformedResponseError(
                "Ollama returned a malformed model list from /api/tags."
            )

        names: list[str] = []
        for model in models:
            if not isinstance(model, dict) or not isinstance(model.get("name"), str):
                raise OllamaMalformedResponseError(
                    "Ollama returned a malformed model entry from /api/tags."
                )
            name = model["name"].strip()
            if name:
                names.append(name)
        return list(dict.fromkeys(names))

    def evaluate_conversation(self, transcript: str, context: dict | None = None) -> list[dict]:
        installed_models = self.list_models(
            client=self._client,
            base_url=self.base_url,
            timeout_seconds=self.timeout_seconds,
        )
        if self.model_name not in installed_models:
            raise OllamaModelNotFoundError(
                f"Ollama model '{self.model_name}' is not installed. "
                f"Run 'ollama pull {self.model_name}' on the Ollama host."
            )

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": self._build_instructions()},
                {"role": "user", "content": self._build_prompt(transcript, context or {})},
            ],
            "stream": False,
            "format": EVALUATION_JSON_SCHEMA,
            "options": {"temperature": 0},
        }
        response_payload = self._request_json(
            lambda active: active.post("/api/chat", json=payload)
        )
        message = response_payload.get("message") if isinstance(response_payload, dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str):
            raise OllamaMalformedResponseError(
                "Ollama returned a malformed chat response without message content."
            )
        try:
            return self._parse_scores(content)
        except ValueError as exc:
            raise OllamaMalformedResponseError(
                f"Ollama returned malformed evaluation JSON: {exc}"
            ) from exc

    def _request_json(
        self,
        request: Callable[[httpx.Client], httpx.Response],
    ) -> object:
        try:
            if self._client is not None:
                response = request(self._client)
            else:
                with httpx.Client(
                    base_url=self.base_url,
                    timeout=self.timeout_seconds,
                ) as client:
                    response = request(client)
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise OllamaTimeoutError(
                f"Ollama at {self.base_url} timed out after {self.timeout_seconds:g} seconds. "
                "The model may still be loading; retry after Ollama is ready."
            ) from exc
        except httpx.NetworkError as exc:
            raise OllamaUnavailableError(
                f"Cannot connect to Ollama at {self.base_url}. Start Ollama and verify "
                "OLLAMA_BASE_URL is shared by the API and worker."
            ) from exc
        except httpx.HTTPStatusError as exc:
            detail = self._http_error_detail(exc.response)
            raise OllamaError(
                f"Ollama request failed with HTTP {exc.response.status_code}: {detail}"
            ) from exc

        try:
            return response.json()
        except ValueError as exc:
            raise OllamaMalformedResponseError(
                "Ollama returned a response that was not valid JSON."
            ) from exc

    @staticmethod
    def _http_error_detail(response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return response.text[:500] or "unknown error"
        if isinstance(payload, dict) and isinstance(payload.get("error"), str):
            return payload["error"]
        return "unknown error"

    def get_provider_name(self) -> str:
        return "ollama"

    def get_supported_models(self) -> list[str]:
        return self.list_models(
            client=self._client,
            base_url=self.base_url,
            timeout_seconds=self.timeout_seconds,
        )
