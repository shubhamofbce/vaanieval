from pydantic import BaseModel


class AudioAssetResponse(BaseModel):
    conversation_id: str
    source_url: str | None
    local_path: str | None
    duration_ms: int | None
    mime_type: str | None
