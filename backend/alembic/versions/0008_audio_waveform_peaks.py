"""store generated audio waveform peaks

Revision ID: 0008_audio_waveform_peaks
Revises: 0007_conversation_display_names
Create Date: 2026-07-19 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "0008_audio_waveform_peaks"
down_revision = "0007_conversation_display_names"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audio_assets", sa.Column("waveform_status", sa.String(length=20), nullable=True))
    op.add_column("audio_assets", sa.Column("waveform_peaks_json", sa.Text(), nullable=True))
    op.create_index("ix_audio_assets_waveform_status", "audio_assets", ["waveform_status"])


def downgrade() -> None:
    op.drop_index("ix_audio_assets_waveform_status", table_name="audio_assets")
    op.drop_column("audio_assets", "waveform_peaks_json")
    op.drop_column("audio_assets", "waveform_status")
