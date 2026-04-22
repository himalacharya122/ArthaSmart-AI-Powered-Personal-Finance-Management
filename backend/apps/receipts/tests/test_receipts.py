"""Receipt upload → OCR states → confirm creates Expense."""

from __future__ import annotations

import io
from decimal import Decimal

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.receipts.models import Receipt

pytestmark = pytest.mark.django_db

LIST_URL = reverse("receipts:receipt-list")
UPLOAD_URL = reverse("receipts:receipt-upload")


def _detail(pk):
    return reverse("receipts:receipt-detail", args=[pk])


def _reprocess(pk):
    return reverse("receipts:receipt-reprocess", args=[pk])


def _confirm(pk):
    return reverse("receipts:receipt-confirm", args=[pk])


def _png_bytes() -> bytes:
    """Generate a minimal real PNG for ImageField validation."""
    from PIL import Image  # type: ignore

    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color="red").save(buf, format="PNG")
    return buf.getvalue()


def _image_upload(name="r.png"):
    from django.core.files.uploadedfile import SimpleUploadedFile  # type: ignore

    return SimpleUploadedFile(name, _png_bytes(), content_type="image/png")


def _receipt(user, **kw):
    defaults = {
        "image": _image_upload(),
        "status": "pending",
    }
    defaults.update(kw)
    return Receipt.objects.create(user=user, **defaults)


class TestUpload:
    def test_upload_creates_pending_receipt(self, authenticated_client, user):
        r = authenticated_client.post(UPLOAD_URL, {"image": _image_upload()}, format="multipart")
        assert r.status_code == 201
        assert r.data["status"] == "pending"
        assert Receipt.objects.filter(user=user).count() == 1

    def test_upload_requires_image(self, authenticated_client):
        r = authenticated_client.post(UPLOAD_URL, {}, format="multipart")
        assert r.status_code == 400

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.post(UPLOAD_URL, {}, format="multipart").status_code == 401


class TestList:
    def test_list_scoped(self, authenticated_client, user, other_user):
        _receipt(user)
        _receipt(other_user)
        r = authenticated_client.get(LIST_URL)
        assert len(r.data["results"]) == 1

    def test_filter_by_status(self, authenticated_client, user):
        _receipt(user, status="pending")
        _receipt(user, status="completed")
        r = authenticated_client.get(LIST_URL, {"status": "completed"})
        assert len(r.data["results"]) == 1
        assert r.data["results"][0]["status"] == "completed"


class TestReprocess:
    def test_reprocess_sets_processing(self, authenticated_client, user):
        rc = _receipt(user, status="failed", error_message="bad")
        r = authenticated_client.post(_reprocess(rc.pk))
        assert r.status_code == 200
        rc.refresh_from_db()
        assert rc.status == "processing"
        assert rc.error_message == ""


class TestConfirm:
    def test_confirm_creates_expense_from_ocr_fallbacks(
        self, authenticated_client, user, category_factory
    ):
        cat = category_factory(user=user, name="Food")
        rc = _receipt(
            user,
            status="completed",
            ocr_parsed_data={"total": "250.00", "merchant": "KFC"},
        )
        r = authenticated_client.post(
            _confirm(rc.pk),
            {"category_id": cat.id, "date": "2026-04-22"},
            format="json",
        )
        assert r.status_code == 201
        from apps.expenses.models import Expense

        e = Expense.objects.get(user=user)
        assert e.source == "ocr"
        assert e.amount == Decimal("250.00")
        assert e.merchant == "KFC"
        rc.refresh_from_db()
        assert rc.expense_id == e.id

    def test_confirm_explicit_values_override_ocr(
        self, authenticated_client, user, category_factory
    ):
        cat = category_factory(user=user, name="Food")
        rc = _receipt(
            user,
            status="completed",
            ocr_parsed_data={"total": "100", "merchant": "OCR-merchant"},
        )
        r = authenticated_client.post(
            _confirm(rc.pk),
            {
                "amount": "500.00",
                "merchant": "Override",
                "category_id": cat.id,
                "date": "2026-04-22",
            },
            format="json",
        )
        assert r.status_code == 201
        from apps.expenses.models import Expense

        e = Expense.objects.get(user=user)
        assert e.amount == Decimal("500.00")
        assert e.merchant == "Override"

    def test_cannot_confirm_others(self, authenticated_client, other_user):
        rc = _receipt(other_user)
        r = authenticated_client.post(_confirm(rc.pk), {}, format="json")
        assert r.status_code == 404


class TestDestroy:
    def test_delete(self, authenticated_client, user):
        rc = _receipt(user)
        r = authenticated_client.delete(_detail(rc.pk))
        assert r.status_code == 204
        assert not Receipt.objects.filter(pk=rc.pk).exists()
