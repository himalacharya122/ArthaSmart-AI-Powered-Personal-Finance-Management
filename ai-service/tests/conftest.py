"""Shared pytest fixtures for the AI service test suite.

Everything external (Groq LLM, Whisper STT) is mocked. Tests should never
make a real network call. The fixtures in here are the primary tools for
doing so.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any
from unittest.mock import MagicMock, patch

import pytest  # type: ignore
from fastapi.testclient import TestClient  # type: ignore

from app.config import get_settings
from app.core.rate_limiter import RateLimiter, rate_limiter
from app.main import app

# Client + auth


@pytest.fixture()
def client() -> TestClient:
    """A TestClient bound to the real FastAPI app."""
    return TestClient(app)


@pytest.fixture()
def service_key() -> str:
    """The service secret key the API expects on protected routes."""
    return get_settings().service_secret_key


@pytest.fixture()
def auth_headers(service_key: str) -> dict[str, str]:
    """Ready-made headers for calling a protected endpoint."""
    return {"X-Service-Key": service_key}


# Rate limiter isolation
#
# The real `rate_limiter` is a module-level singleton. Tests that hit /chat
# or /voice/transcribe share state otherwise, so we reset it between tests.


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> Iterator[None]:
    rate_limiter._chat_windows.clear()
    rate_limiter._voice_windows.clear()
    yield
    rate_limiter._chat_windows.clear()
    rate_limiter._voice_windows.clear()


@pytest.fixture()
def fresh_rate_limiter() -> RateLimiter:
    """A new rate limiter instance — useful when testing the class directly."""
    return RateLimiter()


# Groq LLM mocks


def _make_llm_result(
    content: str | None = "Hello!",
    tool_calls: list[dict] | None = None,
    tokens: int = 100,
) -> dict[str, Any]:
    """Shape a fake `chat_completion` return value."""
    return {
        "content": content,
        "tool_calls": tool_calls,
        "tokens_used": tokens,
        "response_time_ms": 42,
        "model": "fake-model",
    }


@pytest.fixture()
def mock_chat_completion():
    """Patch `chat_completion` wherever it's imported so no LLM call is made.

    Yields the mock so tests can assert call count / args or change its
    return value.
    """
    with patch("app.routers.chat.chat_completion") as chat_mock:
        chat_mock.return_value = _make_llm_result()
        yield chat_mock


@pytest.fixture()
def make_llm_result():
    """Factory for crafting LLM responses in tests."""
    return _make_llm_result


@pytest.fixture()
def mock_groq_raw():
    """Patch `get_groq_client()` to return a MagicMock.

    Use this when the code under test calls `client.chat.completions.create`
    directly (anomaly detector, insight engine, memory manager, STT).
    """
    client = MagicMock()
    with (
        patch("app.services.anomaly_detector.get_groq_client", return_value=client),
        patch("app.services.insight_engine.get_groq_client", return_value=client),
        patch("app.services.memory_manager.get_groq_client", return_value=client),
        patch("app.services.speech_to_text.get_groq_client", return_value=client),
    ):
        yield client


def make_openai_response(content: str, tokens: int = 50) -> MagicMock:
    """Shape a fake response matching the OpenAI Python SDK object graph."""
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message = MagicMock()
    response.choices[0].message.content = content
    response.choices[0].message.tool_calls = None
    response.usage = MagicMock()
    response.usage.total_tokens = tokens
    response.model = "fake-model"
    return response


@pytest.fixture()
def openai_response_factory():
    """Expose `make_openai_response` for tests that need to craft multiple."""
    return make_openai_response
