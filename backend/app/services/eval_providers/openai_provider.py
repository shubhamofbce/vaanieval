"""OpenAI evaluation provider implemented with LangChain chat models."""

from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.eval_providers.langchain_provider import LangChainEvaluationProvider


class OpenAIEvaluationProvider(LangChainEvaluationProvider):
    SUPPORTED_MODELS = [
        "gpt-4.1",
        "gpt-4.1-mini",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
    ]

    def create_chat_model(self):
        settings = get_settings()
        return ChatOpenAI(
            model=self.model_name,
            api_key=self.api_key,
            base_url=settings.openai_api_base,
            timeout=60,
            temperature=0,
        )

    def get_provider_name(self) -> str:
        return "openai"

    def get_supported_models(self) -> list[str]:
        return self.SUPPORTED_MODELS
