"""One-time maintenance script: queue display-name backfill jobs for every
conversation that predates (or missed) provider display-name extraction.

Conversations imported before display names were persisted -- or imported while
a provider's analysis/summary was not yet available -- are left with
``display_name IS NULL`` forever, since nothing previously enqueued the
``backfill_conversation_display_name`` job outside of a live worker (see
``app.services.import_service``). The API now also enqueues this lazily as
conversations are viewed, but this script clears the historical backlog in one
pass so the queue worker can process it without waiting on page views.

Run with: python -m scripts.backfill_conversation_display_names
"""

from __future__ import annotations

from app.db.session import SessionLocal
from app.models.conversation import Conversation
from app.services.import_service import enqueue_conversation_display_name_backfill
from sqlalchemy import or_, select


def main() -> None:
    db = SessionLocal()
    try:
        rows = db.scalars(
            select(Conversation).where(
                or_(Conversation.display_name.is_(None), Conversation.display_name == "")
            )
        ).all()

        queued = 0
        for row in rows:
            enqueue_conversation_display_name_backfill(db, conversation_id=row.id)
            queued += 1

        db.commit()
        print(f"Queued display-name backfill for {queued} of {len(rows)} conversations without a name.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
