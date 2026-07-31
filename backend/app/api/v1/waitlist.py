import hmac
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.waitlist import WaitlistApplication
from app.schemas.waitlist import WaitlistApplicationRequest, WaitlistApplicationResponse
from app.services.email_service import EmailDeliveryError, send_waitlist_notification_email

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=WaitlistApplicationResponse, status_code=status.HTTP_202_ACCEPTED)
def apply(
    payload: WaitlistApplicationRequest,
    x_waitlist_ingest_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> WaitlistApplicationResponse:
    settings = get_settings()
    if not settings.waitlist_ingest_token or not x_waitlist_ingest_token or not hmac.compare_digest(settings.waitlist_ingest_token, x_waitlist_ingest_token):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    application = WaitlistApplication(
        email=str(payload.email).strip().lower(),
        name=payload.name.strip(),
        company=payload.company.strip(),
        role=payload.role.strip(),
        website=payload.website.strip() if payload.website else None,
        voice_stack=payload.stack.strip(),
        challenge=payload.challenge.strip(),
        source_page=payload.source_page,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
    )
    try:
        db.add(application)
        db.commit()
    except IntegrityError:
        db.rollback()
        return WaitlistApplicationResponse(message="Thanks, your application has been received.")

    if settings.waitlist_notification_email:
        try:
            send_waitlist_notification_email(
                settings,
                settings.waitlist_notification_email,
                applicant_name=application.name,
                applicant_email=application.email,
                company=application.company,
                role=application.role,
                website=application.website,
                voice_stack=application.voice_stack,
                challenge=application.challenge,
                source_page=application.source_page,
                utm_source=application.utm_source,
                utm_medium=application.utm_medium,
                utm_campaign=application.utm_campaign,
            )
        except EmailDeliveryError:
            logger.exception("Design-partner application notification failed after the application was stored")
    return WaitlistApplicationResponse(message="Thanks, your application has been received.")
