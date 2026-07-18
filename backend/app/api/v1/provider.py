from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.provider import ProviderAccount, ProviderAgent
from app.providers.factory import get_provider_adapter
from app.schemas.provider import (
    ConnectProviderRequest,
    ProviderAgentResponse,
    ProviderConnectionListItem,
    ProviderConnectionResponse,
)
from app.services.credentials import decrypt_secret, encrypt_secret
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter()

SUPPORTED_PROVIDER_NAMES = {"elevenlabs", "vapi"}


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


def _resolve_accounts(
    db: Session,
    *,
    workspace_id: str,
    provider_account_id: str | None,
    provider_name: str | None,
) -> list[ProviderAccount]:
    if provider_account_id:
        account = db.scalar(
            select(ProviderAccount).where(
                ProviderAccount.id == provider_account_id,
                ProviderAccount.workspace_id == workspace_id,
            )
        )
        return [account] if account else []

    query = select(ProviderAccount).where(ProviderAccount.workspace_id == workspace_id)
    if provider_name:
        query = query.where(ProviderAccount.provider_name == provider_name.lower())

    return list(db.scalars(query.order_by(ProviderAccount.provider_name.asc(), ProviderAccount.created_at.asc())).all())


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
    provider_name = payload.provider_name.strip().lower()
    if provider_name not in SUPPORTED_PROVIDER_NAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {payload.provider_name}",
        )

    account = db.scalar(
        select(ProviderAccount).where(
            ProviderAccount.workspace_id == workspace_id,
            ProviderAccount.provider_name == provider_name,
        )
    )
    try:
        adapter = get_provider_adapter(provider_name=provider_name, api_key=payload.api_key)
        agents = adapter.list_agents()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not connect to {provider_name}: {exc}",
        ) from exc

    if account:
        account.api_key = encrypt_secret(payload.api_key)
    else:
        account = ProviderAccount(
            workspace_id=workspace_id,
            provider_name=provider_name,
            api_key=encrypt_secret(payload.api_key),
        )
        db.add(account)

    db.flush()
    _upsert_provider_agents(db, account=account, agents=agents)

    db.commit()
    db.refresh(account)
    return ProviderConnectionResponse(
        id=account.id,
        provider_name=account.provider_name,
        agent_count=len(agents),
    )


@router.post("/test", response_model=dict)
def test_provider_connection(
    provider_account_id: str | None = None,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> dict:
    account = _resolve_account(db, workspace_id=workspace_id, provider_account_id=provider_account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")

    adapter = get_provider_adapter(provider_name=account.provider_name, api_key=decrypt_secret(account.api_key))
    try:
        agents = adapter.list_agents()
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}

    return {"ok": True, "agent_count": len(agents)}


@router.get("/connections", response_model=list[ProviderConnectionListItem])
def list_provider_connections(
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> list[ProviderConnectionListItem]:
    rows = db.scalars(
        select(ProviderAccount)
        .where(ProviderAccount.workspace_id == workspace_id)
        .order_by(ProviderAccount.created_at.desc())
    ).all()

    return [
        ProviderConnectionListItem(
            id=row.id,
            provider_name=row.provider_name,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/agents", response_model=list[ProviderAgentResponse])
def list_agents(
    provider_account_id: str | None = None,
    provider_name: str | None = Query(default=None),
    search: str | None = Query(default=None),
    refresh: bool = Query(default=False),
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> list[ProviderAgentResponse]:
    normalized_provider_name = provider_name.strip().lower() if provider_name else None
    if normalized_provider_name and normalized_provider_name not in SUPPORTED_PROVIDER_NAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider_name}",
        )

    accounts = _resolve_accounts(
        db,
        workspace_id=workspace_id,
        provider_account_id=provider_account_id,
        provider_name=normalized_provider_name,
    )
    if not accounts:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")

    if refresh:
        for account in accounts:
            adapter = get_provider_adapter(
                provider_name=account.provider_name,
                api_key=decrypt_secret(account.api_key),
            )
            agents = adapter.list_agents()
            _upsert_provider_agents(db, account=account, agents=agents)
        db.commit()

    account_by_id = {account.id: account for account in accounts}
    rows = db.scalars(
        select(ProviderAgent)
        .where(ProviderAgent.provider_account_id.in_(account_by_id.keys()))
        .order_by(ProviderAgent.name.asc(), ProviderAgent.created_at.asc())
    ).all()

    normalized_search = search.strip().lower() if search else None
    filtered_rows = [
        row
        for row in rows
        if not normalized_search or normalized_search in row.name.lower()
    ]

    return [
        ProviderAgentResponse(
            id=row.id,
            provider_account_id=row.provider_account_id,
            provider_name=account_by_id[row.provider_account_id].provider_name,
            provider_agent_id=row.provider_agent_id,
            name=row.name,
            is_default=row.is_default,
        )
        for row in filtered_rows
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
        provider_account_id=target.provider_account_id,
        provider_name=account.provider_name,
        provider_agent_id=target.provider_agent_id,
        name=target.name,
        is_default=True,
    )
