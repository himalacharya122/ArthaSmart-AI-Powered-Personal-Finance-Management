"""Register + verify-email + resend endpoints."""

from __future__ import annotations

import pytest  # type: ignore
from django.core import mail  # type: ignore
from django.urls import reverse  # type: ignore

from apps.users.models import EmailVerification, User

pytestmark = pytest.mark.django_db


REGISTER_URL = reverse("users:register")
VERIFY_URL = reverse("users:verify-email")
RESEND_URL = reverse("users:resend-verification")


def _payload(**overrides):
    data = {
        "email": "new@example.com",
        "username": "newuser",
        "first_name": "New",
        "last_name": "User",
        "password": "StrongPass!234",
        "password_confirm": "StrongPass!234",
    }
    data.update(overrides)
    return data


class TestRegister:
    def test_success_creates_user_and_sends_email(self, api_client, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        mail.outbox = []
        r = api_client.post(REGISTER_URL, _payload(), format="json")
        assert r.status_code == 201
        assert r.data["email"] == "new@example.com"
        assert User.objects.filter(email="new@example.com").exists()
        user = User.objects.get(email="new@example.com")
        assert user.is_email_verified is False
        assert EmailVerification.objects.filter(user=user, is_used=False).exists()
        assert len(mail.outbox) == 1
        assert "verification code" in mail.outbox[0].body.lower()

    def test_email_lowercased(self, api_client):
        r = api_client.post(REGISTER_URL, _payload(email="MIXED@Example.COM"), format="json")
        assert r.status_code == 201
        assert User.objects.filter(email="mixed@example.com").exists()

    def test_password_mismatch_rejected(self, api_client):
        r = api_client.post(REGISTER_URL, _payload(password_confirm="different123"), format="json")
        assert r.status_code == 400

    def test_weak_password_rejected(self, api_client):
        r = api_client.post(
            REGISTER_URL,
            _payload(password="12345678", password_confirm="12345678"),
            format="json",
        )
        assert r.status_code == 400

    def test_short_password_rejected(self, api_client):
        r = api_client.post(
            REGISTER_URL, _payload(password="abc", password_confirm="abc"), format="json"
        )
        assert r.status_code == 400

    def test_duplicate_email_rejected(self, api_client, user_factory):
        user_factory(email="dup@example.com")
        r = api_client.post(REGISTER_URL, _payload(email="dup@example.com"), format="json")
        assert r.status_code == 400

    def test_email_failure_still_returns_201(self, api_client, settings, monkeypatch):
        """Email backend errors shouldn't roll back user creation."""
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

        def boom(*a, **kw):
            raise RuntimeError("smtp down")

        monkeypatch.setattr("apps.users.views.send_mail", boom)
        r = api_client.post(REGISTER_URL, _payload(), format="json")
        assert r.status_code == 201
        assert User.objects.filter(email="new@example.com").exists()


class TestVerifyEmail:
    def test_success_marks_verified(self, api_client, user_factory):
        u = user_factory(is_email_verified=False)
        v = EmailVerification.create_for_user(u)
        r = api_client.post(VERIFY_URL, {"email": u.email, "code": v.code}, format="json")
        assert r.status_code == 200
        u.refresh_from_db()
        assert u.is_email_verified is True
        v.refresh_from_db()
        assert v.is_used is True

    def test_wrong_code_rejected(self, api_client, user_factory):
        u = user_factory(is_email_verified=False)
        EmailVerification.create_for_user(u)
        r = api_client.post(VERIFY_URL, {"email": u.email, "code": "999999"}, format="json")
        assert r.status_code == 400

    def test_unknown_email_rejected(self, api_client):
        r = api_client.post(
            VERIFY_URL, {"email": "ghost@example.com", "code": "123456"}, format="json"
        )
        assert r.status_code == 400

    def test_already_verified_returns_200(self, api_client, user_factory):
        u = user_factory(is_email_verified=True)
        r = api_client.post(VERIFY_URL, {"email": u.email, "code": "123456"}, format="json")
        assert r.status_code == 200
        assert "already verified" in r.data["detail"].lower()

    def test_expired_code_rejected(self, api_client, user_factory):
        from django.utils import timezone  # type: ignore

        u = user_factory(is_email_verified=False)
        v = EmailVerification.create_for_user(u)
        v.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        v.save(update_fields=["expires_at"])
        r = api_client.post(VERIFY_URL, {"email": u.email, "code": v.code}, format="json")
        assert r.status_code == 400
        assert "expired" in r.data["detail"].lower()

    def test_used_code_rejected(self, api_client, user_factory):
        u = user_factory(is_email_verified=False)
        v = EmailVerification.create_for_user(u)
        v.is_used = True
        v.save(update_fields=["is_used"])
        r = api_client.post(VERIFY_URL, {"email": u.email, "code": v.code}, format="json")
        assert r.status_code == 400

    def test_code_wrong_length_rejected(self, api_client, user_factory):
        u = user_factory(is_email_verified=False)
        r = api_client.post(VERIFY_URL, {"email": u.email, "code": "123"}, format="json")
        assert r.status_code == 400


class TestResendVerification:
    def test_success_sends_new_code(self, api_client, user_factory, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        mail.outbox = []
        u = user_factory(is_email_verified=False)
        r = api_client.post(RESEND_URL, {"email": u.email}, format="json")
        assert r.status_code == 200
        assert EmailVerification.objects.filter(user=u, is_used=False).count() == 1
        assert len(mail.outbox) == 1

    def test_unknown_email_returns_200(self, api_client):
        """Must not leak account existence."""
        r = api_client.post(RESEND_URL, {"email": "ghost@example.com"}, format="json")
        assert r.status_code == 200

    def test_already_verified_returns_200(self, api_client, user_factory):
        u = user_factory(is_email_verified=True)
        r = api_client.post(RESEND_URL, {"email": u.email}, format="json")
        assert r.status_code == 200
        assert "already verified" in r.data["detail"].lower()

    def test_email_failure_returns_500(self, api_client, user_factory, monkeypatch):
        u = user_factory(is_email_verified=False)

        def boom(*a, **kw):
            raise RuntimeError("smtp down")

        monkeypatch.setattr("apps.users.views.send_mail", boom)
        r = api_client.post(RESEND_URL, {"email": u.email}, format="json")
        assert r.status_code == 500
