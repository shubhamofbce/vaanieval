from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.provider import ProviderAccount, ProviderAgent
from app.schemas.provider import ConnectProviderRequest, ProviderAgentResponse, ProviderConnectionResponse
from app.services.credentials import decrypt_secret, encrypt_secret
from app.services.elevenlabs_client import ElevenLabsClient

router = APIRouter()


def _resolve_account(
    db: Session,
    *,
    workspace_id: str,
    provider_account_id: str | None,
) -> ProviderAccount | None:
    if provider_account_id:
        return db.scalar(
            select(ProviderAccount).where(
                ProviderAccount.id == provider_account_id,
                ProviderAccount.workspace_id == workspace_id,
            )
        )

    return db.scalar(
        select(ProviderAccount)
        .where(ProviderAccount.workspace_id == workspace_id)
        .order_by(ProviderAccount.created_at.desc())
    )


def _upsert_provider_agents(db: Session, *, account: ProviderAccount, agents: list) -> None:
    for agent in agents:
        existing = db.scalar(
            select(ProviderAgent).where(
                ProviderAgent.provider_account_id == account.id,
                ProviderAgent.provider_agent_id == agent.agent_id,
            )
        )
        if existing:
            existing.name = agent.name
        else:
            db.add(
                ProviderAgent(
                    provider_account_id=account.id,
                    provider_agent_id=agent.agent_id,
                    name=agent.name,
                    is_default=False,
                )
            )


@router.post("/connect", response_model=ProviderConnectionResponse)
def connect_provider(
    payload: ConnectProviderRequest,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ProviderConnectionResponse:
    account = db.scalar(
        select(ProviderAccount).where(
            ProviderAccount.workspace_id == workspace_id,
            ProviderAccount.provider_name == payload.provider_name,
        )
    )
    if account:
        account.api_key = encrypt_secret(payload.api_key)
    else:
        account = ProviderAccount(
            workspace_id=workspace_id,
            provider_name=payload.provider_name,
            api_key=encrypt_secret(payload.api_key),
        )
        db.add(account)

    db.flush()

    # Keep a baseline local cache of agents so agent page is never empty after connect.
    try:
        client = ElevenLabsClient(api_key=payload.api_key)
        agents = client.list_agents()
        _upsert_provider_agents(db, account=account, agents=agents)
    except Exception:
        # Connection can still be considered saved; user can retry sync later.
        pass

    db.commit()
    db.refresh(account)
    return ProviderConnectionResponse(id=account.id, provider_name=account.provider_name)


@router.post("/test", response_model=dict)
def test_provider_connection(
    provider_account_id: str | None = None,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> dict:
    account = _resolve_account(db, workspace_id=workspace_id, provider_account_id=provider_account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")

    client = ElevenLabsClient(api_key=decrypt_secret(account.api_key))
    try:
        agents = client.list_agents()
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}

    return {"ok": True, "agent_count": len(agents)}


@router.get("/agents", response_model=list[ProviderAgentResponse])
def list_agents(
    provider_account_id: str | None = None,
    refresh: bool = Query(default=False),
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> list[ProviderAgentResponse]:
    account = _resolve_account(db, workspace_id=workspace_id, provider_account_id=provider_account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")

    if refresh:
        client = ElevenLabsClient(api_key=decrypt_secret(account.api_key))
        agents = client.list_agents()
        _upsert_provider_agents(db, account=account, agents=agents)
        db.commit()

    rows = db.scalars(
        select(ProviderAgent).where(ProviderAgent.provider_account_id == account.id)
    ).all()
    return [
        ProviderAgentResponse(
            id=row.id,
            provider_agent_id=row.provider_agent_id,
            name=row.name,
            is_default=row.is_default,
        )
        for row in rows
    ]


@router.post("/agents/{agent_id}/default", response_model=ProviderAgentResponse)
def set_default_agent(
    agent_id: str,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> ProviderAgentResponse:
    target = db.scalar(select(ProviderAgent).where(ProviderAgent.id == agent_id))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    account = db.scalar(select(ProviderAccount).where(ProviderAccount.id == target.provider_account_id))
    if not account or account.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    rows = db.scalars(
        select(ProviderAgent).where(ProviderAgent.provider_account_id == target.provider_account_id)
    ).all()
    for row in rows:
        row.is_default = row.id == target.id

    db.commit()
    db.refresh(target)
    return ProviderAgentResponse(
        id=target.id,
        provider_agent_id=target.provider_agent_id,
        name=target.name,
        is_default=True,
    )
