"""allow evaluation providers without API keys

Revision ID: 0004_nullable_eval_keys
Revises: 0003_encryptable_api_keys
Create Date: 2026-06-29 00:00:00

"""

import sqlalchemy as sa
from alembic import op

revision = "0004_nullable_eval_keys"
down_revision = "0003_encryptable_api_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("eval_provider_accounts") as batch_op:
        batch_op.alter_column(
            "api_key",
            existing_type=sa.Text(),
            nullable=True,
        )


def downgrade() -> None:
    op.execute(
        sa.text("UPDATE eval_provider_accounts SET api_key = '' WHERE api_key IS NULL")
    )
    with op.batch_alter_table("eval_provider_accounts") as batch_op:
        batch_op.alter_column(
            "api_key",
            existing_type=sa.Text(),
            nullable=False,
        )
