"""IoTDevice and NFCTag CRUD + rotate-key."""

from __future__ import annotations

from decimal import Decimal

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.iot.models import IoTDevice, NFCTag

pytestmark = pytest.mark.django_db

DEVICE_LIST = reverse("iot:iot-device-list")
NFC_LIST = reverse("iot:nfc-tag-list")


def _device_detail(pk):
    return reverse("iot:iot-device-detail", args=[pk])


def _rotate(pk):
    return reverse("iot:iot-device-rotate-key", args=[pk])


def _nfc_detail(pk):
    return reverse("iot:nfc-tag-detail", args=[pk])


def _device(user, **kw):
    defaults = {
        "name": "Scanner",
        "device_type": "receipt_scanner",
        "device_id": f"dev-{id(user)}-{kw.get('suffix', '1')}",
        "api_key": f"ask_iot_{id(user)}-{kw.get('suffix', '1')}",
    }
    kw.pop("suffix", None)
    defaults.update(kw)
    return IoTDevice.objects.create(user=user, **defaults)


class TestDeviceCRUD:
    def test_list_scoped(self, authenticated_client, user, other_user):
        _device(user, suffix="a")
        _device(other_user, suffix="b")
        r = authenticated_client.get(DEVICE_LIST)
        assert len(r.data["results"]) == 1

    def test_create_auto_generates_api_key(self, authenticated_client, user):
        r = authenticated_client.post(
            DEVICE_LIST,
            {
                "name": "Kitchen",
                "device_type": "receipt_scanner",
                "device_id": "kitchen-001",
            },
            format="json",
        )
        assert r.status_code == 201
        assert r.data["api_key"].startswith("ask_iot")
        dev = IoTDevice.objects.get(device_id="kitchen-001")
        assert dev.user == user

    def test_rotate_key_generates_new(self, authenticated_client, user):
        dev = _device(user, api_key="old_key_123", suffix="r")
        r = authenticated_client.post(_rotate(dev.pk))
        assert r.status_code == 200
        assert r.data["api_key"] != "old_key_123"
        assert r.data["api_key"].startswith("ask_iot")
        assert r.data["api_key_expires_at"] is not None
        dev.refresh_from_db()
        assert dev.api_key.startswith("ask_iot")

    def test_cannot_rotate_others(self, authenticated_client, other_user):
        dev = _device(other_user, suffix="x")
        assert authenticated_client.post(_rotate(dev.pk)).status_code == 404

    def test_delete(self, authenticated_client, user):
        dev = _device(user, suffix="d")
        r = authenticated_client.delete(_device_detail(dev.pk))
        assert r.status_code == 204
        assert not IoTDevice.objects.filter(pk=dev.pk).exists()

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(DEVICE_LIST).status_code == 401


class TestNFCTag:
    def test_create(self, authenticated_client, user, category_factory):
        cat = category_factory(user=user)
        r = authenticated_client.post(
            NFC_LIST,
            {
                "tag_uid": "04:AA:BB:CC",
                "label": "Morning Coffee",
                "default_amount": "150.00",
                "default_currency": "NPR",
                "category_id": cat.id,
                "merchant": "Cafe",
            },
            format="json",
        )
        assert r.status_code == 201
        tag = NFCTag.objects.get(user=user)
        assert tag.label == "Morning Coffee"
        assert tag.default_amount == Decimal("150.00")

    def test_unique_per_user_constraint(self, user):
        from django.db import IntegrityError, transaction  # type: ignore

        NFCTag.objects.create(user=user, tag_uid="04:AA", label="A", default_amount=Decimal("10"))
        with pytest.raises(IntegrityError), transaction.atomic():
            NFCTag.objects.create(
                user=user, tag_uid="04:AA", label="B", default_amount=Decimal("20")
            )

    def test_list_scoped(self, authenticated_client, user, other_user):
        NFCTag.objects.create(user=user, tag_uid="x", label="mine", default_amount=Decimal("5"))
        NFCTag.objects.create(
            user=other_user, tag_uid="x", label="theirs", default_amount=Decimal("5")
        )
        r = authenticated_client.get(NFC_LIST)
        labels = {t["label"] for t in r.data["results"]}
        assert labels == {"mine"}

    def test_cannot_delete_others(self, authenticated_client, other_user):
        tag = NFCTag.objects.create(
            user=other_user, tag_uid="z", label="t", default_amount=Decimal("1")
        )
        assert authenticated_client.delete(_nfc_detail(tag.pk)).status_code == 404
