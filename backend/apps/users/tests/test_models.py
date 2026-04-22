"""Tests for the custom User model and EmailVerification OTP lifecycle."""

from __future__ import annotations

import pytest  # type: ignore
from django.utils import timezone  # type: ignore
from freezegun import freeze_time  # type: ignore

from apps.users.models import EmailVerification, User

pytestmark = pytest.mark.django_db


class TestUserModel:
    def test_email_is_username_field(self):
        assert User.USERNAME_FIELD == "email"

    def test_defaults(self, user_factory):
        u = user_factory()
        assert u.preferred_currency == "NPR"
        assert u.timezone == "Asia/Kathmandu"
        assert u.two_factor_enabled is False

    def test_email_must_be_unique(self, user_factory):
        user_factory(email="dup@example.com")
        with pytest.raises(Exception):  # IntegrityError
            User.objects.create_user(email="dup@example.com", username="dup2", password="x")

    def test_str_is_email(self, user_factory):
        u = user_factory(email="hello@example.com")
        assert str(u) == "hello@example.com"


class TestEmailVerification:
    def test_generate_code_is_six_digits(self):
        code = EmailVerification.generate_code()
        assert len(code) == 6
        assert code.isdigit()

    def test_create_for_user_sets_15_min_expiry(self, user_factory):
        u = user_factory()
        before = timezone.now()
        v = EmailVerification.create_for_user(u)
        delta = v.expires_at - before
        assert 14 * 60 < delta.total_seconds() < 16 * 60

    def test_create_for_user_invalidates_old_codes(self, user_factory):
        u = user_factory()
        old = EmailVerification.create_for_user(u)
        EmailVerification.create_for_user(u)
        old.refresh_from_db()
        assert old.is_used is True

    def test_is_expired_false_when_fresh(self, user_factory):
        u = user_factory()
        v = EmailVerification.create_for_user(u)
        assert v.is_expired is False

    def test_is_expired_true_after_15_minutes(self, user_factory):
        u = user_factory()
        with freeze_time("2026-01-01 00:00:00"):
            v = EmailVerification.create_for_user(u)
        with freeze_time("2026-01-01 00:16:00"):
            assert v.is_expired is True

    def test_generate_code_uniqueness_is_reasonable(self):
        """Not guaranteed unique, but 100 codes shouldn't all collide."""
        codes = {EmailVerification.generate_code() for _ in range(100)}
        assert len(codes) > 50
