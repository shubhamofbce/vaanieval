from __future__ import annotations

import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode

from app.core.config import Settings


class EmailDeliveryError(RuntimeError):
    pass


def _require_smtp_setting(value: str | None, name: str) -> str:
    if value:
        return value
    raise EmailDeliveryError(f"{name} is required to send production magic links")


def build_magic_link(settings: Settings, token: str) -> str:
    base_url = settings.frontend_app_url.rstrip("/")
    return f"{base_url}/login?{urlencode({'token': token})}"


def send_magic_link_email(settings: Settings, recipient: str, token: str) -> None:
    host = _require_smtp_setting(settings.smtp_host, "SMTP_HOST")
    from_email = _require_smtp_setting(settings.smtp_from_email, "SMTP_FROM_EMAIL")
    link = build_magic_link(settings, token)

    message = EmailMessage()
    message["Subject"] = "Your VaaniEval sign-in link"
    message["From"] = from_email
    message["To"] = recipient
    message.set_content(
        "\n".join(
            [
                "Use this link to sign in to VaaniEval:",
                "",
                link,
                "",
                "If the link does not open automatically, copy this token into the login page:",
                "",
                token,
                "",
                "This link expires soon. If you did not request it, you can ignore this email.",
            ]
        )
    )

    try:
        with smtplib.SMTP(host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username or settings.smtp_password:
                username = _require_smtp_setting(settings.smtp_username, "SMTP_USERNAME")
                password = _require_smtp_setting(settings.smtp_password, "SMTP_PASSWORD")
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Failed to send production magic link email") from exc


def send_waitlist_notification_email(
    settings: Settings,
    recipient: str,
    *,
    applicant_name: str,
    applicant_email: str,
    company: str,
    role: str,
    website: str | None,
    voice_stack: str,
    challenge: str,
    source_page: str | None,
    utm_source: str | None,
    utm_medium: str | None,
    utm_campaign: str | None,
) -> None:
    host = _require_smtp_setting(settings.smtp_host, "SMTP_HOST")
    from_email = _require_smtp_setting(settings.smtp_from_email, "SMTP_FROM_EMAIL")
    message = EmailMessage()
    message["Subject"] = f"New VaaniEval design-partner application: {company}"
    message["From"] = from_email
    message["To"] = recipient
    message["Reply-To"] = applicant_email
    message.set_content(
        "\n".join(
            [
                "A new design-partner application was submitted.",
                "",
                f"Name: {applicant_name}",
                f"Email: {applicant_email}",
                f"Company: {company}",
                f"Role: {role}",
                f"Website or LinkedIn: {website or 'Not provided'}",
                f"Voice AI stack: {voice_stack}",
                f"Source page: {source_page or 'Not provided'}",
                f"UTM source: {utm_source or 'Not provided'}",
                f"UTM medium: {utm_medium or 'Not provided'}",
                f"UTM campaign: {utm_campaign or 'Not provided'}",
                "",
                "Quality or evaluation challenge:",
                challenge,
            ]
        )
    )
    try:
        with smtplib.SMTP(host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username or settings.smtp_password:
                username = _require_smtp_setting(settings.smtp_username, "SMTP_USERNAME")
                password = _require_smtp_setting(settings.smtp_password, "SMTP_PASSWORD")
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Failed to send design-partner application notification") from exc


def send_portal_signup_notification_email(settings: Settings, recipient: str, user_email: str) -> None:
    host = _require_smtp_setting(settings.smtp_host, "SMTP_HOST")
    from_email = _require_smtp_setting(settings.smtp_from_email, "SMTP_FROM_EMAIL")
    message = EmailMessage()
    message["Subject"] = f"New VaaniEval portal signup: {user_email}"
    message["From"] = from_email
    message["To"] = recipient
    message["Reply-To"] = user_email
    message.set_content(
        "\n".join(
            [
                "A new VaaniEval portal account was created.",
                "",
                f"Email: {user_email}",
                "",
                "This notification is sent only for a new account, not repeat magic-link requests.",
            ]
        )
    )
    try:
        with smtplib.SMTP(host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username or settings.smtp_password:
                username = _require_smtp_setting(settings.smtp_username, "SMTP_USERNAME")
                password = _require_smtp_setting(settings.smtp_password, "SMTP_PASSWORD")
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Failed to send portal signup notification") from exc
