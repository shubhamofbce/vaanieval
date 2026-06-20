"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-06-19 00:00:00

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)

    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workspaces_name"), "workspaces", ["name"], unique=False)

    op.create_table(
        "memberships",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "workspace_id", name="uq_membership_user_workspace"),
    )
    op.create_index(op.f("ix_memberships_user_id"), "memberships", ["user_id"], unique=False)
    op.create_index(op.f("ix_memberships_workspace_id"), "memberships", ["workspace_id"], unique=False)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("session_token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_token_hash"),
    )
    op.create_index(op.f("ix_auth_sessions_expires_at"), "auth_sessions", ["expires_at"], unique=False)
    op.create_index(op.f("ix_auth_sessions_session_token_hash"), "auth_sessions", ["session_token_hash"], unique=False)
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)

    op.create_table(
        "magic_link_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_magic_link_tokens_expires_at"), "magic_link_tokens", ["expires_at"], unique=False)
    op.create_index(op.f("ix_magic_link_tokens_token_hash"), "magic_link_tokens", ["token_hash"], unique=False)
    op.create_index(op.f("ix_magic_link_tokens_user_id"), "magic_link_tokens", ["user_id"], unique=False)

    op.create_table(
        "provider_accounts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("provider_name", sa.String(length=50), nullable=False),
        sa.Column("api_key", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "provider_name", name="uq_workspace_provider"),
    )
    op.create_index(op.f("ix_provider_accounts_workspace_id"), "provider_accounts", ["workspace_id"], unique=False)

    op.create_table(
        "provider_agents",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("provider_account_id", sa.String(length=36), nullable=False),
        sa.Column("provider_agent_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["provider_account_id"], ["provider_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_account_id", "provider_agent_id", name="uq_provider_account_agent"),
    )
    op.create_index(op.f("ix_provider_agents_provider_account_id"), "provider_agents", ["provider_account_id"], unique=False)
    op.create_index(op.f("ix_provider_agents_provider_agent_id"), "provider_agents", ["provider_agent_id"], unique=False)

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("provider_account_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("agent_id", sa.String(length=128), nullable=True),
        sa.Column("start_date", sa.String(length=50), nullable=True),
        sa.Column("end_date", sa.String(length=50), nullable=True),
        sa.Column("page_size", sa.Integer(), nullable=False),
        sa.Column("cursor", sa.String(length=255), nullable=True),
        sa.Column("imported_count", sa.Integer(), nullable=False),
        sa.Column("failed_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["provider_account_id"], ["provider_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_import_jobs_provider_account_id"), "import_jobs", ["provider_account_id"], unique=False)
    op.create_index(op.f("ix_import_jobs_status"), "import_jobs", ["status"], unique=False)
    op.create_index(op.f("ix_import_jobs_workspace_id"), "import_jobs", ["workspace_id"], unique=False)

    op.create_table(
        "job_queue",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("leased_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lease_owner", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_queue_run_at"), "job_queue", ["run_at"], unique=False)
    op.create_index(op.f("ix_job_queue_status"), "job_queue", ["status"], unique=False)
    op.create_index(op.f("ix_job_queue_type"), "job_queue", ["type"], unique=False)

    op.create_table(
        "job_attempts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["job_queue.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_attempts_job_id"), "job_attempts", ["job_id"], unique=False)

    op.create_table(
        "dead_letter_jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("original_job_id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_dead_letter_jobs_original_job_id"), "dead_letter_jobs", ["original_job_id"], unique=False)
    op.create_index(op.f("ix_dead_letter_jobs_type"), "dead_letter_jobs", ["type"], unique=False)

    op.create_table(
        "conversations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("provider_account_id", sa.String(length=36), nullable=False),
        sa.Column("provider_conversation_id", sa.String(length=128), nullable=False),
        sa.Column("provider_agent_id", sa.String(length=128), nullable=True),
        sa.Column("language", sa.String(length=32), nullable=True),
        sa.Column("outcome", sa.String(length=50), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["provider_account_id"], ["provider_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_account_id", "provider_conversation_id", name="uq_provider_conversation"),
    )
    op.create_index(op.f("ix_conversations_provider_account_id"), "conversations", ["provider_account_id"], unique=False)
    op.create_index(op.f("ix_conversations_provider_agent_id"), "conversations", ["provider_agent_id"], unique=False)
    op.create_index(op.f("ix_conversations_provider_conversation_id"), "conversations", ["provider_conversation_id"], unique=False)
    op.create_index(op.f("ix_conversations_workspace_id"), "conversations", ["workspace_id"], unique=False)

    op.create_table(
        "conversation_turns",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("started_ms", sa.Integer(), nullable=True),
        sa.Column("ended_ms", sa.Integer(), nullable=True),
        sa.Column("turn_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_conversation_turns_conversation_id"), "conversation_turns", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_conversation_turns_role"), "conversation_turns", ["role"], unique=False)
    op.create_index(op.f("ix_conversation_turns_turn_order"), "conversation_turns", ["turn_order"], unique=False)

    op.create_table(
        "tool_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("tool_name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tool_events_conversation_id"), "tool_events", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_tool_events_status"), "tool_events", ["status"], unique=False)
    op.create_index(op.f("ix_tool_events_tool_name"), "tool_events", ["tool_name"], unique=False)

    op.create_table(
        "audio_assets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("source_url", sa.String(length=1000), nullable=True),
        sa.Column("local_path", sa.String(length=500), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("conversation_id"),
    )
    op.create_index(op.f("ix_audio_assets_conversation_id"), "audio_assets", ["conversation_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_audio_assets_conversation_id"), table_name="audio_assets")
    op.drop_table("audio_assets")

    op.drop_index(op.f("ix_tool_events_tool_name"), table_name="tool_events")
    op.drop_index(op.f("ix_tool_events_status"), table_name="tool_events")
    op.drop_index(op.f("ix_tool_events_conversation_id"), table_name="tool_events")
    op.drop_table("tool_events")

    op.drop_index(op.f("ix_conversation_turns_turn_order"), table_name="conversation_turns")
    op.drop_index(op.f("ix_conversation_turns_role"), table_name="conversation_turns")
    op.drop_index(op.f("ix_conversation_turns_conversation_id"), table_name="conversation_turns")
    op.drop_table("conversation_turns")

    op.drop_index(op.f("ix_conversations_workspace_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_provider_conversation_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_provider_agent_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_provider_account_id"), table_name="conversations")
    op.drop_table("conversations")

    op.drop_index(op.f("ix_dead_letter_jobs_type"), table_name="dead_letter_jobs")
    op.drop_index(op.f("ix_dead_letter_jobs_original_job_id"), table_name="dead_letter_jobs")
    op.drop_table("dead_letter_jobs")

    op.drop_index(op.f("ix_job_attempts_job_id"), table_name="job_attempts")
    op.drop_table("job_attempts")

    op.drop_index(op.f("ix_job_queue_type"), table_name="job_queue")
    op.drop_index(op.f("ix_job_queue_status"), table_name="job_queue")
    op.drop_index(op.f("ix_job_queue_run_at"), table_name="job_queue")
    op.drop_table("job_queue")

    op.drop_index(op.f("ix_import_jobs_workspace_id"), table_name="import_jobs")
    op.drop_index(op.f("ix_import_jobs_status"), table_name="import_jobs")
    op.drop_index(op.f("ix_import_jobs_provider_account_id"), table_name="import_jobs")
    op.drop_table("import_jobs")

    op.drop_index(op.f("ix_provider_agents_provider_agent_id"), table_name="provider_agents")
    op.drop_index(op.f("ix_provider_agents_provider_account_id"), table_name="provider_agents")
    op.drop_table("provider_agents")

    op.drop_index(op.f("ix_provider_accounts_workspace_id"), table_name="provider_accounts")
    op.drop_table("provider_accounts")

    op.drop_index(op.f("ix_magic_link_tokens_user_id"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_token_hash"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_expires_at"), table_name="magic_link_tokens")
    op.drop_table("magic_link_tokens")

    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_session_token_hash"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_expires_at"), table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.drop_index(op.f("ix_memberships_workspace_id"), table_name="memberships")
    op.drop_index(op.f("ix_memberships_user_id"), table_name="memberships")
    op.drop_table("memberships")

    op.drop_index(op.f("ix_workspaces_name"), table_name="workspaces")
    op.drop_table("workspaces")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
