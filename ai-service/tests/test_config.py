"""Tests for app.config.Settings.

Settings is the single source of truth for all env-configurable values.
These tests prove defaults are sensible, env overrides work, and
get_settings() actually caches.
"""

from __future__ import annotations

import pytest  # type: ignore

from app.config import Settings, get_settings


class TestSettingsDefaults:
    """Defaults must stay sensible — if someone bumps a default, CI catches it."""

    def test_llm_model_default(self):
        s = Settings()
        assert s.llm_model == "llama-3.3-70b-versatile"

    def test_fallback_model_differs_from_primary(self):
        s = Settings()
        assert s.llm_model_fallback != s.llm_model, (
            "Fallback must differ from primary, otherwise retries hit the same " "failing model"
        )

    def test_rate_limits_are_positive(self):
        s = Settings()
        assert s.user_messages_per_minute > 0
        assert s.user_messages_per_day > 0
        assert s.user_voice_per_day > 0

    def test_daily_limit_at_least_minute_limit(self):
        s = Settings()
        # daily must accommodate at least one full minute's worth
        assert s.user_messages_per_day >= s.user_messages_per_minute

    def test_default_port_is_8001(self):
        """Port 8001 is baked into Dockerfile, compose, and Django's AI_SERVICE_URL."""
        s = Settings()
        assert s.port == 8001

    def test_default_currency_handling_in_max_tokens(self):
        s = Settings()
        assert 256 <= s.llm_max_tokens <= 4096

    def test_default_temperature_in_valid_range(self):
        s = Settings()
        assert 0.0 <= s.llm_temperature <= 1.0


class TestSettingsEnvOverride:
    """Env vars should override defaults."""

    def test_env_override_llm_model(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("LLM_MODEL", "test-override-model")
        s = Settings()
        assert s.llm_model == "test-override-model"

    def test_env_override_rate_limit(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("USER_MESSAGES_PER_MINUTE", "999")
        s = Settings()
        assert s.user_messages_per_minute == 999


class TestGetSettingsCache:
    def test_get_settings_returns_same_instance(self):
        assert (
            get_settings() is get_settings()
        ), "get_settings is lru_cached; identity must be preserved"
