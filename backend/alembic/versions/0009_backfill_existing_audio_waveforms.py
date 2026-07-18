"""queue waveform generation for imported recordings

Revision ID: 0009_backfill_existing_audio_waveforms
Revises: 0008_audio_waveform_peaks
Create Date: 2026-07-19 00:00:00
"""

from __future__ import annotations

import json
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision = "0009_backfill_existing_audio_waveforms"
down_revision = "0008_audio_waveform_peaks"
branch_labels = None
depends_on = None

WAVEFORM_JOB_TYPE = "generate_audio_waveform"


def upgrade() -> None:
    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT conversation_id
            FROM audio_assets
            WHERE waveform_status IS NULL
              AND (source_url IS NOT NULL OR local_path IS NOT NULL)
            """
        )
    ).mappings()
    conversation_ids = [row["conversation_id"] for row in rows]
    if not conversation_ids:
        return

    connection.execute(
        sa.text(
            """
            UPDATE audio_assets
            SET waveform_status = 'pending', waveform_peaks_json = NULL
            WHERE waveform_status IS NULL
              AND (source_url IS NOT NULL OR local_path IS NOT NULL)
            """
        )
    )
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
    op.bulk_insert(
        job_queue,
        [
            {
                "id": str(uuid4()),
                "type": WAVEFORM_JOB_TYPE,
                "payload_json": json.dumps({"conversation_id": conversation_id}),
                "status": "pending",
                "priority": 90,
                "attempts": 0,
                "max_attempts": 3,
            }
            for conversation_id in conversation_ids
        ],
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text("DELETE FROM job_queue WHERE type = :job_type"),
        {"job_type": WAVEFORM_JOB_TYPE},
    )
    connection.execute(
        sa.text(
            """
            UPDATE audio_assets
            SET waveform_status = NULL, waveform_peaks_json = NULL
            WHERE waveform_status = 'pending'
            """
        )
    )
