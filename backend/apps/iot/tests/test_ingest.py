"""Device-authenticated ingestion: receipt upload + NFC tap → Expense."""

from __future__ import annotations

import io
from decimal import Decimal

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.iot.models import IoTDevice, NFCTag

pytestmark = pytest.mark.django_db

RECEIPT_URL = reverse("iot:ingest-receipt")
NFC_URL = reverse("iot:ingest-nfc-tap")


def _device(user, **kw):
    defaults = {
        "name": "Test",
        "device_type": "receipt_scanner",
        "device_id": f"ingest-{id(user)}",
        "api_key": f"ask_iot_ingest_{id(user)}",
    }
    defaults.update(kw)
    return IoTDevice.objects.create(user=user, **defaults)


def _png_upload():
    """Real 2x2 PNG — Receipt.image is an ImageField and validates decode."""
    from django.core.files.uploadedfile import SimpleUploadedFile  # type: ignore
    from PIL import Image  # type: ignore

    buf = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(buf, format="PNG")
    return SimpleUploadedFile("r.png", buf.getvalue(), content_type="image/png")


class TestReceiptIngest:
    def test_success_creates_pending_receipt(self, api_client, user):
        d = _device(user)
        r = api_client.post(
            RECEIPT_URL,
            {"image": _png_upload()},
            format="multipart",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 201
        assert r.data["status"] == "pending"

        from apps.receipts.models import Receipt

        rec = Receipt.objects.get(id=r.data["receipt_id"])
        assert rec.user == user
        assert rec.source_device == d
        assert rec.status == "pending"

    def test_rejects_without_device_key(self, api_client):
        r = api_client.post(RECEIPT_URL, {"image": _png_upload()}, format="multipart")
        assert r.status_code == 401

    def test_requires_image(self, api_client, user):
        d = _device(user)
        r = api_client.post(RECEIPT_URL, {}, format="multipart", HTTP_X_DEVICE_API_KEY=d.api_key)
        assert r.status_code == 400


class TestNFCTapIngest:
    def _tag(self, user, **kw):
        defaults = {
            "tag_uid": "04:AA:BB",
            "label": "Coffee",
            "default_amount": Decimal("150.00"),
            "default_currency": "NPR",
            "merchant": "Cafe",
        }
        defaults.update(kw)
        return NFCTag.objects.create(user=user, **defaults)

    def test_tap_creates_expense_from_tag_defaults(self, api_client, user, category_factory):
        cat = category_factory(user=user, name="Food")
        tag = self._tag(user, category=cat)
        d = _device(user, device_type="nfc_logger", device_id="nfc-1")
        r = api_client.post(
            NFC_URL,
            {"tag_uid": "04:AA:BB"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 201
        assert r.data["tag_label"] == "Coffee"

        from apps.expenses.models import Expense

        e = Expense.objects.get(id=r.data["expense_id"])
        assert e.user == user
        assert e.amount == Decimal("150.00")
        assert e.source == "nfc"
        assert e.category == cat
        assert e.merchant == "Cafe"

        tag.refresh_from_db()
        assert tag.tap_count == 1

    def test_unknown_tag_returns_404(self, api_client, user):
        d = _device(user, device_type="nfc_logger", device_id="nfc-2")
        r = api_client.post(
            NFC_URL,
            {"tag_uid": "04:FF:FF"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 404

    def test_tag_from_another_user_is_unknown(self, api_client, user, other_user):
        # Tag belongs to other_user — must not leak across accounts even
        # though the tag_uid collides.
        NFCTag.objects.create(
            user=other_user,
            tag_uid="04:AA:BB",
            label="Theirs",
            default_amount=Decimal("10"),
        )
        d = _device(user, device_type="nfc_logger", device_id="nfc-3")
        r = api_client.post(
            NFC_URL,
            {"tag_uid": "04:AA:BB"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 404

    def test_inactive_tag_returns_404(self, api_client, user):
        self._tag(user, is_active=False)
        d = _device(user, device_type="nfc_logger", device_id="nfc-4")
        r = api_client.post(
            NFC_URL,
            {"tag_uid": "04:AA:BB"},
            format="json",
            HTTP_X_DEVICE_API_KEY=d.api_key,
        )
        assert r.status_code == 404

    def test_requires_tag_uid(self, api_client, user):
        d = _device(user, device_type="nfc_logger", device_id="nfc-5")
        r = api_client.post(NFC_URL, {}, format="json", HTTP_X_DEVICE_API_KEY=d.api_key)
        assert r.status_code == 400

    def test_rejects_without_device_key(self, api_client):
        r = api_client.post(NFC_URL, {"tag_uid": "x"}, format="json")
        assert r.status_code == 401
