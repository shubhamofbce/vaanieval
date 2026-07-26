"""Boundary tests for lease recovery timing in the queue service.

``leased_until`` is an absolute expiry instant: a lease is stale as soon as
``leased_until <= now``. These tests pin the boundary conditions for
``recover_stale_leases`` against an in-memory SQLite database.
"""

from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.job_queue import JobQueue, JobStatus
from app.services.queue_service import recover_stale_leases


@pytest.fixture()
def db() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def _lease_job(db: Session, *, leased_until: datetime, owner: str = "worker-1") -> JobQueue:
    job = JobQueue(
        type="import",
        payload_json="{}",
        status=JobStatus.LEASED.value,
        lease_owner=owner,
        leased_until=leased_until,
    )
    db.add(job)
    db.flush()
    return job


def test_active_lease_is_not_recovered(db: Session) -> None:
    """A lease whose leased_until is strictly in the future is untouched."""
    job = _lease_job(db, leased_until=datetime.now(timezone.utc) + timedelta(seconds=60))

    recovered = recover_stale_leases(db)

    assert recovered == 0
    assert job.status == JobStatus.LEASED.value
    assert job.lease_owner == "worker-1"
    assert job.leased_until is not None


def test_just_expired_lease_is_recovered(db: Session) -> None:
    """A lease whose leased_until just passed is recovered on the next pass."""
    job = _lease_job(db, leased_until=datetime.now(timezone.utc) - timedelta(seconds=1))

    recovered = recover_stale_leases(db)

    assert recovered == 1
    assert job.status == JobStatus.PENDING.value
    assert job.lease_owner is None
    assert job.leased_until is None


def test_long_expired_lease_is_recovered(db: Session) -> None:
    """A lease whose leased_until is well in the past is recovered the same way."""
    job = _lease_job(db, leased_until=datetime.now(timezone.utc) - timedelta(hours=1))

    recovered = recover_stale_leases(db)

    assert recovered == 1
    assert job.status == JobStatus.PENDING.value
    assert job.lease_owner is None
    assert job.leased_until is None


def test_recovery_is_idempotent(db: Session) -> None:
    """A second recovery pass immediately after the first recovers nothing new."""
    _lease_job(db, leased_until=datetime.now(timezone.utc) - timedelta(seconds=1))

    first = recover_stale_leases(db)
    second = recover_stale_leases(db)

    assert first == 1
    assert second == 0


def test_lease_expiring_exactly_now_is_recovered(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A lease whose leased_until is exactly equal to now is recovered.

    This pins the boundary the docstring promises: ``leased_until <= now``
    includes the exact-equality case. A naive ``<`` predicate would silently
    leave this lease untouched while still passing the other tests.
    """

    class _FrozenDatetime:
        @classmethod
        def now(cls, tz=None) -> datetime:
            return frozen_now

    frozen_now = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr("app.services.queue_service.datetime", _FrozenDatetime)

    job = _lease_job(db, leased_until=frozen_now)

    recovered = recover_stale_leases(db)

    assert recovered == 1
    assert job.status == JobStatus.PENDING.value
    assert job.lease_owner is None
    assert job.leased_until is None
