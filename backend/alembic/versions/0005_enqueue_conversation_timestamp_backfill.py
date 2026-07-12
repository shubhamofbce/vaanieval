"""enqueue conversation timestamp backfill jobs

Revision ID: 0005_timestamp_backfill
Revises: 0004_evaluation_qa_summaries
Create Date: 2026-07-10 00:00:00

"""

from __future__ import annotations

import json
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = "0005_timestamp_backfill"
down_revision = "0004_evaluation_qa_summaries"
branch_labels = None
depends_on = None

BACKFILL_JOB_TYPE = "backfill_conversation_timestamp"


def upgrade() -> None:
    connection = op.get_bind()

    rows = connection.execute(
        sa.text(
            """
            SELECT c.id
            FROM conversations AS c
            JOIN provider_accounts AS pa ON pa.id = c.provider_account_id
            WHERE c.started_at IS NULL
              AND pa.provider_name IN ('elevenlabs', 'vapi')
            """
        )
    ).mappings()

    jobs = [
        {
            "id": str(uuid4()),
            "type": BACKFILL_JOB_TYPE,
            "payload_json": json.dumps({"conversation_id": row["id"]}),
            "status": "pending",
            "priority": 70,
            "attempts": 0,
            "max_attempts": 5,
        }
        for row in rows
    ]
    if not jobs:
        return

    job_queue = sa.table(
        "job_queue",
        sa.column("id", sa.String(36)),
        sa.column("type", sa.String(64)),
        sa.column("payload_json", sa.Text()),
        sa.column("status", sa.String(20)),
        sa.column("priority", sa.Integer()),
        sa.column("attempts", sa.Integer()),
        sa.column("max_attempts", sa.Integer()),
    )
    op.bulk_insert(job_queue, jobs)


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text("DELETE FROM job_queue WHERE type = :job_type"),
        {"job_type": BACKFILL_JOB_TYPE},
    )
