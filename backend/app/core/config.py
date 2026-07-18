from functools import lru_cache
import base64
import hashlib
from pathlib import Path

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
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
    frontend_app_url: str = "http://localhost:5173"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True

    elevenlabs_api_base: str = "https://api.elevenlabs.io"
    vapi_api_base: str = "https://api.vapi.ai"
    bolna_api_base: str = "https://api.bolna.ai"
    openai_api_base: str = "https://api.openai.com/v1"

    @property
    def resolved_credential_encryption_key(self) -> str:
        if self.credential_encryption_key:
            return self.credential_encryption_key

        digest = hashlib.sha256(self.secret_key.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest).decode("utf-8")

    @property
    def cors_allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}

    model_config = SettingsConfigDict(
        env_file=(str(Path(__file__).resolve().parents[3] / ".env"), str(Path(__file__).resolve().parents[2] / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
