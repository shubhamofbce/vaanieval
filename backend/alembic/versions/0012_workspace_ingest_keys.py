"""add workspace ingest keys

Revision ID: 0012_workspace_ingest_keys
Revises: 0011_deepeval_shadow_runs
"""

from alembic import op
import sqlalchemy as sa

revision = "0012_workspace_ingest_keys"
down_revision = "0011_deepeval_shadow_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workspace_ingest_keys",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("workspace_id", sa.String(length=36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("key_prefix", sa.String(length=16), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_workspace_ingest_keys_workspace_id", "workspace_ingest_keys", ["workspace_id"])
    op.create_index("ix_workspace_ingest_keys_key_prefix", "workspace_ingest_keys", ["key_prefix"])
    op.create_index("ix_workspace_ingest_keys_key_hash", "workspace_ingest_keys", ["key_hash"])


def downgrade() -> None:
    op.drop_index("ix_workspace_ingest_keys_key_hash", table_name="workspace_ingest_keys")
    op.drop_index("ix_workspace_ingest_keys_key_prefix", table_name="workspace_ingest_keys")
    op.drop_index("ix_workspace_ingest_keys_workspace_id", table_name="workspace_ingest_keys")
    op.drop_table("workspace_ingest_keys")
