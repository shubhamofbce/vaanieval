"""Anthropic evaluation provider implemented with LangChain chat models."""

from langchain_anthropic import ChatAnthropic

from app.services.eval_providers.langchain_provider import LangChainEvaluationProvider


class AnthropicEvaluationProvider(LangChainEvaluationProvider):
    SUPPORTED_MODELS = [
        "claude-3-5-sonnet-latest",
        "claude-3-5-haiku-latest",
        "claude-3-7-sonnet-latest",
        "claude-sonnet-4-20250514",
    ]

    def create_chat_model(self):
        return ChatAnthropic(
            model=self.model_name,
            api_key=self.api_key,
            timeout=60,
            temperature=0,
        )

    def get_provider_name(self) -> str:
        return "anthropic"

    def get_supported_models(self) -> list[str]:
        return self.SUPPORTED_MODELS