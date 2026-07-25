"""add DeepEval shadow-run metadata

Revision ID: 0011_deepeval_shadow_runs
Revises: 0010_versioned_rubrics
"""

from alembic import op
import sqlalchemy as sa

revision = "0011_deepeval_shadow_runs"
down_revision = "0010_versioned_rubrics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("conversation_evaluation_runs") as batch_op:
        batch_op.add_column(sa.Column("evaluation_engine", sa.String(length=32), nullable=False, server_default="langchain"))
        batch_op.add_column(sa.Column("is_shadow", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("baseline_run_id", sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            "fk_conversation_evaluation_runs_baseline_run_id",
            "conversation_evaluation_runs", ["baseline_run_id"], ["id"], ondelete="SET NULL"
        )
        batch_op.create_index("ix_conversation_evaluation_runs_is_shadow", ["is_shadow"])
        batch_op.create_index("ix_conversation_evaluation_runs_baseline_run_id", ["baseline_run_id"])


def downgrade() -> None:
    with op.batch_alter_table("conversation_evaluation_runs") as batch_op:
        batch_op.drop_index("ix_conversation_evaluation_runs_baseline_run_id")
        batch_op.drop_index("ix_conversation_evaluation_runs_is_shadow")
        batch_op.drop_constraint("fk_conversation_evaluation_runs_baseline_run_id", type_="foreignkey")
        batch_op.drop_column("baseline_run_id")
        batch_op.drop_column("is_shadow")
        batch_op.drop_column("evaluation_engine")
