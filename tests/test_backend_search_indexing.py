from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app


def test_backend_responses_prevent_search_indexing() -> None:
    client = TestClient(app)

    for path in ("/docs", "/openapi.json", "/health/live", "/missing"):
        response = client.get(path)
        assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
