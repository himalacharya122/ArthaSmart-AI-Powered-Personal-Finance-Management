"""In-memory per-user rate limiter for the AI service.

Uses a simple sliding window counter. In production, this would
be backed by Redis, but for our scale this is sufficient.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import HTTPException, status  # type: ignore

from app.config import get_settings


@dataclass
class _UserWindow:
    """Sliding window for a single user."""
    timestamps: list[float] = field(default_factory=list)

    def count_in_window(self, window_seconds: float) -> int:
        """Count requests within the last `window_seconds`."""
        cutoff = time.time() - window_seconds
        # Prune old entries
        self.timestamps = [t for t in self.timestamps if t > cutoff]
        return len(self.timestamps)

    def record(self):
        self.timestamps.append(time.time())


class RateLimiter:
    """Per-user rate limiter with minute and daily windows."""

    def __init__(self):
        self._chat_windows: dict[int, _UserWindow] = defaultdict(_UserWindow)
        self._voice_windows: dict[int, _UserWindow] = defaultdict(_UserWindow)

    def check_chat(self, user_id: int):
        """Check if user can send a chat message. Raises 429 if over limit."""
        settings = get_settings()
        window = self._chat_windows[user_id]

        # Per-minute check
        per_min = window.count_in_window(60)
        if per_min >= settings.user_messages_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {settings.user_messages_per_minute} messages per minute. Please slow down.",
            )

        # Per-day check
        per_day = window.count_in_window(86400)
        if per_day >= settings.user_messages_per_day:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily limit reached: {settings.user_messages_per_day} messages per day. Try again tomorrow.",
            )

        window.record()

    def check_voice(self, user_id: int):
        """Check if user can make a voice request. Raises 429 if over limit."""
        settings = get_settings()
        window = self._voice_windows[user_id]

        per_day = window.count_in_window(86400)
        if per_day >= settings.user_voice_per_day:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily voice limit reached: {settings.user_voice_per_day} transcriptions per day.",
            )

        window.record()


# Singleton instance
rate_limiter = RateLimiter()
