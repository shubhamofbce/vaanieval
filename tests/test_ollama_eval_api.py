from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.api.v1 import evaluations as evaluations_api  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.models import (  # noqa: E402
    Conversation,
    ConversationEvaluationRun,
    ConversationTurn,
    EvalProviderAccount,
    Workspace,
)
from app.schemas.evaluations import ConnectEvalProviderRequest  # noqa: E402
from app.services import evaluation_service  # noqa: E402
from app.services.eval_providers import (  # noqa: E402
    OllamaTimeoutError,
    OllamaUnavailableError,
)


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Workspace(id="workspace-1", name="Test"))
        session.commit()
        yield session


def test_catalog_marks_ollama_keyless_and_dynamic() -> None:
    catalog = evaluations_api.list_provider_catalog()
    ollama = next(item for item in catalog if item.provider_name == "ollama")
    openai = next(item for item in catalog if item.provider_name == "openai")

    assert ollama.requires_api_key is False
    assert ollama.default_model is None
    assert ollama.models == []
    assert openai.requires_api_key is True


def test_connects_ollama_without_api_key(monkeypatch, db: Session) -> None:
    monkeypatch.setattr(
        evaluations_api,
        "get_available_models",
        lambda provider_name: ["llama3.2:latest"],
    )
    response = evaluations_api.connect_eval_provider(
        ConnectEvalProviderRequest(
            provider_name="ollama",
            api_key=None,
            model_name="llama3.2:latest",
        ),
        workspace_id="workspace-1",
        db=db,
    )

    row = db.scalar(select(EvalProviderAccount))
    assert row is not None
    assert row.api_key is None
    assert response.api_key_configured is False


@pytest.mark.parametrize("provider_name", ["openai", "anthropic"])
def test_cloud_provider_still_requires_api_key(provider_name: str, db: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        evaluations_api.connect_eval_provider(
            ConnectEvalProviderRequest(
                provider_name=provider_name,
                api_key=None,
                model_name="gpt-4o-mini",
            ),
            workspace_id="workspace-1",
            db=db,
        )
    assert exc_info.value.status_code == 400
    assert "API key is required" in exc_info.value.detail


def test_cloud_provider_key_remains_encrypted(monkeypatch, db: Session) -> None:
    monkeypatch.setattr(
        evaluations_api,
        "get_available_models",
        lambda provider_name: ["gpt-4o-mini"],
    )
    response = evaluations_api.connect_eval_provider(
        ConnectEvalProviderRequest(
            provider_name="openai",
            api_key="sk-secret",
            model_name="gpt-4o-mini",
        ),
        workspace_id="workspace-1",
        db=db,
    )

    row = db.scalar(select(EvalProviderAccount))
    assert row is not None
    assert row.api_key is not None
    assert row.api_key.startswith("enc::")
    assert "sk-secret" not in row.api_key
    assert response.api_key_configured is True


def test_connect_rejects_uninstalled_ollama_model(monkeypatch, db: Session) -> None:
    monkeypatch.setattr(evaluations_api, "get_available_models", lambda provider_name: [])
    with pytest.raises(HTTPException) as exc_info:
        evaluations_api.connect_eval_provider(
            ConnectEvalProviderRequest(
                provider_name="ollama",
                model_name="missing:latest",
            ),
            workspace_id="workspace-1",
            db=db,
        )
    assert exc_info.value.status_code == 400
    assert "ollama pull missing:latest" in exc_info.value.detail


def test_model_listing_returns_502_when_ollama_is_unavailable(monkeypatch, db: Session) -> None:
    def unavailable(provider_name: str) -> list[str]:
        raise OllamaUnavailableError("Start Ollama")

    monkeypatch.setattr(evaluations_api, "get_available_models", unavailable)
    with pytest.raises(HTTPException) as exc_info:
        evaluations_api.get_provider_models("ollama", "workspace-1", db)
    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == "Start Ollama"


def test_queue_validates_runtime_ollama_override(monkeypatch, db: Session) -> None:
    db.add(
        EvalProviderAccount(
            workspace_id="workspace-1",
            provider_name="ollama",
            api_key=None,
            model_name="llama3.2:latest",
        )
    )
    db.commit()
    monkeypatch.setattr(
        evaluation_service,
        "get_available_models",
        lambda provider_name: ["llama3.2:latest"],
    )

    with pytest.raises(ValueError, match="ollama pull other:latest"):
        evaluation_service.enqueue_evaluation_job(
            db,
            workspace_id="workspace-1",
            conversation_id="conversation-1",
            provider_name="ollama",
            model_name="other:latest",
        )


def test_runtime_ollama_error_marks_evaluation_failed(monkeypatch, db: Session) -> None:
    db.add_all(
        [
            EvalProviderAccount(
                workspace_id="workspace-1",
                provider_name="ollama",
                api_key=None,
                model_name="llama3.2:latest",
            ),
            Conversation(
                id="conversation-1",
                workspace_id="workspace-1",
                provider_account_id="voice-provider-1",
                provider_conversation_id="external-1",
            ),
            ConversationTurn(
                conversation_id="conversation-1",
                role="user",
                text="Hello",
                turn_order=0,
            ),
            ConversationEvaluationRun(
                id="run-1",
                workspace_id="workspace-1",
                conversation_id="conversation-1",
                provider_name="ollama",
                provider_model="llama3.2:latest",
                status="queued",
            ),
        ]
    )
    db.commit()

    class TimeoutProvider:
        def evaluate_conversation(self, transcript: str, context: dict) -> list[dict]:
            raise OllamaTimeoutError("Ollama model load timed out")

    monkeypatch.setattr(evaluation_service, "_get_provider", lambda **kwargs: TimeoutProvider())
    evaluation_service.run_evaluation_job(db, {"evaluation_run_id": "run-1"})

    run = db.get(ConversationEvaluationRun, "run-1")
    assert run is not None
    assert run.status == "failed"
    assert run.error_message == "Ollama model load timed out"
