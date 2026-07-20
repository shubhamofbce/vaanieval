from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EvalProviderAccount(Base):
    __tablename__ = "eval_provider_accounts"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "provider_name",
            name="uq_workspace_eval_provider",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    provider_name: Mapped[str] = mapped_column(String(50), default="openai", index=True)
    api_key: Mapped[str] = mapped_column(Text)
    model_name: Mapped[str] = mapped_column(String(100), default="gpt-4.1-mini")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConversationEvaluationRun(Base):
    __tablename__ = "conversation_evaluation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    provider_name: Mapped[str] = mapped_column(String(50), index=True)
    provider_model: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    qa_verdict: Mapped[str | None] = mapped_column(String(50), nullable=True)
    qa_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    supporting_evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    rubric_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("evaluation_rubric_versions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rubric_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    rubric_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rubric_snapshot_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_test: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ConversationMetricScore(Base):
    __tablename__ = "conversation_metric_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    evaluation_run_id: Mapped[str] = mapped_column(
        ForeignKey("conversation_evaluation_runs.id", ondelete="CASCADE"), index=True
    )
    metric_key: Mapped[str] = mapped_column(String(100), index=True)
    score_value: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[float | None] = mapped_column(nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EvaluationRubricVersion(Base):
    __tablename__ = "evaluation_rubric_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    provider_agent_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="Evaluation rubric")
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    task_completion_instructions: Mapped[str] = mapped_column(Text, default="")
    intent_understanding_instructions: Mapped[str] = mapped_column(Text, default="")
    required_info_capture_instructions: Mapped[str] = mapped_column(Text, default="")
    ai_detectability_instructions: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
