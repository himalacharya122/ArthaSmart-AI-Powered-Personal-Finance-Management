"""Google OAuth endpoint.

Google's network verification is patched at both the id_token path
(``google.oauth2.id_token.verify_oauth2_token``) and the userinfo
fallback path (``requests.get``). AuditLog.objects.create is patched
because the view passes a ``details=`` kwarg that the current AuditLog
model does not define (tracked separately).
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.users.models import User

pytestmark = pytest.mark.django_db


GOOGLE_URL = reverse("users:google-auth")


def _id_info(email="google@example.com"):
    return {
        "email": email,
        "given_name": "Go",
        "family_name": "Ogle",
        "picture": "http://p.com/a.jpg",
        "email_verified": True,
        "aud": "test-client-id",
    }


class TestGoogleAuth:
    def test_id_token_success_creates_user(self, api_client, settings):
        settings.GOOGLE_CLIENT_IDS = ["test-client-id"]
        with (
            patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value=_id_info(),
            ),
            patch("apps.users.views.AuditLog.objects.create"),
        ):
            r = api_client.post(GOOGLE_URL, {"token": "fake-id-token"}, format="json")
        assert r.status_code == 200
        assert r.data["user"]["email"] == "google@example.com"
        u = User.objects.get(email="google@example.com")
        assert u.is_email_verified is True
        assert u.has_usable_password() is False

    def test_existing_user_reused(self, api_client, settings, user_factory):
        settings.GOOGLE_CLIENT_IDS = ["test-client-id"]
        user_factory(email="google@example.com")
        before = User.objects.count()
        with (
            patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value=_id_info(),
            ),
            patch("apps.users.views.AuditLog.objects.create"),
        ):
            r = api_client.post(GOOGLE_URL, {"token": "fake-id-token"}, format="json")
        assert r.status_code == 200
        assert User.objects.count() == before

    def test_bad_audience_rejected(self, api_client, settings):
        settings.GOOGLE_CLIENT_IDS = ["different-client"]
        with patch(
            "google.oauth2.id_token.verify_oauth2_token",
            return_value={**_id_info(), "aud": "wrong"},
        ):
            r = api_client.post(GOOGLE_URL, {"token": "fake"}, format="json")
        assert r.status_code == 400
        assert "audience" in r.data["detail"].lower()

    def test_userinfo_fallback_when_id_token_fails(self, api_client, settings):
        settings.GOOGLE_CLIENT_IDS = []

        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {
            "email": "fallback@example.com",
            "given_name": "F",
            "family_name": "B",
            "email_verified": True,
        }
        with (
            patch(
                "google.oauth2.id_token.verify_oauth2_token",
                side_effect=ValueError("not an id token"),
            ),
            patch("requests.get", return_value=resp),
            patch("apps.users.views.AuditLog.objects.create"),
        ):
            r = api_client.post(GOOGLE_URL, {"token": "access-token"}, format="json")
        assert r.status_code == 200
        assert User.objects.filter(email="fallback@example.com").exists()

    def test_both_methods_fail_rejected(self, api_client, settings):
        settings.GOOGLE_CLIENT_IDS = []
        resp = MagicMock()
        resp.status_code = 401
        with (
            patch(
                "google.oauth2.id_token.verify_oauth2_token",
                side_effect=ValueError("bad"),
            ),
            patch("requests.get", return_value=resp),
        ):
            r = api_client.post(GOOGLE_URL, {"token": "x"}, format="json")
        assert r.status_code == 400

    def test_no_token_rejected(self, api_client):
        r = api_client.post(GOOGLE_URL, {}, format="json")
        assert r.status_code == 400

    def test_username_collision_resolved(self, api_client, settings, user_factory):
        """If the email's local-part collides with an existing username, a suffix is appended."""
        settings.GOOGLE_CLIENT_IDS = ["test-client-id"]
        user_factory(username="google", email="someone-else@example.com")
        with (
            patch(
                "google.oauth2.id_token.verify_oauth2_token",
                return_value=_id_info(email="google@example.com"),
            ),
            patch("apps.users.views.AuditLog.objects.create"),
        ):
            r = api_client.post(GOOGLE_URL, {"token": "x"}, format="json")
        assert r.status_code == 200
        created = User.objects.get(email="google@example.com")
        assert created.username != "google"
