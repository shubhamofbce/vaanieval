from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation, ConversationTurn
from app.models.ingest import WorkspaceIngestKey
from app.models.provider import ProviderAccount, ProviderAgent
from app.schemas.ingest import PipecatCallIngestRequest
from app.services.credentials import encrypt_secret
from app.services.evaluation_service import enqueue_evaluation_job
from app.services.security import create_random_token, hash_token, utc_now

PIPECAT_PROVIDER_NAME = "pipecat"
INGEST_KEY_PREFIX = "ve_ing_"


def create_ingest_key(db: Session, *, workspace_id: str, name: str) -> tuple[WorkspaceIngestKey, str]:
    raw_key = f"{INGEST_KEY_PREFIX}{create_random_token()}"
    key = WorkspaceIngestKey(
        workspace_id=workspace_id,
        name=name,
        key_prefix=raw_key[:16],
        key_hash=hash_token(raw_key),
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return key, raw_key


def resolve_ingest_key(db: Session, raw_key: str) -> WorkspaceIngestKey | None:
    key = db.scalar(select(WorkspaceIngestKey).where(WorkspaceIngestKey.key_hash == hash_token(raw_key)))
    if not key or key.revoked_at is not None:
        return None
    return key


def revoke_ingest_key(db: Session, *, workspace_id: str, key_id: str) -> WorkspaceIngestKey | None:
    key = db.scalar(select(WorkspaceIngestKey).where(
        WorkspaceIngestKey.id == key_id, WorkspaceIngestKey.workspace_id == workspace_id
    ))
    if not key:
        return None
    key.revoked_at = utc_now()
    db.commit()
    db.refresh(key)
    return key


def ingest_pipecat_call(
    db: Session, *, workspace_id: str, payload: PipecatCallIngestRequest
) -> tuple[Conversation, bool, bool]:
    account = db.scalar(select(ProviderAccount).where(
        ProviderAccount.workspace_id == workspace_id,
        ProviderAccount.provider_name == PIPECAT_PROVIDER_NAME,
    ))
    if not account:
        account = ProviderAccount(
            workspace_id=workspace_id,
            provider_name=PIPECAT_PROVIDER_NAME,
            api_key=encrypt_secret("pipecat-direct-ingest"),
        )
        db.add(account)
        db.flush()

    if payload.agent_id:
        agent = db.scalar(select(ProviderAgent).where(
            ProviderAgent.provider_account_id == account.id,
            ProviderAgent.provider_agent_id == payload.agent_id,
        ))
        if agent:
            if payload.agent_name:
                agent.name = payload.agent_name
        else:
            db.add(ProviderAgent(
                provider_account_id=account.id,
                provider_agent_id=payload.agent_id,
                name=payload.agent_name or payload.agent_id,
            ))

    conversation = db.scalar(select(Conversation).where(
        Conversation.provider_account_id == account.id,
        Conversation.provider_conversation_id == payload.call_id,
    ))
    created = conversation is None
    if conversation is None:
        conversation = Conversation(
            workspace_id=workspace_id,
            provider_account_id=account.id,
            provider_conversation_id=payload.call_id,
        )
        db.add(conversation)
        db.flush()

    conversation.display_name = payload.display_name
    conversation.provider_agent_id = payload.agent_id
    conversation.language = payload.language
    conversation.outcome = payload.outcome
    conversation.started_at = payload.started_at
    conversation.ended_at = payload.ended_at

    db.execute(delete(ConversationTurn).where(ConversationTurn.conversation_id == conversation.id))
    db.add_all([
        ConversationTurn(
            conversation_id=conversation.id,
            role=turn.role,
            text=turn.text,
            started_ms=turn.started_ms,
            ended_ms=turn.ended_ms,
            turn_order=index,
        )
        for index, turn in enumerate(payload.turns)
    ])

    evaluation_queued = False
    if created and payload.evaluate:
        try:
            enqueue_evaluation_job(
                db, workspace_id=workspace_id, conversation_id=conversation.id
            )
            evaluation_queued = True
        except ValueError:
            # Transcript ingestion must work before a workspace configures an evaluator.
            pass

    db.commit()
    db.refresh(conversation)
    return conversation, created, evaluation_queued
