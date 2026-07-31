from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WaitlistApplication(Base):
    __tablename__ = "waitlist_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    company: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(120))
    website: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    voice_stack: Mapped[str] = mapped_column(String(1000))
    challenge: Mapped[str] = mapped_column(Text)
    source_page: Mapped[str | None] = mapped_column(String(512), nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(512), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(512), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
