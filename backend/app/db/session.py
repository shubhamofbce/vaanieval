from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


def _resolve_database_url(raw_url: str) -> str:
    # Keep local sqlite path stable regardless of process cwd (API vs worker).
    if raw_url.startswith("sqlite:///./"):
        relative_path = raw_url[len("sqlite:///./") :]
        backend_root = Path(__file__).resolve().parents[2]
        absolute_path = (backend_root / relative_path).resolve()
        return f"sqlite:///{absolute_path.as_posix()}"

    # Ensure PostgreSQL uses psycopg3 (installed as `psycopg[binary]`).
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)

    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)

    return raw_url

engine = create_engine(_resolve_database_url(settings.database_url), future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
