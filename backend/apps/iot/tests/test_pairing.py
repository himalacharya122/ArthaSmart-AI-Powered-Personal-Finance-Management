"""Pairing flow: request → claim → status poll."""

from __future__ import annotations

from datetime import timedelta

import pytest  # type: ignore
from django.urls import reverse  # type: ignore
from django.utils import timezone  # type: ignore

from apps.iot.models import DevicePairing, IoTDevice

pytestmark = pytest.mark.django_db

REQUEST_URL = reverse("iot:pair-request")
CLAIM_URL = reverse("iot:pair-claim")


def _status_url(code):
    return reverse("iot:pair-status", args=[code])


class TestPairingRequest:
    def test_creates_pending_pairing(self, api_client):
        r = api_client.post(
            REQUEST_URL,
            {"hardware_id": "AA:BB:CC:DD:EE:FF", "device_type": "nfc_logger"},
            format="json",
        )
        assert r.status_code == 201
        assert len(r.data["pairing_code"]) == 6
        assert r.data["pairing_code"].isdigit()
        assert r.data["expires_in"] == 600

        p = DevicePairing.objects.get(pairing_code=r.data["pairing_code"])
        assert p.status == "pending"
        assert p.device is None  # nobody's claimed it yet

    def test_requires_no_auth(self, api_client):
        # A fresh ESP32 has no credentials yet — this endpoint must be open.
        r = api_client.post(
            REQUEST_URL,
            {"hardware_id": "x", "device_type": "receipt_scanner"},
            format="json",
        )
        assert r.status_code == 201

    def test_validates_device_type(self, api_client):
        r = api_client.post(
            REQUEST_URL,
            {"hardware_id": "x", "device_type": "toaster"},
            format="json",
        )
        assert r.status_code == 400


class TestPairingClaim:
    def _pending(self, **kw):
        defaults = {
            "hardware_id": "HW-1",
            "device_type": "nfc_logger",
            "pairing_code": "123456",
            "expires_at": timezone.now() + timedelta(minutes=10),
        }
        defaults.update(kw)
        return DevicePairing.objects.create(**defaults)

    def test_claim_creates_device_and_marks_claimed(self, authenticated_client, user):
        p = self._pending()
        r = authenticated_client.post(
            CLAIM_URL,
            {"pairing_code": "123456", "name": "Kitchen Scanner"},
            format="json",
        )
        assert r.status_code == 200
        assert r.data["name"] == "Kitchen Scanner"
        assert r.data["api_key"].startswith("ask_iot")

        p.refresh_from_db()
        assert p.status == "claimed"
        assert p.claimed_at is not None
        assert p.device is not None
        assert p.device.user == user
        assert p.device.device_id == "HW-1"

    def test_claim_requires_auth(self, api_client):
        self._pending()
        r = api_client.post(CLAIM_URL, {"pairing_code": "123456", "name": "X"}, format="json")
        assert r.status_code == 401

    def test_unknown_code_returns_404(self, authenticated_client):
        r = authenticated_client.post(
            CLAIM_URL, {"pairing_code": "999999", "name": "X"}, format="json"
        )
        assert r.status_code == 404

    def test_already_claimed_returns_404(self, authenticated_client):
        p = self._pending()
        p.status = "claimed"
        p.save()
        r = authenticated_client.post(
            CLAIM_URL, {"pairing_code": "123456", "name": "X"}, format="json"
        )
        assert r.status_code == 404

    def test_expired_code_returns_410(self, authenticated_client):
        self._pending(expires_at=timezone.now() - timedelta(seconds=1))
        r = authenticated_client.post(
            CLAIM_URL, {"pairing_code": "123456", "name": "X"}, format="json"
        )
        assert r.status_code == 410

    def test_rejects_malformed_code(self, authenticated_client):
        r = authenticated_client.post(
            CLAIM_URL, {"pairing_code": "abc", "name": "X"}, format="json"
        )
        assert r.status_code == 400

    def test_conflict_if_hardware_already_registered(self, authenticated_client, user):
        # Pre-existing device with the same hardware_id.
        IoTDevice.objects.create(
            user=user,
            name="Old",
            device_type="nfc_logger",
            device_id="HW-1",
            api_key="ask_iot_preexisting",
        )
        self._pending(hardware_id="HW-1")
        r = authenticated_client.post(
            CLAIM_URL, {"pairing_code": "123456", "name": "X"}, format="json"
        )
        assert r.status_code == 409


class TestPairingStatus:
    def _pending(self, **kw):
        defaults = {
            "hardware_id": "HW-2",
            "device_type": "nfc_logger",
            "pairing_code": "555555",
            "expires_at": timezone.now() + timedelta(minutes=10),
        }
        defaults.update(kw)
        return DevicePairing.objects.create(**defaults)

    def test_pending_returns_pending(self, api_client):
        self._pending()
        r = api_client.get(_status_url("555555"))
        assert r.status_code == 200
        assert r.data["status"] == "pending"

    def test_unknown_code_404(self, api_client):
        r = api_client.get(_status_url("000000"))
        assert r.status_code == 404

    def test_claimed_delivers_key_then_flips_to_consumed(self, api_client, user):
        p = self._pending()
        device = IoTDevice.objects.create(
            user=user,
            name="X",
            device_type="nfc_logger",
            device_id="HW-2",
            api_key="ask_iot_delivered",
        )
        p.device = device
        p.status = "claimed"
        p.claimed_at = timezone.now()
        p.save()

        r1 = api_client.get(_status_url("555555"))
        assert r1.status_code == 200
        assert r1.data["status"] == "paired"
        assert r1.data["api_key"] == "ask_iot_delivered"

        # Second poll must NOT re-leak the key.
        r2 = api_client.get(_status_url("555555"))
        assert r2.status_code == 410
        assert r2.data["status"] == "already_consumed"

    def test_status_marks_expired_lazily(self, api_client):
        p = self._pending(expires_at=timezone.now() - timedelta(seconds=1))
        r = api_client.get(_status_url("555555"))
        assert r.status_code == 410
        p.refresh_from_db()
        assert p.status == "expired"
