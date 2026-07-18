from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl, field_validator


class ReportingSettingsUpdate(BaseModel):
    email_enabled: bool = False
    email_recipient: str | None = None
    slack_enabled: bool = False
    slack_webhook_url: HttpUrl | None = None
    daily_digest_enabled: bool = True
    daily_delivery_hour_utc: int = Field(default=9, ge=0, le=23)
    incident_alerts_enabled: bool = True
    incident_failure_threshold: int = Field(default=20, ge=1, le=100)
    incident_min_calls: int = Field(default=10, ge=1, le=100000)

    @field_validator("email_recipient")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else None

    @field_validator("slack_webhook_url")
    @classmethod
    def slack_endpoint(cls, value: HttpUrl | None) -> HttpUrl | None:
        if value and (value.scheme != "https" or value.host != "hooks.slack.com"):
            raise ValueError("Slack webhook URL must be an HTTPS hooks.slack.com URL")
        return value


class ReportingSettingsResponse(BaseModel):
    email_enabled: bool
    email_recipient: str | None
    slack_enabled: bool
    slack_webhook_configured: bool
    daily_digest_enabled: bool
    daily_delivery_hour_utc: int
    incident_alerts_enabled: bool
    incident_failure_threshold: int
    incident_min_calls: int
    incident_active: bool
    last_daily_digest_date: str | None
    updated_at: datetime | None


class ReportingTestResponse(BaseModel):
    message: str
