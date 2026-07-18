from __future__ import annotations

from fastapi import HTTPException, status

from app.providers.base import ProviderAdapter
from app.providers.bolna_adapter import BolnaProviderAdapter
from app.providers.elevenlabs_adapter import ElevenLabsProviderAdapter
from app.providers.vapi_adapter import VapiProviderAdapter


def get_provider_adapter(*, provider_name: str, api_key: str) -> ProviderAdapter:
    normalized = provider_name.strip().lower()
    if normalized == "elevenlabs":
        return ElevenLabsProviderAdapter(api_key=api_key)
    if normalized == "vapi":
        return VapiProviderAdapter(api_key=api_key)
    if normalized == "bolna":
        return BolnaProviderAdapter(api_key=api_key)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported provider: {provider_name}",
    )
