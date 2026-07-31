"""add waitlist applications

Revision ID: 0014_waitlist_applications
Revises: 0013_agent_config_history
"""

from alembic import op
import sqlalchemy as sa

revision = "0014_waitlist_applications"
down_revision = "0013_agent_config_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "waitlist_applications",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("company", sa.String(length=160), nullable=False),
        sa.Column("role", sa.String(length=120), nullable=False),
        sa.Column("website", sa.String(length=2048), nullable=True),
        sa.Column("voice_stack", sa.String(length=1000), nullable=False),
        sa.Column("challenge", sa.Text(), nullable=False),
        sa.Column("source_page", sa.String(length=512), nullable=True),
        sa.Column("utm_source", sa.String(length=512), nullable=True),
        sa.Column("utm_medium", sa.String(length=512), nullable=True),
        sa.Column("utm_campaign", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_waitlist_application_email"),
    )
    op.create_index("ix_waitlist_applications_email", "waitlist_applications", ["email"])


def downgrade() -> None:
    op.drop_table("waitlist_applications")
