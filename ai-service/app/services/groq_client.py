"""Groq LLM client — uses OpenAI-compatible SDK."""

from __future__ import annotations

import logging
import time
from typing import Any

from openai import OpenAI # type: ignore

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


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


def chat_completion(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> dict[str, Any]:
    """Send a chat completion request to Groq.

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
        response = client.chat.completions.create(**kwargs)
    except Exception as exc:
        logger.warning("Primary model %s failed: %s. Trying fallback.", model, exc)
        # Retry with fallback model
        kwargs["model"] = settings.llm_model_fallback
        if tools:
            # Fallback model may not support tools — remove them
            kwargs.pop("tools", None)
            kwargs.pop("tool_choice", None)
        response = client.chat.completions.create(**kwargs)

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    choice = response.choices[0]
    message = choice.message

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
