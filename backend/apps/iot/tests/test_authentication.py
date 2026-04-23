"""DeviceAPIKeyAuthentication — header parsing, expiry, drift."""

from __future__ import annotations

import time
from datetime import timedelta

import pytest  # type: ignore
from django.urls import reverse  # type: ignore
from django.utils import timezone  # type: ignore

from apps.iot.models import IoTDevice

pytestmark = pytest.mark.django_db

# We use /iot/ingest/nfc-tap/ as a stand-in for "any endpoint protected by
# DeviceAPIKeyAuthentication" — the tap endpoint is the simplest payload
# to assemble in tests (no binary file upload). The auth behaviour we're
# checking is identical to the receipt endpoint.
NFC_INGEST = reverse("iot:ingest-nfc-tap")


def _device(user, **kw):
    defaults = {
        "name": "Auth Test",
        "device_type": "nfc_logger",
        "device_id": f"auth-dev-{id(user)}",
        "api_key": f"ask_iot_auth_{id(user)}",
    }
    defaults.update(kw)
    return IoTDevice.objects.create(user=user, **defaults)


class TestMissingOrBadKey:
    def test_no_header_returns_401(self, api_client):
        r = api_client.post(NFC_INGEST, {"tag_uid": "x"}, format="json")
        assert r.status_code == 401

    def test_unknown_key_returns_401(self, api_client):
        r = api_client.post(
            NFC_INGEST,
            {"tag_uid": "x"},
            format="json",
            HTTP_X_DEVICE_API_KEY="ask_iot_nope",
        )
        assert r.status_code == 401


class TestKeyLifecycle:
    def test_disabled_device_rejected(self, api_client, user):
        d = _device(user, is_active=False)
        r = api_client.post(
            NFC_INGEST,
            {"tag_uid": "x"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 401

    def test_expired_key_rejected(self, api_client, user):
        d = _device(user, api_key_expires_at=timezone.now() - timedelta(days=1))
        r = api_client.post(
            NFC_INGEST,
            {"tag_uid": "x"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 401

    def test_valid_key_touches_last_seen(self, api_client, user):
        d = _device(user)
        assert d.last_seen is None
        # Unknown tag_uid → 404 (not 401) proves auth succeeded.
        api_client.post(
            NFC_INGEST,
            {"tag_uid": "never-registered"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        d.refresh_from_db()
        assert d.last_seen is not None


class TestTimestampDrift:
    def _post(self, api_client, d, ts_ms):
        return api_client.post(
            NFC_INGEST,
            {"tag_uid": "x"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
            HTTP_X_DEVICE_TIMESTAMP=str(ts_ms),
        )

    def test_fresh_timestamp_accepted(self, api_client, user):
        d = _device(user)
        now_ms = int(time.time() * 1000)
        r = self._post(api_client, d, now_ms)
        # Auth succeeded → 404 for unknown tag, not 401.
        assert r.status_code == 404

    def test_far_future_rejected(self, api_client, user):
        d = _device(user)
        future = int(time.time() * 1000) + 10 * 60 * 1000  # +10 min
        r = self._post(api_client, d, future)
        assert r.status_code == 401

    def test_far_past_rejected(self, api_client, user):
        d = _device(user)
        past = int(time.time() * 1000) - 10 * 60 * 1000
        r = self._post(api_client, d, past)
        assert r.status_code == 401

    def test_malformed_timestamp_rejected(self, api_client, user):
        d = _device(user)
        r = self._post(api_client, d, "not-a-number")
        assert r.status_code == 401

    def test_missing_timestamp_allowed(self, api_client, user):
        # Timestamp header is optional — firmware on first boot may not
        # have NTP-synced yet, and we'd rather accept than hard-fail.
        d = _device(user)
        r = api_client.post(
            NFC_INGEST,
            {"tag_uid": "x"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 404  # auth passed
