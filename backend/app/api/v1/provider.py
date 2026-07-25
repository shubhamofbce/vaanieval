from app.api.deps import get_current_workspace_id
from app.db.session import get_db
import json

from app.models.provider import AgentConfigSyncJob, AgentConfigVersion, ProviderAccount, ProviderAgent
from app.providers.factory import get_provider_adapter
from app.schemas.provider import (
    ConnectProviderRequest,
    ProviderAgentResponse,
    AgentConfigSyncJobResponse,
    AgentConfigVersionDetail,
    AgentConfigVersionListItem,
    AgentConfigVersionPage,
    ProviderConnectionListItem,
    ProviderConnectionResponse,
)
from app.services.credentials import decrypt_secret, encrypt_secret
from app.services.agent_config_service import version_diff
from app.services.agent_config_sync_service import enqueue_agent_config_sync
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter()

SUPPORTED_PROVIDER_NAMES = {"elevenlabs", "vapi", "bolna"}


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


def _agent_response(row: ProviderAgent, account: ProviderAccount, version: AgentConfigVersion | None = None) -> ProviderAgentResponse:
    return ProviderAgentResponse(
        id=row.id, provider_account_id=row.provider_account_id, provider_name=account.provider_name,
        provider_agent_id=row.provider_agent_id, name=row.name, is_default=row.is_default,
        configuration_checked_at=row.config_last_checked_at,
        last_configuration_change_at=version.captured_at if version and version.version_number > 1 else None,
        configuration_version=version.version_number if version else None,
        configuration_change_categories=json.loads(version.change_summary_json) if version else [],
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

    versions = db.scalars(select(AgentConfigVersion).where(AgentConfigVersion.provider_agent_id.in_([row.id for row in filtered_rows])).order_by(AgentConfigVersion.provider_agent_id, AgentConfigVersion.version_number.desc())).all() if filtered_rows else []
    latest_by_agent = {}
    for version in versions:
        latest_by_agent.setdefault(version.provider_agent_id, version)
    return [_agent_response(row, account_by_id[row.provider_account_id], latest_by_agent.get(row.id)) for row in filtered_rows]


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
    return _agent_response(target, account)


@router.post("/agents/sync", response_model=AgentConfigSyncJobResponse)
def sync_agents_from_provider(
    provider_account_id: str | None = None,
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
) -> AgentConfigSyncJobResponse:
    if provider_account_id and not _resolve_account(db, workspace_id=workspace_id, provider_account_id=provider_account_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")
    job = enqueue_agent_config_sync(db, workspace_id=workspace_id, provider_account_id=provider_account_id)
    db.commit()
    return AgentConfigSyncJobResponse(id=job.id, status=job.status, processed_count=0, changed_count=0, failed_count=0)


@router.get("/agents/sync/{sync_job_id}", response_model=AgentConfigSyncJobResponse)
def get_agent_sync_status(sync_job_id: str, workspace_id: str = Depends(get_current_workspace_id), db: Session = Depends(get_db)) -> AgentConfigSyncJobResponse:
    job = db.scalar(select(AgentConfigSyncJob).where(AgentConfigSyncJob.id == sync_job_id, AgentConfigSyncJob.workspace_id == workspace_id))
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sync job not found")
    return AgentConfigSyncJobResponse(id=job.id, status=job.status, processed_count=job.processed_count, changed_count=job.changed_count, failed_count=job.failed_count, error_message=job.error_message)


def _owned_agent(db: Session, *, agent_id: str, workspace_id: str) -> ProviderAgent:
    agent = db.scalar(select(ProviderAgent).join(ProviderAccount).where(ProviderAgent.id == agent_id, ProviderAccount.workspace_id == workspace_id))
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.get("/agents/{agent_id}/config-versions", response_model=AgentConfigVersionPage)
def list_agent_config_versions(agent_id: str, limit: int = Query(default=20, ge=1, le=100), offset: int = Query(default=0, ge=0), workspace_id: str = Depends(get_current_workspace_id), db: Session = Depends(get_db)) -> AgentConfigVersionPage:
    agent = _owned_agent(db, agent_id=agent_id, workspace_id=workspace_id)
    query = select(AgentConfigVersion).where(AgentConfigVersion.provider_agent_id == agent.id).order_by(AgentConfigVersion.version_number.desc())
    all_versions = db.scalars(query).all()
    return AgentConfigVersionPage(items=[AgentConfigVersionListItem(version_number=item.version_number, captured_at=item.captured_at, provider_updated_at=item.provider_updated_at, change_categories=json.loads(item.change_summary_json), is_baseline=item.version_number == 1) for item in all_versions[offset:offset + limit]], total=len(all_versions))


@router.get("/agents/{agent_id}/config-versions/{version_number}", response_model=AgentConfigVersionDetail)
def get_agent_config_version(agent_id: str, version_number: int, workspace_id: str = Depends(get_current_workspace_id), db: Session = Depends(get_db)) -> AgentConfigVersionDetail:
    agent = _owned_agent(db, agent_id=agent_id, workspace_id=workspace_id)
    version = db.scalar(select(AgentConfigVersion).where(AgentConfigVersion.provider_agent_id == agent.id, AgentConfigVersion.version_number == version_number))
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuration version not found")
    previous = db.scalar(select(AgentConfigVersion).where(AgentConfigVersion.provider_agent_id == agent.id, AgentConfigVersion.version_number == version_number - 1))
    return AgentConfigVersionDetail(version_number=version.version_number, captured_at=version.captured_at, change_categories=json.loads(version.change_summary_json), changes=version_diff(previous, version))
