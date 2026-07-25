"""add agent configuration history

Revision ID: 0013_agent_config_history
Revises: 0012_workspace_ingest_keys
"""

from alembic import op
import sqlalchemy as sa

revision = "0013_agent_config_history"
down_revision = "0012_workspace_ingest_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("provider_agents", sa.Column("config_last_checked_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "agent_config_versions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("provider_agent_id", sa.String(length=36), sa.ForeignKey("provider_agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("provider_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("configuration_hash", sa.String(length=64), nullable=False),
        sa.Column("snapshot_encrypted", sa.Text(), nullable=False),
        sa.Column("change_summary_json", sa.Text(), nullable=False, server_default="[]"),
        sa.UniqueConstraint("provider_agent_id", "version_number", name="uq_agent_config_version"),
    )
    op.create_index("ix_agent_config_versions_provider_agent_id", "agent_config_versions", ["provider_agent_id"])
    op.create_index("ix_agent_config_versions_captured_at", "agent_config_versions", ["captured_at"])
    op.create_table(
        "agent_config_sync_jobs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("workspace_id", sa.String(length=36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_account_id", sa.String(length=36), sa.ForeignKey("provider_accounts.id", ondelete="CASCADE"), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column("processed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("changed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_agent_config_sync_jobs_workspace_id", "agent_config_sync_jobs", ["workspace_id"])
    op.create_index("ix_agent_config_sync_jobs_provider_account_id", "agent_config_sync_jobs", ["provider_account_id"])
    op.create_index("ix_agent_config_sync_jobs_status", "agent_config_sync_jobs", ["status"])


def downgrade() -> None:
    op.drop_table("agent_config_sync_jobs")
    op.drop_table("agent_config_versions")
    op.drop_column("provider_agents", "config_last_checked_at")
