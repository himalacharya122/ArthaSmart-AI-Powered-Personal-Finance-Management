"""Tests for the per-user rate limiter.

Critical because it sits in front of every LLM call. If it breaks open, a
single abusive user could drain the Groq quota.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest  # type: ignore
from fastapi import HTTPException  # type: ignore

from app.config import get_settings
from app.core.rate_limiter import RateLimiter, _UserWindow


class TestUserWindow:
    def test_new_window_is_empty(self):
        w = _UserWindow()
        assert w.count_in_window(60) == 0

    def test_record_increments_count(self):
        w = _UserWindow()
        w.record()
        assert w.count_in_window(60) == 1

    def test_old_entries_are_pruned(self):
        """Timestamps outside the window are dropped on count."""
        w = _UserWindow()
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1_000.0
            w.record()
            mock_time.return_value = 2_000.0  # 1000s later, outside 60s window
            assert w.count_in_window(60) == 0
            # and pruning is persistent
            assert w.timestamps == []


class TestChatRateLimit:
    def test_within_limit_does_not_raise(self, fresh_rate_limiter: RateLimiter):
        limit = get_settings().user_messages_per_minute
        for _ in range(limit):
            fresh_rate_limiter.check_chat(user_id=1)

    def test_exceeding_per_minute_raises_429(self, fresh_rate_limiter: RateLimiter):
        limit = get_settings().user_messages_per_minute
        for _ in range(limit):
            fresh_rate_limiter.check_chat(user_id=1)
        with pytest.raises(HTTPException) as exc:
            fresh_rate_limiter.check_chat(user_id=1)
        assert exc.value.status_code == 429
        assert "per minute" in exc.value.detail

    def test_limits_are_per_user(self, fresh_rate_limiter: RateLimiter):
        """User A hitting the limit must not block User B."""
        limit = get_settings().user_messages_per_minute
        for _ in range(limit):
            fresh_rate_limiter.check_chat(user_id=1)
        # User 2 is completely fresh
        fresh_rate_limiter.check_chat(user_id=2)

    def test_per_day_limit_raises_429(
        self, fresh_rate_limiter: RateLimiter, monkeypatch: pytest.MonkeyPatch
    ):
        """Simulate a user who spreads calls across the day but exceeds daily cap."""
        # Tighten to a small daily cap to keep the test fast.
        monkeypatch.setattr(
            get_settings(),
            "user_messages_per_day",
            3,
            raising=False,
        )
        # Also loosen the minute cap so it doesn't trip first.
        monkeypatch.setattr(
            get_settings(),
            "user_messages_per_minute",
            1000,
            raising=False,
        )
        for _ in range(3):
            fresh_rate_limiter.check_chat(user_id=1)
        with pytest.raises(HTTPException) as exc:
            fresh_rate_limiter.check_chat(user_id=1)
        assert exc.value.status_code == 429
        assert "Daily" in exc.value.detail


class TestVoiceRateLimit:
    def test_voice_daily_cap(
        self, fresh_rate_limiter: RateLimiter, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr(get_settings(), "user_voice_per_day", 2, raising=False)
        fresh_rate_limiter.check_voice(user_id=1)
        fresh_rate_limiter.check_voice(user_id=1)
        with pytest.raises(HTTPException) as exc:
            fresh_rate_limiter.check_voice(user_id=1)
        assert exc.value.status_code == 429
        assert "voice" in exc.value.detail.lower()

    def test_chat_and_voice_windows_are_independent(self, fresh_rate_limiter: RateLimiter):
        fresh_rate_limiter.check_voice(user_id=1)
        # Chat window for user 1 should still be empty
        assert fresh_rate_limiter._chat_windows[1].count_in_window(60) == 0
