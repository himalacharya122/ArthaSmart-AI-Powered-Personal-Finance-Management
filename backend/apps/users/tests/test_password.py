"""Password change, reset request, and reset confirm."""

from __future__ import annotations

import pytest  # type: ignore
from django.contrib.auth.tokens import default_token_generator  # type: ignore
from django.core import mail  # type: ignore
from django.urls import reverse  # type: ignore
from django.utils.encoding import force_bytes  # type: ignore
from django.utils.http import urlsafe_base64_encode  # type: ignore

pytestmark = pytest.mark.django_db


CHANGE_URL = reverse("users:password-change")
RESET_URL = reverse("users:password-reset")
RESET_CONFIRM_URL = reverse("users:password-reset-confirm")


class TestPasswordChange:
    def test_success(self, authenticated_client, user):
        user.set_password("OldPass123!")
        user.save(update_fields=["password"])
        r = authenticated_client.post(
            CHANGE_URL,
            {
                "old_password": "OldPass123!",
                "new_password": "NewPass456!",
                "new_password_confirm": "NewPass456!",
            },
            format="json",
        )
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.check_password("NewPass456!")

    def test_wrong_old_password_rejected(self, authenticated_client, user):
        user.set_password("OldPass123!")
        user.save(update_fields=["password"])
        r = authenticated_client.post(
            CHANGE_URL,
            {
                "old_password": "WRONG",
                "new_password": "NewPass456!",
                "new_password_confirm": "NewPass456!",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_mismatched_confirm_rejected(self, authenticated_client, user):
        user.set_password("OldPass123!")
        user.save(update_fields=["password"])
        r = authenticated_client.post(
            CHANGE_URL,
            {
                "old_password": "OldPass123!",
                "new_password": "NewPass456!",
                "new_password_confirm": "Different!",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_weak_new_password_rejected(self, authenticated_client, user):
        user.set_password("OldPass123!")
        user.save(update_fields=["password"])
        r = authenticated_client.post(
            CHANGE_URL,
            {
                "old_password": "OldPass123!",
                "new_password": "12345678",
                "new_password_confirm": "12345678",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.post(CHANGE_URL, {}, format="json")
        assert r.status_code == 401


class TestPasswordResetRequest:
    def test_success_sends_email(self, api_client, user_factory, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        mail.outbox = []
        u = user_factory(email="reset@example.com")
        r = api_client.post(RESET_URL, {"email": u.email}, format="json")
        assert r.status_code == 200
        assert len(mail.outbox) == 1
        assert "reset" in mail.outbox[0].subject.lower()

    def test_unknown_email_returns_200(self, api_client):
        """Must not leak account existence."""
        r = api_client.post(RESET_URL, {"email": "ghost@example.com"}, format="json")
        assert r.status_code == 200

    def test_inactive_user_returns_200_without_email(self, api_client, user_factory, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        mail.outbox = []
        user_factory(email="dead@example.com", is_active=False)
        r = api_client.post(RESET_URL, {"email": "dead@example.com"}, format="json")
        assert r.status_code == 200
        assert len(mail.outbox) == 0

    def test_email_failure_returns_500(self, api_client, user_factory, monkeypatch):
        u = user_factory(email="fail@example.com")

        def boom(*a, **kw):
            raise RuntimeError("smtp down")

        monkeypatch.setattr("apps.users.views.send_mail", boom)
        r = api_client.post(RESET_URL, {"email": u.email}, format="json")
        assert r.status_code == 500


class TestPasswordResetConfirm:
    def _make_token(self, user):
        return {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }

    def test_success(self, api_client, user_factory):
        u = user_factory(email="confirm@example.com")
        payload = self._make_token(u)
        r = api_client.post(
            RESET_CONFIRM_URL,
            {
                **payload,
                "new_password": "BrandNewPass99!",
                "new_password_confirm": "BrandNewPass99!",
            },
            format="json",
        )
        assert r.status_code == 200
        u.refresh_from_db()
        assert u.check_password("BrandNewPass99!")

    def test_bad_uid_rejected(self, api_client, user_factory):
        u = user_factory()
        payload = self._make_token(u)
        r = api_client.post(
            RESET_CONFIRM_URL,
            {
                "uid": "xxxx",
                "token": payload["token"],
                "new_password": "BrandNewPass99!",
                "new_password_confirm": "BrandNewPass99!",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_bad_token_rejected(self, api_client, user_factory):
        u = user_factory()
        payload = self._make_token(u)
        r = api_client.post(
            RESET_CONFIRM_URL,
            {
                "uid": payload["uid"],
                "token": "invalid-token",
                "new_password": "BrandNewPass99!",
                "new_password_confirm": "BrandNewPass99!",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_mismatched_passwords_rejected(self, api_client, user_factory):
        u = user_factory()
        payload = self._make_token(u)
        r = api_client.post(
            RESET_CONFIRM_URL,
            {
                **payload,
                "new_password": "BrandNewPass99!",
                "new_password_confirm": "OtherPass99!",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_inactive_user_rejected(self, api_client, user_factory):
        u = user_factory(is_active=False)
        payload = self._make_token(u)
        r = api_client.post(
            RESET_CONFIRM_URL,
            {
                **payload,
                "new_password": "BrandNewPass99!",
                "new_password_confirm": "BrandNewPass99!",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_weak_password_rejected(self, api_client, user_factory):
        u = user_factory()
        payload = self._make_token(u)
        r = api_client.post(
            RESET_CONFIRM_URL,
            {
                **payload,
                "new_password": "short",
                "new_password_confirm": "short",
            },
            format="json",
        )
        assert r.status_code == 400
