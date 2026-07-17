"""Tests for the X-Service-Key auth dependency.

Every non-health endpoint is protected. If this breaks silently, the AI
service is publicly callable — which would let anyone burn through our
Groq quota.
"""

from __future__ import annotations

from fastapi.testclient import TestClient  # type: ignore


class TestServiceKey:
    def test_missing_key_returns_422(self, client: TestClient):
        """FastAPI's Header(...) with no default returns 422 when missing."""
        response = client.post(
            "/api/v1/chat",
            json={
                "message": "hi",
                "conversation_id": 1,
                "user_context": {"user_id": 1},
            },
        )
        assert response.status_code == 422

    def test_wrong_key_returns_403(self, client: TestClient):
        response = client.post(
            "/api/v1/chat",
            headers={"X-Service-Key": "definitely-not-the-real-key"},
            json={
                "message": "hi",
                "conversation_id": 1,
                "user_context": {"user_id": 1},
            },
        )
        assert response.status_code == 403
        assert "Invalid service key" in response.json()["detail"]

    def test_health_is_not_protected(self, client: TestClient):
        """Health check must not require auth — used by docker healthcheck."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_openapi_is_not_protected(self, client: TestClient):
        response = client.get("/openapi.json")
        assert response.status_code == 200
