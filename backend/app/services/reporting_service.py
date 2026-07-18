from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import smtplib
from urllib.request import Request, urlopen

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.conversation import Conversation
from app.models.reporting import ReportingSettings


def _is_failure(outcome: str | None) -> bool:
    return bool(outcome and any(word in outcome.lower() for word in ("error", "fail", "timeout", "abort")))


def _window_summary(db: Session, workspace_id: str, start: datetime, end: datetime) -> tuple[int, int]:
    timestamp = func.coalesce(Conversation.started_at, Conversation.created_at)
    rows = db.scalars(
        select(Conversation.outcome).where(
            Conversation.workspace_id == workspace_id, timestamp >= start, timestamp < end
        )
    ).all()
    return len(rows), sum(_is_failure(outcome) for outcome in rows)


def _send_email(settings: Settings, recipient: str, subject: str, body: str) -> None:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise RuntimeError("SMTP_HOST and SMTP_FROM_EMAIL are required for reporting email")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username or settings.smtp_password:
            if not settings.smtp_username or not settings.smtp_password:
                raise RuntimeError("SMTP_USERNAME and SMTP_PASSWORD must be configured together")
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def _send_slack(webhook_url: str, text: str) -> None:
    request = Request(
        webhook_url,
        data=json.dumps({"text": text}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=10) as response:  # nosec B310: URL is owner-configured Slack HTTPS webhook
        if response.status >= 300:
            raise RuntimeError("Slack rejected the reporting notification")


def deliver_notification(settings: Settings, config: ReportingSettings, subject: str, text: str) -> None:
    """Deliver to every currently enabled channel; one bad channel makes queue retry."""
    delivered = False
    if config.email_enabled and config.email_recipient:
        _send_email(settings, config.email_recipient, subject, text)
        delivered = True
    if config.slack_enabled and config.slack_webhook_url:
        _send_slack(config.slack_webhook_url, f"*{subject}*\n{text}")
        delivered = True
    if not delivered:
        raise RuntimeError("No enabled reporting destination is configured")


def process_reporting_alerts(db: Session, app_settings: Settings, now: datetime) -> None:
    now = now.astimezone(timezone.utc)
    configs = db.scalars(select(ReportingSettings)).all()
    for config in configs:
        if not ((config.email_enabled and config.email_recipient) or (config.slack_enabled and config.slack_webhook_url)):
            continue

        if config.daily_digest_enabled and now.hour >= config.daily_delivery_hour_utc:
            report_date = (now.date() - timedelta(days=1)).isoformat()
            if config.last_daily_digest_date != report_date:
                start = datetime.combine(now.date() - timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
                total, failures = _window_summary(db, config.workspace_id, start, start + timedelta(days=1))
                failure_rate = (failures / total * 100) if total else 0
                deliver_notification(
                    app_settings,
                    config,
                    "VaaniEval daily report",
                    f"UTC date: {report_date}\nCalls: {total}\nProvider failures: {failures} ({failure_rate:.1f}%).",
                )
                config.last_daily_digest_date = report_date

        if config.incident_alerts_enabled:
            total, failures = _window_summary(db, config.workspace_id, now - timedelta(hours=1), now)
            rate = failures / total * 100 if total else 0
            breached = total >= config.incident_min_calls and rate >= config.incident_failure_threshold
            if breached and not config.incident_active:
                deliver_notification(
                    app_settings,
                    config,
                    "VaaniEval incident: call failures elevated",
                    f"Last hour: {failures} provider failures across {total} calls ({rate:.1f}%). Threshold: {config.incident_failure_threshold}%.",
                )
                config.incident_active = True
            elif not breached and config.incident_active:
                config.incident_active = False
    db.flush()
