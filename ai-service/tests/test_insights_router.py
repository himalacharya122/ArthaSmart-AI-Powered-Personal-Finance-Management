"""Integration tests for insights/anomaly/memory routers.

Services are patched so no LLM is hit. We verify auth + request wiring
for each of the 3 endpoints.
"""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient  # type: ignore

from app.schemas.insights import (
    AnomalyCheckResponse,
    InsightItem,
    InsightResponse,
    MemoryUpdateResponse,
)


class TestInsightsEndpoint:
    def test_missing_key_returns_422(self, client: TestClient):
        r = client.post("/api/v1/insights/generate", json={"user_id": 1})
        assert r.status_code == 422

    def test_wrong_key_returns_403(self, client: TestClient):
        r = client.post(
            "/api/v1/insights/generate",
            headers={"X-Service-Key": "nope"},
            json={"user_id": 1},
        )
        assert r.status_code == 403

    def test_success_returns_insights(self, client, auth_headers):
        fake = InsightResponse(
            insights=[
                InsightItem(
                    insight_type="suggestion",
                    severity="info",
                    title="Save more",
                    description="Try cooking at home.",
                )
            ],
            tokens_used=42,
        )
        with patch("app.routers.insights.generate_insights", return_value=fake) as mock:
            r = client.post(
                "/api/v1/insights/generate",
                headers=auth_headers,
                json={"user_id": 1, "first_name": "Himal"},
            )
        assert r.status_code == 200
        body = r.json()
        assert body["tokens_used"] == 42
        assert body["insights"][0]["title"] == "Save more"
        mock.assert_called_once()


class TestAnomalyEndpoint:
    def test_success(self, client, auth_headers):
        fake = AnomalyCheckResponse(
            is_anomaly=True,
            confidence=0.8,
            reason="huge outlier",
            suggestion="verify",
            tokens_used=10,
        )
        with patch("app.routers.insights.check_anomaly", return_value=fake) as mock:
            r = client.post(
                "/api/v1/anomaly/check",
                headers=auth_headers,
                json={
                    "expense_amount": 5000,
                    "expense_category": "Food",
                },
            )
        assert r.status_code == 200
        assert r.json()["is_anomaly"] is True
        mock.assert_called_once()

    def test_missing_key_returns_422(self, client: TestClient):
        r = client.post(
            "/api/v1/anomaly/check",
            json={"expense_amount": 100, "expense_category": "Food"},
        )
        assert r.status_code == 422


class TestMemoryEndpoint:
    def test_success(self, client, auth_headers):
        fake = MemoryUpdateResponse(
            financial_personality="balanced",
            spending_patterns={"avg_daily_spend": 500},
            new_facts=["fact-1"],
            conversation_summary="Balanced spender.",
            tokens_used=25,
        )
        with patch("app.routers.insights.analyze_and_update_memory", return_value=fake) as mock:
            r = client.post(
                "/api/v1/memory/analyze",
                headers=auth_headers,
                json={"user_id": 1},
            )
        assert r.status_code == 200
        assert r.json()["financial_personality"] == "balanced"
        mock.assert_called_once()
