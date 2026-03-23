"""Groq LLM client — uses OpenAI-compatible SDK with retry logic."""

from __future__ import annotations

import logging
import time
from typing import Any

from openai import OpenAI, APIError, APIConnectionError, RateLimitError  # type: ignore

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None

# Retry config
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0  # seconds — exponential: 1s, 2s, 4s


def get_groq_client() -> OpenAI:
    """Return a singleton Groq client (OpenAI-compatible)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = OpenAI(
            api_key=settings.groq_api_key,
            base_url=settings.groq_base_url,
        )
    return _client


def _call_with_retry(client: OpenAI, kwargs: dict[str, Any]) -> Any:
    """Call the API with exponential backoff retry on transient errors."""
    last_exc = None
    for attempt in range(MAX_RETRIES):
        try:
            return client.chat.completions.create(**kwargs)
        except RateLimitError as exc:
            last_exc = exc
            delay = RETRY_BASE_DELAY * (2 ** attempt)
            logger.warning(
                "Rate limited (attempt %d/%d). Retrying in %.1fs: %s",
                attempt + 1, MAX_RETRIES, delay, exc,
            )
            time.sleep(delay)
        except APIConnectionError as exc:
            last_exc = exc
            delay = RETRY_BASE_DELAY * (2 ** attempt)
            logger.warning(
                "Connection error (attempt %d/%d). Retrying in %.1fs: %s",
                attempt + 1, MAX_RETRIES, delay, exc,
            )
            time.sleep(delay)
        except APIError as exc:
            # Server errors (500, 502, 503) are retryable
            if exc.status_code and exc.status_code >= 500:
                last_exc = exc
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning(
                    "Server error %s (attempt %d/%d). Retrying in %.1fs",
                    exc.status_code, attempt + 1, MAX_RETRIES, delay,
                )
                time.sleep(delay)
            else:
                raise  # Client errors (400, 401, etc.) — don't retry
    raise last_exc  # type: ignore[misc]


def chat_completion(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> dict[str, Any]:
    """Send a chat completion request to Groq with retry + fallback.

    Retry order:
    1. Primary model with exponential backoff (up to 3 attempts)
    2. Fallback model (single attempt)

    Returns:
        {
            "content": str | None,
            "tool_calls": [...] | None,
            "tokens_used": int,
            "response_time_ms": int,
            "model": str,
        }
    """
    settings = get_settings()
    client = get_groq_client()

    model = model or settings.llm_model
    temperature = temperature if temperature is not None else settings.llm_temperature
    max_tokens = max_tokens or settings.llm_max_tokens

    start = time.perf_counter()

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    try:
        response = _call_with_retry(client, kwargs)
    except Exception as exc:
        logger.warning("Primary model %s failed after retries: %s. Trying fallback.", model, exc)
        # Retry with fallback model (single attempt)
        kwargs["model"] = settings.llm_model_fallback
        if tools:
            # Fallback model may not support tools — remove them
            kwargs.pop("tools", None)
            kwargs.pop("tool_choice", None)
        response = client.chat.completions.create(**kwargs)

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    choice = response.choices[0]
    message = choice.message

    logger.info(
        "LLM call: model=%s tokens=%s time=%dms",
        response.model,
        response.usage.total_tokens if response.usage else "?",
        elapsed_ms,
    )

    # Extract tool calls if present
    tool_calls = None
    if message.tool_calls:
        tool_calls = []
        for tc in message.tool_calls:
            tool_calls.append(
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
            )

    return {
        "content": message.content,
        "tool_calls": tool_calls,
        "tokens_used": response.usage.total_tokens if response.usage else 0,
        "response_time_ms": elapsed_ms,
        "model": response.model,
    }
