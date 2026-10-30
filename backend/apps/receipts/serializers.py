"""Serializers for receipt management and OCR processing."""

from rest_framework import serializers  # type: ignore

from .models import Receipt


class ReceiptListSerializer(serializers.ModelSerializer):
    """Lightweight receipt for list views."""

    class Meta:
        model = Receipt
        fields = [
            "id",
            "image",
            "status",
            "ocr_confidence",
            "expense",
            "created_at",
        ]


class ReceiptDetailSerializer(serializers.ModelSerializer):
    """Full receipt with OCR results."""

    class Meta:
        model = Receipt
        fields = [
            "id",
            "image",
            "ocr_raw_text",
            "ocr_parsed_data",
            "ocr_confidence",
            "status",
            "processing_time_ms",
            "expense",
            "error_message",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "ocr_raw_text",
            "ocr_parsed_data",
            "ocr_confidence",
            "status",
            "processing_time_ms",
            "expense",
            "error_message",
            "created_at",
        ]


class ReceiptUploadSerializer(serializers.ModelSerializer):
    """Upload a receipt image for OCR processing."""

    class Meta:
        model = Receipt
        fields = ["id", "image", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]


class ReceiptConfirmSerializer(serializers.Serializer):
    """Confirm OCR data and create an expense from it."""

    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    merchant = serializers.CharField(max_length=255, required=False, allow_blank=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    date = serializers.DateField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
