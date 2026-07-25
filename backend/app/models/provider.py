from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProviderAccount(Base):
    __tablename__ = "provider_accounts"
    __table_args__ = (UniqueConstraint("workspace_id", "provider_name", name="uq_workspace_provider"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    provider_name: Mapped[str] = mapped_column(String(50), default="elevenlabs")
    api_key: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProviderAgent(Base):
    __tablename__ = "provider_agents"
    __table_args__ = (
        UniqueConstraint(
            "provider_account_id",
            "provider_agent_id",
            name="uq_provider_account_agent",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    provider_account_id: Mapped[str] = mapped_column(
        ForeignKey("provider_accounts.id", ondelete="CASCADE"), index=True
    )
    provider_agent_id: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    config_last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentConfigVersion(Base):
    __tablename__ = "agent_config_versions"
    __table_args__ = (UniqueConstraint("provider_agent_id", "version_number", name="uq_agent_config_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    provider_agent_id: Mapped[str] = mapped_column(ForeignKey("provider_agents.id", ondelete="CASCADE"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    provider_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    configuration_hash: Mapped[str] = mapped_column(String(64))
    snapshot_encrypted: Mapped[str] = mapped_column(Text)
    change_summary_json: Mapped[str] = mapped_column(Text, default="[]")


class AgentConfigSyncJob(Base):
    __tablename__ = "agent_config_sync_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    provider_account_id: Mapped[str | None] = mapped_column(ForeignKey("provider_accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    processed_count: Mapped[int] = mapped_column(Integer, default=0)
    changed_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
