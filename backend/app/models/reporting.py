from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReportingSettings(Base):
    """Small, workspace-scoped configuration for operational notifications."""

    __tablename__ = "reporting_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, index=True
    )
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    email_recipient: Mapped[str | None] = mapped_column(String(320), nullable=True)
    slack_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    slack_webhook_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    daily_digest_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    daily_delivery_hour_utc: Mapped[int] = mapped_column(Integer, default=9)
    incident_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    incident_failure_threshold: Mapped[int] = mapped_column(Integer, default=20)
    incident_min_calls: Mapped[int] = mapped_column(Integer, default=10)
    incident_active: Mapped[bool] = mapped_column(Boolean, default=False)
    last_daily_digest_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
