"""HTTP client for communicating with the FastAPI AI service."""

import logging
import time

import httpx  # type: ignore
from django.conf import settings  # type: ignore

logger = logging.getLogger(__name__)

AI_SERVICE_URL = getattr(settings, "AI_SERVICE_URL", "http://localhost:8001")
AI_SERVICE_KEY = getattr(settings, "AI_SERVICE_KEY", "artha-ai-service-key-change-in-production")

# Timeout: 30s for LLM to respond
TIMEOUT = httpx.Timeout(timeout=30.0, connect=5.0)


def call_ai_chat(payload: dict) -> dict:
    """Send a chat request to the AI service.

    Args:
        payload: ChatRequest dict matching the AI service's schema.

    Returns:
        ChatResponse dict: {reply, intent, actions, memory_updates, tokens_used, response_time_ms}

    Raises:
        AIServiceError: If the AI service is unreachable or returns an error.
    """
    url = f"{AI_SERVICE_URL}/api/v1/chat"
    headers = {"X-Service-Key": AI_SERVICE_KEY}

    start = time.perf_counter()

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            elapsed = int((time.perf_counter() - start) * 1000)
            logger.info(
                "AI service responded in %dms | tokens=%d",
                elapsed,
                response.json().get("tokens_used", 0),
            )
            return response.json()

    except httpx.ConnectError:
        logger.error("AI service unreachable at %s", url)
        return _fallback_response(
            "I'm having trouble connecting to my AI brain. Please try again in a moment."
        )

    except httpx.TimeoutException:
        logger.error("AI service timeout after 30s")
        return _fallback_response("My response took too long. Please try a simpler question.")

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        logger.error("AI service error: %s %s", status_code, exc.response.text[:200])
        if status_code == 429:
            # Rate limited — forward the message
            try:
                detail = exc.response.json().get("detail", "")
            except Exception:
                detail = ""
            return _fallback_response(
                detail or "You're sending messages too quickly. Please slow down a bit."
            )
        return _fallback_response("Something went wrong on my end. Please try again.")


def _fallback_response(message: str) -> dict:
    """Return a safe fallback when AI service is unavailable."""
    return {
        "reply": message,
        "intent": "general",
        "actions": [],
        "memory_updates": [],
        "tokens_used": 0,
        "response_time_ms": 0,
    }
