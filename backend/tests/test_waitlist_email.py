from app.core.config import Settings
from app.services.email_service import (
    send_portal_signup_notification_email,
    send_waitlist_notification_email,
)


class FakeSMTP:
    sent = []

    def __init__(self, host: str, port: int, timeout: int) -> None:
        assert host == "smtp.example.com"
        assert port == 587
        assert timeout == 20

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def starttls(self) -> None:
        return None

    def login(self, username: str, password: str) -> None:
        assert username == "user"
        assert password == "password"

    def send_message(self, message) -> None:
        self.sent.append(message)


def test_waitlist_notification_has_reply_to_and_application_context(monkeypatch) -> None:
    FakeSMTP.sent = []
    monkeypatch.setattr("app.services.email_service.smtplib.SMTP", FakeSMTP)
    settings = Settings(
        smtp_host="smtp.example.com",
        smtp_username="user",
        smtp_password="password",
        smtp_from_email="VaaniEval <hello@vaanieval.com>",
    )

    send_waitlist_notification_email(
        settings,
        "shubham@example.com",
        applicant_name="Ada Lovelace",
        applicant_email="ada@example.com",
        company="Analytical Engine",
        role="Founder",
        website="https://example.com",
        voice_stack="LiveKit",
        challenge="Keeping evaluation coverage current",
        source_page="/",
        utm_source="linkedin",
        utm_medium="social",
        utm_campaign="launch",
    )

    assert len(FakeSMTP.sent) == 1
    message = FakeSMTP.sent[0]
    assert message["To"] == "shubham@example.com"
    assert message["Reply-To"] == "ada@example.com"
    assert "Analytical Engine" in message["Subject"]
    assert "Keeping evaluation coverage current" in message.get_content()


def test_portal_signup_notification_replies_to_the_new_user(monkeypatch) -> None:
    FakeSMTP.sent = []
    monkeypatch.setattr("app.services.email_service.smtplib.SMTP", FakeSMTP)
    settings = Settings(
        smtp_host="smtp.example.com",
        smtp_username="user",
        smtp_password="password",
        smtp_from_email="VaaniEval <hello@vaanieval.com>",
    )

    send_portal_signup_notification_email(settings, "shubham@example.com", "new-founder@example.com")

    assert len(FakeSMTP.sent) == 1
    message = FakeSMTP.sent[0]
    assert message["To"] == "shubham@example.com"
    assert message["Reply-To"] == "new-founder@example.com"
    assert "portal signup" in message["Subject"]
