from __future__ import annotations

import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))


def _alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_migration_upgrade_and_downgrade(monkeypatch, tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'migration.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)

    from app.core.config import get_settings

    get_settings.cache_clear()
    config = _alembic_config(database_url)
    command.upgrade(config, "0003_encryptable_api_keys")

    engine = create_engine(database_url)
    columns = {column["name"]: column for column in inspect(engine).get_columns("eval_provider_accounts")}
    assert columns["api_key"]["nullable"] is False

    command.upgrade(config, "0004_nullable_eval_keys")
    columns = {column["name"]: column for column in inspect(engine).get_columns("eval_provider_accounts")}
    assert columns["api_key"]["nullable"] is True

    with engine.begin() as connection:
        connection.execute(
            text("INSERT INTO workspaces (id, name) VALUES ('workspace-1', 'Test')")
        )
        connection.execute(
            text(
                "INSERT INTO eval_provider_accounts "
                "(id, workspace_id, provider_name, api_key, model_name) "
                "VALUES ('eval-1', 'workspace-1', 'ollama', NULL, 'llama3.2:latest')"
            )
        )

    command.downgrade(config, "0003_encryptable_api_keys")
    columns = {column["name"]: column for column in inspect(engine).get_columns("eval_provider_accounts")}
    assert columns["api_key"]["nullable"] is False
    with engine.connect() as connection:
        assert connection.scalar(
            text("SELECT api_key FROM eval_provider_accounts WHERE id = 'eval-1'")
        ) == ""

    get_settings.cache_clear()
