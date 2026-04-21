"""Tests for groq_client — retry/fallback logic and tool_call transform.

This is load-bearing: every LLM path goes through chat_completion. If
retry semantics are wrong we hammer Groq on 429s, or drop on transient
network blips.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx  # type: ignore
import pytest  # type: ignore
from openai import APIConnectionError, APIError, RateLimitError  # type: ignore

from app.services import groq_client as gc


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    """Replace time.sleep so retries don't actually block."""
    monkeypatch.setattr(gc.time, "sleep", lambda _s: None)


def _make_response(content="ok", tool_calls=None, tokens=10, model="fake"):
    resp = MagicMock()
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = tool_calls
    resp.choices = [MagicMock(message=msg)]
    resp.usage = MagicMock(total_tokens=tokens)
    resp.model = model
    return resp


def _rate_limit_error():
    return RateLimitError(
        message="rate",
        response=httpx.Response(429, request=httpx.Request("POST", "https://x")),
        body=None,
    )


def _conn_error():
    return APIConnectionError(request=httpx.Request("POST", "https://x"))


def _api_error(status: int):
    exc = APIError(message="err", request=httpx.Request("POST", "https://x"), body=None)
    exc.status_code = status
    return exc


class TestRetry:
    def test_retries_on_rate_limit_then_succeeds(self):
        client = MagicMock()
        ok = _make_response("done")
        client.chat.completions.create.side_effect = [
            _rate_limit_error(),
            _rate_limit_error(),
            ok,
        ]
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            result = gc.chat_completion([{"role": "user", "content": "hi"}])
        assert result["content"] == "done"
        assert client.chat.completions.create.call_count == 3

    def test_retries_on_connection_error(self):
        client = MagicMock()
        client.chat.completions.create.side_effect = [_conn_error(), _make_response("ok")]
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            result = gc.chat_completion([{"role": "user", "content": "hi"}])
        assert result["content"] == "ok"
        assert client.chat.completions.create.call_count == 2

    def test_5xx_apierror_is_retried(self):
        client = MagicMock()
        client.chat.completions.create.side_effect = [_api_error(503), _make_response("ok")]
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            result = gc.chat_completion([{"role": "user", "content": "hi"}])
        assert result["content"] == "ok"

    def test_4xx_apierror_is_not_retried_falls_back(self):
        """A 400 from the primary → skip retries, try fallback model once."""
        client = MagicMock()
        # First call (primary) raises 400; second call (fallback) succeeds
        client.chat.completions.create.side_effect = [
            _api_error(400),
            _make_response("fallback-result"),
        ]
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            result = gc.chat_completion([{"role": "user", "content": "hi"}])
        assert result["content"] == "fallback-result"
        assert client.chat.completions.create.call_count == 2


class TestFallbackModel:
    def test_fallback_drops_tools(self):
        """Fallback model may not support tools — must be stripped from the kwargs."""
        client = MagicMock()
        # Primary fails all 3 retries on 5xx; fallback succeeds
        client.chat.completions.create.side_effect = [
            _api_error(503),
            _api_error(503),
            _api_error(503),
            _make_response("ok"),
        ]
        tools = [{"type": "function", "function": {"name": "x"}}]
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            gc.chat_completion([{"role": "user", "content": "hi"}], tools=tools)

        fallback_call_kwargs = client.chat.completions.create.call_args_list[-1].kwargs
        assert "tools" not in fallback_call_kwargs
        assert "tool_choice" not in fallback_call_kwargs


class TestToolChoiceAndResult:
    def test_tool_choice_auto_when_tools_passed(self):
        client = MagicMock()
        client.chat.completions.create.return_value = _make_response("ok")
        tools = [{"type": "function", "function": {"name": "x"}}]
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            gc.chat_completion([{"role": "user", "content": "hi"}], tools=tools)
        kwargs = client.chat.completions.create.call_args.kwargs
        assert kwargs["tool_choice"] == "auto"
        assert kwargs["tools"] == tools

    def test_no_tool_choice_when_no_tools(self):
        client = MagicMock()
        client.chat.completions.create.return_value = _make_response("ok")
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            gc.chat_completion([{"role": "user", "content": "hi"}])
        kwargs = client.chat.completions.create.call_args.kwargs
        assert "tools" not in kwargs
        assert "tool_choice" not in kwargs

    def test_tool_calls_transformed_to_dicts(self):
        client = MagicMock()
        tc = MagicMock()
        tc.id = "call_1"
        tc.function.name = "create_expense"
        tc.function.arguments = '{"amount": 500}'
        client.chat.completions.create.return_value = _make_response(content=None, tool_calls=[tc])
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            result = gc.chat_completion([{"role": "user", "content": "spent 500"}])
        assert result["tool_calls"] == [
            {
                "id": "call_1",
                "type": "function",
                "function": {"name": "create_expense", "arguments": '{"amount": 500}'},
            }
        ]
        assert result["content"] is None

    def test_result_includes_tokens_and_model(self):
        client = MagicMock()
        client.chat.completions.create.return_value = _make_response(tokens=123, model="llama-xyz")
        with patch("app.services.groq_client.get_groq_client", return_value=client):
            result = gc.chat_completion([{"role": "user", "content": "hi"}])
        assert result["tokens_used"] == 123
        assert result["model"] == "llama-xyz"
