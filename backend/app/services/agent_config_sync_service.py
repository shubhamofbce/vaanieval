from __future__ import annotations

from datetime import datetime

from app.models.provider import AgentConfigSyncJob, ProviderAccount, ProviderAgent
from app.providers.factory import get_provider_adapter
from app.services.agent_config_service import capture_configuration
from app.services.credentials import decrypt_secret
from app.services.queue_service import enqueue_job
from app.services.security import utc_now
from sqlalchemy import select
from sqlalchemy.orm import Session

SYNC_AGENT_CONFIGURATIONS = "sync_agent_configurations"


def enqueue_agent_config_sync(db: Session, *, workspace_id: str, provider_account_id: str | None = None) -> AgentConfigSyncJob:
    job = AgentConfigSyncJob(workspace_id=workspace_id, provider_account_id=provider_account_id, status="queued")
    db.add(job)
    db.flush()
    enqueue_job(db, job_type=SYNC_AGENT_CONFIGURATIONS, payload={"sync_job_id": job.id}, priority=45)
    return job


def _provider_datetime(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def run_agent_config_sync(db: Session, payload: dict) -> None:
    sync_job = db.scalar(select(AgentConfigSyncJob).where(AgentConfigSyncJob.id == payload.get("sync_job_id")))
    if not sync_job:
        return
    sync_job.status = "running"
    accounts_query = select(ProviderAccount).where(ProviderAccount.workspace_id == sync_job.workspace_id)
    if sync_job.provider_account_id:
        accounts_query = accounts_query.where(ProviderAccount.id == sync_job.provider_account_id)
    accounts = db.scalars(accounts_query).all()
    for account in accounts:
        try:
            adapter = get_provider_adapter(provider_name=account.provider_name, api_key=decrypt_secret(account.api_key))
            agents = adapter.list_agents()
            for info in agents:
                agent = db.scalar(select(ProviderAgent).where(ProviderAgent.provider_account_id == account.id, ProviderAgent.provider_agent_id == info.agent_id))
                if not agent:
                    agent = ProviderAgent(provider_account_id=account.id, provider_agent_id=info.agent_id, name=info.name)
                    db.add(agent)
                    db.flush()
                else:
                    agent.name = info.name
                sync_job.processed_count += 1
                if account.provider_name != "vapi":
                    continue
                try:
                    configuration = adapter.get_agent_configuration(info.agent_id)
                    assistant = configuration.get("assistant", {})
                    changed, _ = capture_configuration(db, agent=agent, provider_updated_at=_provider_datetime(assistant.get("updatedAt")), payload=configuration)
                    agent.config_last_checked_at = utc_now()
                    if changed and _.version_number > 1:  # baselines are intentionally not reported as changes
                        sync_job.changed_count += 1
                except Exception:  # isolate one inaccessible Vapi assistant/tool from the remaining sync
                    sync_job.failed_count += 1
            db.flush()
        except Exception as exc:  # retain partial progress so queue retry has observable state
            sync_job.failed_count += 1
            sync_job.error_message = str(exc)[:2000]
    sync_job.status = "completed" if not sync_job.error_message else "failed"
    sync_job.completed_at = utc_now()
