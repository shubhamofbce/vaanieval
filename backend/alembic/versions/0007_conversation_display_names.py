"""persist provider conversation display names

Revision ID: 0007_conversation_display_names
Revises: 0006_reporting_alerts
Create Date: 2026-07-18 00:00:00
"""

from __future__ import annotations

import json
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = "0007_conversation_display_names"
down_revision = "0006_reporting_alerts"
branch_labels = None
depends_on = None

BACKFILL_JOB_TYPE = "backfill_conversation_display_name"


def upgrade() -> None:
    op.add_column("conversations", sa.Column("display_name", sa.String(length=280), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT c.id
            FROM conversations AS c
            JOIN provider_accounts AS pa ON pa.id = c.provider_account_id
            WHERE pa.provider_name IN ('elevenlabs', 'vapi', 'bolna')
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
    op.drop_column("conversations", "display_name")
