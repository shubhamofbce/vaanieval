"""widen provider api key columns for encrypted credentials

Revision ID: 0003_encryptable_api_keys
Revises: 0002_evaluations_foundation
Create Date: 2026-06-20 00:30:00

"""

from alembic import op
import sqlalchemy as sa


revision = "0003_encryptable_api_keys"
down_revision = "0002_evaluations_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("provider_accounts") as batch_op:
        batch_op.alter_column("api_key", existing_type=sa.String(length=255), type_=sa.Text())

    with op.batch_alter_table("eval_provider_accounts") as batch_op:
        batch_op.alter_column("api_key", existing_type=sa.String(length=255), type_=sa.Text())


def downgrade() -> None:
    with op.batch_alter_table("eval_provider_accounts") as batch_op:
        batch_op.alter_column("api_key", existing_type=sa.Text(), type_=sa.String(length=255))

    with op.batch_alter_table("provider_accounts") as batch_op:
        batch_op.alter_column("api_key", existing_type=sa.Text(), type_=sa.String(length=255))