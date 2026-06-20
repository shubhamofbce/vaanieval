from functools import lru_cache
import base64
import hashlib

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VaaniEval Backend"
    app_env: str = "dev"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    database_url: str = Field(
        default="sqlite:///./backend.db",
        description="Database connection string. Use postgres://... in non-local environments.",
    )

    secret_key: str = "change-me-in-prod"
    credential_encryption_key: str | None = None
    magic_link_token_ttl_minutes: int = 15
    session_ttl_hours: int = 24

    elevenlabs_api_base: str = "https://api.elevenlabs.io"
    openai_api_base: str = "https://api.openai.com/v1"

    @property
    def resolved_credential_encryption_key(self) -> str:
        if self.credential_encryption_key:
            return self.credential_encryption_key

        digest = hashlib.sha256(self.secret_key.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest).decode("utf-8")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
