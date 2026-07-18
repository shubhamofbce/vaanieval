"""add lightweight reporting alerts

Revision ID: 0006_reporting_alerts
Revises: 0005_timestamp_backfill
Create Date: 2026-07-18 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_reporting_alerts"
down_revision = "0005_timestamp_backfill"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reporting_settings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("workspace_id", sa.String(length=36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("email_recipient", sa.String(length=320), nullable=True),
        sa.Column("slack_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("slack_webhook_url", sa.String(length=2000), nullable=True),
        sa.Column("daily_digest_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("daily_delivery_hour_utc", sa.Integer(), nullable=False, server_default="9"),
        sa.Column("incident_alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("incident_failure_threshold", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("incident_min_calls", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("incident_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_daily_digest_date", sa.String(length=10), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("workspace_id", name="uq_reporting_settings_workspace"),
    )
    op.create_index("ix_reporting_settings_workspace_id", "reporting_settings", ["workspace_id"])


def downgrade() -> None:
    op.drop_index("ix_reporting_settings_workspace_id", table_name="reporting_settings")
    op.drop_table("reporting_settings")
