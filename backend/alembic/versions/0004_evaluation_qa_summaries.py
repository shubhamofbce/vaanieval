"""add provider generated evaluation qa summaries

Revision ID: 0004_evaluation_qa_summaries
Revises: 0003_encryptable_api_keys
Create Date: 2026-07-10 00:00:00

"""

from alembic import op
import sqlalchemy as sa


revision = "0004_evaluation_qa_summaries"
down_revision = "0003_encryptable_api_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("conversation_evaluation_runs") as batch_op:
        batch_op.add_column(sa.Column("qa_verdict", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("qa_summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("failure_reason", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("recommended_next_step", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("supporting_evidence", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("conversation_evaluation_runs") as batch_op:
        batch_op.drop_column("supporting_evidence")
        batch_op.drop_column("recommended_next_step")
        batch_op.drop_column("failure_reason")
        batch_op.drop_column("qa_summary")
        batch_op.drop_column("qa_verdict")
