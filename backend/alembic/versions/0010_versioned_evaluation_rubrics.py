"""add versioned evaluation rubrics

Revision ID: 0010_versioned_evaluation_rubrics
Revises: 0009_backfill_audio_waveforms
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_versioned_evaluation_rubrics"
down_revision = "0009_backfill_audio_waveforms"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("evaluation_rubric_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_agent_id", sa.String(128), nullable=True), sa.Column("name", sa.String(120), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False), sa.Column("status", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("task_completion_instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("intent_understanding_instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("required_info_capture_instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("ai_detectability_instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_evaluation_rubric_versions_workspace_id", "evaluation_rubric_versions", ["workspace_id"])
    op.create_index("ix_evaluation_rubric_versions_provider_agent_id", "evaluation_rubric_versions", ["provider_agent_id"])
    # Batch mode keeps this migration compatible with SQLite, which cannot add FK
    # constraints with ALTER TABLE, while still creating the FK on production DBs.
    with op.batch_alter_table("conversation_evaluation_runs") as batch_op:
        batch_op.add_column(sa.Column("rubric_version_id", sa.String(36), nullable=True))
        batch_op.add_column(sa.Column("rubric_name", sa.String(120), nullable=True))
        batch_op.add_column(sa.Column("rubric_version", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("rubric_snapshot_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("is_test", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.create_foreign_key(
            "fk_conversation_evaluation_runs_rubric_version_id",
            "evaluation_rubric_versions", ["rubric_version_id"], ["id"], ondelete="SET NULL"
        )
    op.create_index("ix_conversation_evaluation_runs_rubric_version_id", "conversation_evaluation_runs", ["rubric_version_id"])


def downgrade() -> None:
    op.drop_index("ix_conversation_evaluation_runs_rubric_version_id", table_name="conversation_evaluation_runs")
    with op.batch_alter_table("conversation_evaluation_runs") as batch_op:
        batch_op.drop_constraint("fk_conversation_evaluation_runs_rubric_version_id", type_="foreignkey")
        for column in ("is_test", "rubric_snapshot_json", "rubric_version", "rubric_name", "rubric_version_id"):
            batch_op.drop_column(column)
    op.drop_table("evaluation_rubric_versions")
