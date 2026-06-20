from pydantic import BaseModel


class ConnectProviderRequest(BaseModel):
    api_key: str
    provider_name: str = "elevenlabs"


class ProviderAgentResponse(BaseModel):
    id: str
    provider_agent_id: str
    name: str
    is_default: bool


class ProviderConnectionResponse(BaseModel):
    id: str
    provider_name: str
