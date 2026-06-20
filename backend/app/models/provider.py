from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
