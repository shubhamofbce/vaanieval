from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_owner
from app.core.config import get_settings
from app.db.session import get_db
from app.models.reporting import ReportingSettings
from app.schemas.reporting import ReportingSettingsResponse, ReportingSettingsUpdate, ReportingTestResponse
from app.services.reporting_service import deliver_notification

router = APIRouter()


def _get_or_create(db: Session, workspace_id: str) -> ReportingSettings:
    config = db.scalar(select(ReportingSettings).where(ReportingSettings.workspace_id == workspace_id))
    if config is None:
        config = ReportingSettings(workspace_id=workspace_id)
        db.add(config)
        db.flush()
    return config


def _response(config: ReportingSettings) -> ReportingSettingsResponse:
    return ReportingSettingsResponse(
        email_enabled=config.email_enabled,
        email_recipient=config.email_recipient,
        slack_enabled=config.slack_enabled,
        slack_webhook_configured=bool(config.slack_webhook_url),
        daily_digest_enabled=config.daily_digest_enabled,
        daily_delivery_hour_utc=config.daily_delivery_hour_utc,
        incident_alerts_enabled=config.incident_alerts_enabled,
        incident_failure_threshold=config.incident_failure_threshold,
        incident_min_calls=config.incident_min_calls,
        incident_active=config.incident_active,
        last_daily_digest_date=config.last_daily_digest_date,
        updated_at=config.updated_at,
    )


@router.get("/settings", response_model=ReportingSettingsResponse)
def get_reporting_settings(workspace_id: str = Depends(get_current_workspace_owner), db: Session = Depends(get_db)):
    return _response(_get_or_create(db, workspace_id))


@router.put("/settings", response_model=ReportingSettingsResponse)
def update_reporting_settings(
    payload: ReportingSettingsUpdate,
    workspace_id: str = Depends(get_current_workspace_owner),
    db: Session = Depends(get_db),
):
    if payload.email_enabled and not payload.email_recipient:
        raise HTTPException(status_code=422, detail="An email recipient is required when email is enabled")
    if payload.slack_enabled and not payload.slack_webhook_url:
        raise HTTPException(status_code=422, detail="A Slack webhook URL is required when Slack is enabled")
    config = _get_or_create(db, workspace_id)
    for field, value in payload.model_dump().items():
        setattr(config, field, str(value) if field == "slack_webhook_url" and value else value)
    db.commit()
    db.refresh(config)
    return _response(config)


@router.post("/test", response_model=ReportingTestResponse)
def test_reporting_destination(workspace_id: str = Depends(get_current_workspace_owner), db: Session = Depends(get_db)):
    config = _get_or_create(db, workspace_id)
    try:
        deliver_notification(get_settings(), config, "VaaniEval reporting test", "Your reporting destination is ready.")
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ReportingTestResponse(message="Test notification sent")
