"""Device-authenticated data ingestion endpoints.

These are the only endpoints the ESP32 firmware hits in normal operation:

  POST /api/v1/iot/ingest/receipt/   (multipart: image=<jpeg>)
      - Receipt scanner uploads a freshly-captured photo.
      - Creates Receipt(status="pending", source_device=device).
      - OCR processing is someone else's problem (the existing pipeline).

  POST /api/v1/iot/ingest/nfc-tap/   (json: {"tag_uid": "..."})
      - NFC logger reports a tap.
      - Looks up the user's NFCTag for that UID, creates an Expense using
        the tag's default amount/category/merchant, and bumps tap_count.
      - Unknown UIDs return 404 so the firmware can beep a "not registered"
        pattern — the user then opens the web app to configure the tag.

Both endpoints share one authentication class (DeviceAPIKeyAuthentication),
which populates request.user = device.user and request.auth = device.
"""

from __future__ import annotations

from django.db import transaction  # type: ignore
from django.utils import timezone  # type: ignore
from rest_framework import status  # type: ignore
from rest_framework.parsers import FormParser, MultiPartParser  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.views import APIView  # type: ignore

from apps.expenses.models import Expense
from apps.receipts.models import Receipt

from .authentication import DeviceAPIKeyAuthentication
from .models import NFCTag
from .serializers import IngestNFCTapSerializer, IngestReceiptSerializer


class IngestReceiptView(APIView):
    """Receipt scanner uploads a JPEG.

    The Receipt row lands in "pending" — any downstream OCR job picks it
    up from there. We deliberately do NOT run OCR inline: a slow external
    service shouldn't make the ESP32's HTTP timeout.
    """

    authentication_classes = [DeviceAPIKeyAuthentication]
    permission_classes = [IsAuthenticated]  # device.user is always set on success
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = IngestReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device = request.auth  # IoTDevice, set by DeviceAPIKeyAuthentication

        receipt = Receipt.objects.create(
            user=request.user,
            image=serializer.validated_data["image"],
            source_device=device,
            status=Receipt.Status.PENDING,
        )

        # Minimal response — the ESP32 just needs to know we accepted it
        # (so it can beep OK and clear its buffer). Don't serialize the
        # full Receipt; the JPEG URL would be useless to firmware anyway.
        return Response(
            {"receipt_id": receipt.id, "status": receipt.status},
            status=status.HTTP_201_CREATED,
        )


class IngestNFCTapView(APIView):
    """NFC logger reports a tag tap — we mint an Expense from the preset.

    The NFCTag model holds every field we need (amount, currency, category,
    merchant, description), so this endpoint is just a structured copy
    from tag defaults → Expense. No AI involved.
    """

    authentication_classes = [DeviceAPIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = IngestNFCTapSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tag_uid = serializer.validated_data["tag_uid"]

        # Tag must belong to the same user who owns the device. A tag
        # registered under another account is as good as unknown — we
        # don't want user A's tap to create expenses on user B's ledger.
        try:
            tag = NFCTag.objects.get(user=request.user, tag_uid=tag_uid, is_active=True)
        except NFCTag.DoesNotExist:
            return Response(
                {"detail": "Unknown or inactive tag for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            expense = Expense.objects.create(
                user=request.user,
                amount=tag.default_amount,
                currency=tag.default_currency,
                category=tag.category,
                merchant=tag.merchant,
                description=tag.description or tag.label,
                # Tap happens "now" by definition — users can edit the
                # date from the web UI if they need to back-date it.
                date=timezone.localdate(),
                source="nfc",
            )
            # Usage counter helps the user see their most-tapped tags.
            tag.tap_count += 1
            tag.save(update_fields=["tap_count", "updated_at"])

        return Response(
            {
                "expense_id": expense.id,
                "amount": str(expense.amount),
                "currency": expense.currency,
                "tag_label": tag.label,
            },
            status=status.HTTP_201_CREATED,
        )
