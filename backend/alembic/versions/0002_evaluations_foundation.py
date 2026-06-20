"""add evaluations foundation tables

Revision ID: 0002_evaluations_foundation
Revises: 0001_initial
Create Date: 2026-06-19 19:10:00

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_evaluations_foundation"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "eval_provider_accounts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("provider_name", sa.String(length=50), nullable=False),
        sa.Column("api_key", sa.String(length=255), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "provider_name", name="uq_workspace_eval_provider"),
    )
    op.create_index(op.f("ix_eval_provider_accounts_workspace_id"), "eval_provider_accounts", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_eval_provider_accounts_provider_name"), "eval_provider_accounts", ["provider_name"], unique=False)

    op.create_table(
        "conversation_evaluation_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("provider_name", sa.String(length=50), nullable=False),
        sa.Column("provider_model", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_conversation_evaluation_runs_workspace_id"), "conversation_evaluation_runs", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_conversation_evaluation_runs_conversation_id"), "conversation_evaluation_runs", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_conversation_evaluation_runs_provider_name"), "conversation_evaluation_runs", ["provider_name"], unique=False)
    op.create_index(op.f("ix_conversation_evaluation_runs_status"), "conversation_evaluation_runs", ["status"], unique=False)

    op.create_table(
        "conversation_metric_scores",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("evaluation_run_id", sa.String(length=36), nullable=False),
        sa.Column("metric_key", sa.String(length=100), nullable=False),
        sa.Column("score_value", sa.Integer(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("evidence_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["evaluation_run_id"], ["conversation_evaluation_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_conversation_metric_scores_evaluation_run_id"), "conversation_metric_scores", ["evaluation_run_id"], unique=False)
    op.create_index(op.f("ix_conversation_metric_scores_metric_key"), "conversation_metric_scores", ["metric_key"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_conversation_metric_scores_metric_key"), table_name="conversation_metric_scores")
    op.drop_index(op.f("ix_conversation_metric_scores_evaluation_run_id"), table_name="conversation_metric_scores")
    op.drop_table("conversation_metric_scores")

    op.drop_index(op.f("ix_conversation_evaluation_runs_status"), table_name="conversation_evaluation_runs")
    op.drop_index(op.f("ix_conversation_evaluation_runs_provider_name"), table_name="conversation_evaluation_runs")
    op.drop_index(op.f("ix_conversation_evaluation_runs_conversation_id"), table_name="conversation_evaluation_runs")
    op.drop_index(op.f("ix_conversation_evaluation_runs_workspace_id"), table_name="conversation_evaluation_runs")
    op.drop_table("conversation_evaluation_runs")

    op.drop_index(op.f("ix_eval_provider_accounts_provider_name"), table_name="eval_provider_accounts")
    op.drop_index(op.f("ix_eval_provider_accounts_workspace_id"), table_name="eval_provider_accounts")
    op.drop_table("eval_provider_accounts")
