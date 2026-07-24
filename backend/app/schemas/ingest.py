from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CreateIngestKeyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class IngestKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    created_at: datetime
    revoked_at: datetime | None


class CreatedIngestKeyResponse(IngestKeyResponse):
    api_key: str


class PipecatTurn(BaseModel):
    role: str = Field(min_length=1, max_length=20)
    text: str = Field(min_length=1, max_length=20_000)
    started_ms: int | None = Field(default=None, ge=0)
    ended_ms: int | None = Field(default=None, ge=0)

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        aliases = {"bot": "assistant", "agent": "assistant", "customer": "user", "caller": "user"}
        normalized = aliases.get(normalized, normalized)
        if normalized not in {"user", "assistant", "system", "tool", "unknown"}:
            raise ValueError("role must be user, assistant, system, tool, or unknown")
        return normalized


class PipecatCallIngestRequest(BaseModel):
    call_id: str = Field(min_length=1, max_length=128)
    agent_id: str | None = Field(default=None, max_length=128)
    agent_name: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=280)
    language: str | None = Field(default=None, max_length=32)
    outcome: str | None = Field(default=None, max_length=50)
    started_at: datetime | None = None
    ended_at: datetime | None = None
    turns: list[PipecatTurn] = Field(min_length=1, max_length=1_000)
    evaluate: bool = True

    @field_validator("call_id", "agent_id", "agent_name", "display_name", "language", "outcome")
    @classmethod
    def strip_optional_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class PipecatCallIngestResponse(BaseModel):
    conversation_id: str
    call_id: str
    created: bool
    evaluation_queued: bool
