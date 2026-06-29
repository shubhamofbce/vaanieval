from __future__ import annotations

from dataclasses import dataclass

from app.services.eval_providers.anthropic_provider import AnthropicEvaluationProvider
from app.services.eval_providers.base import EvaluationProvider
from app.services.eval_providers.ollama_provider import OllamaEvaluationProvider
from app.services.eval_providers.openai_provider import OpenAIEvaluationProvider


@dataclass(frozen=True)
class ProviderCatalogEntry:
    provider_name: str
    display_name: str
    default_model: str | None
    models: list[str]
    provider_class: type[EvaluationProvider]
    requires_api_key: bool = True
    models_are_dynamic: bool = False


PROVIDER_CATALOG: dict[str, ProviderCatalogEntry] = {
    "openai": ProviderCatalogEntry(
        provider_name="openai",
        display_name="OpenAI",
        default_model="gpt-4o-mini",
        models=OpenAIEvaluationProvider.SUPPORTED_MODELS,
        provider_class=OpenAIEvaluationProvider,
    ),
    "anthropic": ProviderCatalogEntry(
        provider_name="anthropic",
        display_name="Anthropic",
        default_model="claude-3-5-haiku-latest",
        models=AnthropicEvaluationProvider.SUPPORTED_MODELS,
        provider_class=AnthropicEvaluationProvider,
    ),
    "ollama": ProviderCatalogEntry(
        provider_name="ollama",
        display_name="Ollama",
        default_model=None,
        models=[],
        provider_class=OllamaEvaluationProvider,
        requires_api_key=False,
        models_are_dynamic=True,
    ),
}


def get_provider_catalog() -> list[ProviderCatalogEntry]:
    return list(PROVIDER_CATALOG.values())


def get_provider_catalog_entry(provider_name: str) -> ProviderCatalogEntry:
    entry = PROVIDER_CATALOG.get(provider_name.lower())
    if not entry:
        raise ValueError(f"Unsupported evaluation provider: {provider_name}")
    return entry


def get_available_models(provider_name: str) -> list[str]:
    entry = get_provider_catalog_entry(provider_name)
    if entry.models_are_dynamic:
        return entry.provider_class.list_models()
    return entry.models


def create_provider(
    provider_name: str, api_key: str | None, model_name: str
) -> EvaluationProvider:
    entry = get_provider_catalog_entry(provider_name)
    if not model_name:
        raise ValueError("An evaluation model is required")
    if not entry.models_are_dynamic and model_name not in entry.models:
        raise ValueError(f"Model '{model_name}' is not supported for provider '{provider_name}'")
    return entry.provider_class(api_key=api_key, model_name=model_name)
