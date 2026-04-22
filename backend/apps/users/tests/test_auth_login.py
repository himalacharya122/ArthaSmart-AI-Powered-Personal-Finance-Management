"""Login, logout, and token refresh endpoints."""

from __future__ import annotations

import pytest  # type: ignore
from django.urls import reverse  # type: ignore
from rest_framework_simplejwt.tokens import RefreshToken  # type: ignore

pytestmark = pytest.mark.django_db


LOGIN_URL = reverse("users:login")
LOGOUT_URL = reverse("users:logout")
REFRESH_URL = reverse("users:token-refresh")


class TestLogin:
    def test_success_returns_tokens(self, api_client, user_factory):
        user_factory(email="login@example.com", password="TestPass123!")
        r = api_client.post(
            LOGIN_URL,
            {"email": "login@example.com", "password": "TestPass123!"},
            format="json",
        )
        assert r.status_code == 200
        assert "access" in r.data["tokens"]
        assert "refresh" in r.data["tokens"]
        assert r.data["user"]["email"] == "login@example.com"

    def test_email_case_insensitive(self, api_client, user_factory):
        user_factory(email="case@example.com", password="TestPass123!")
        r = api_client.post(
            LOGIN_URL,
            {"email": "CASE@Example.com", "password": "TestPass123!"},
            format="json",
        )
        assert r.status_code == 200

    def test_wrong_password_rejected(self, api_client, user_factory):
        user_factory(email="u@example.com", password="TestPass123!")
        r = api_client.post(
            LOGIN_URL, {"email": "u@example.com", "password": "wrong"}, format="json"
        )
        assert r.status_code == 400

    def test_unknown_email_rejected(self, api_client):
        r = api_client.post(
            LOGIN_URL, {"email": "ghost@example.com", "password": "x"}, format="json"
        )
        assert r.status_code == 400

    def test_inactive_account_rejected(self, api_client, user_factory):
        user_factory(email="inactive@example.com", password="TestPass123!", is_active=False)
        r = api_client.post(
            LOGIN_URL,
            {"email": "inactive@example.com", "password": "TestPass123!"},
            format="json",
        )
        assert r.status_code == 400

    def test_unverified_email_rejected_with_code(self, api_client, user_factory):
        user_factory(
            email="unverified@example.com",
            password="TestPass123!",
            is_email_verified=False,
        )
        r = api_client.post(
            LOGIN_URL,
            {"email": "unverified@example.com", "password": "TestPass123!"},
            format="json",
        )
        assert r.status_code == 400
        # Code is nested inside validation detail
        body = str(r.data)
        assert "EMAIL_NOT_VERIFIED" in body

    def test_missing_fields_rejected(self, api_client):
        r = api_client.post(LOGIN_URL, {"email": "x@x.com"}, format="json")
        assert r.status_code == 400

    def test_audit_log_written_on_success(self, api_client, user_factory):
        from apps.reports.models import AuditLog

        user_factory(email="a@example.com", password="TestPass123!")
        api_client.post(
            LOGIN_URL, {"email": "a@example.com", "password": "TestPass123!"}, format="json"
        )
        assert AuditLog.objects.filter(action="login", resource_type="user").exists()


class TestLogout:
    def test_blacklists_refresh_token(self, authenticated_client, user):
        refresh = str(RefreshToken.for_user(user))
        r = authenticated_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
        assert r.status_code == 205
        # Re-use should now fail
        api = authenticated_client
        r2 = api.post(LOGOUT_URL, {"refresh": refresh}, format="json")
        assert r2.status_code == 400

    def test_invalid_token_returns_400(self, authenticated_client):
        r = authenticated_client.post(LOGOUT_URL, {"refresh": "not-a-token"}, format="json")
        assert r.status_code == 400

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.post(LOGOUT_URL, {"refresh": "x"}, format="json")
        assert r.status_code == 401

    def test_missing_refresh_rejected(self, authenticated_client):
        r = authenticated_client.post(LOGOUT_URL, {}, format="json")
        assert r.status_code == 400


class TestTokenRefresh:
    def test_returns_new_access_token(self, api_client, user):
        refresh = str(RefreshToken.for_user(user))
        r = api_client.post(REFRESH_URL, {"refresh": refresh}, format="json")
        assert r.status_code == 200
        assert "access" in r.data

    def test_invalid_refresh_rejected(self, api_client):
        r = api_client.post(REFRESH_URL, {"refresh": "garbage"}, format="json")
        assert r.status_code == 401
