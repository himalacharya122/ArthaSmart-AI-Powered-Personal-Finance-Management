"""Smoke tests — prove the FastAPI app boots and exposes a healthcheck.

These are intentionally minimal. Real unit/integration tests will be added
as the service matures. Their job is to make CI meaningful today.
"""

from fastapi.testclient import TestClient  # type: ignore

from app.main import app

client = TestClient(app)


def test_app_factory_builds():
    """Importing the app must not raise; the title should be set."""
    assert app.title == "ArthaSmart AI Service"


def test_health_endpoint():
    """The /health endpoint (registered by the health router) should 200."""
    response = client.get("/health")
    assert response.status_code == 200


def test_openapi_schema_served():
    """FastAPI auto-generates /openapi.json; proves routing is wired up."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "ArthaSmart AI Service"
