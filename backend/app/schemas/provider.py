from datetime import datetime

from pydantic import BaseModel


class ConnectProviderRequest(BaseModel):
    api_key: str
    provider_name: str = "elevenlabs"


class ProviderAgentResponse(BaseModel):
    id: str
    provider_account_id: str
    provider_name: str
    provider_agent_id: str
    name: str
    is_default: bool
    configuration_checked_at: datetime | None = None
    last_configuration_change_at: datetime | None = None
    configuration_version: int | None = None
    configuration_change_categories: list[str] = []


class AgentConfigSyncJobResponse(BaseModel):
    id: str
    status: str
    processed_count: int
    changed_count: int
    failed_count: int
    error_message: str | None = None


class AgentConfigVersionListItem(BaseModel):
    version_number: int
    captured_at: datetime
    provider_updated_at: datetime | None = None
    change_categories: list[str] = []
    is_baseline: bool = False


class AgentConfigVersionPage(BaseModel):
    items: list[AgentConfigVersionListItem]
    total: int


class AgentConfigVersionDetail(BaseModel):
    version_number: int
    captured_at: datetime
    change_categories: list[str] = []
    changes: list[dict]


class ProviderConnectionResponse(BaseModel):
    id: str
    provider_name: str
    agent_count: int


class ProviderConnectionListItem(BaseModel):
    id: str
    provider_name: str
    created_at: datetime
