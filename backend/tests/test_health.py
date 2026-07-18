"""Smoke tests for the FastAPI application wiring.

These don't touch the database — they only verify the app boots and the
health endpoints used by Azure Container Apps probes respond correctly.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_liveness_ok() -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_ok() -> None:
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_health_responses_are_not_indexed() -> None:
    response = client.get("/health/live")
    assert response.headers["x-robots-tag"] == "noindex, nofollow"
