"""Receipt management views."""
from django.utils import timezone # type: ignore
from django_filters.rest_framework import DjangoFilterBackend # type: ignore
from rest_framework import mixins, status, viewsets # type: ignore
from rest_framework.decorators import action # type: ignore
from rest_framework.filters import OrderingFilter # type: ignore
from rest_framework.parsers import FormParser, MultiPartParser # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore

from apps.categories.models import Category
from apps.expenses.models import Expense
from apps.shared.permissions import IsOwner

from .models import Receipt
from .serializers import (
    ReceiptConfirmSerializer,
    ReceiptDetailSerializer,
    ReceiptListSerializer,
    ReceiptUploadSerializer,
)


class ReceiptViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Receipt management: upload, view OCR results, confirm to create expense."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Receipt.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ReceiptListSerializer
        if self.action == "upload":
            return ReceiptUploadSerializer
        if self.action == "confirm":
            return ReceiptConfirmSerializer
        return ReceiptDetailSerializer

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """POST /api/v1/receipts/upload/ — Upload receipt image."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        receipt = serializer.save(user=request.user, status="pending")
        return Response(
            ReceiptDetailSerializer(receipt).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def reprocess(self, request, pk=None):
        """POST /api/v1/receipts/{id}/reprocess/ — Re-trigger OCR."""
        receipt = self.get_object()
        receipt.status = "processing"
        receipt.error_message = ""
        receipt.save(update_fields=["status", "error_message"])
        # TODO: Trigger async OCR task here
        return Response({"status": "processing"})

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """POST /api/v1/receipts/{id}/confirm/ — Create expense from OCR data."""
        receipt = self.get_object()
        serializer = ReceiptConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Use OCR data as fallback for missing fields
        ocr = receipt.ocr_parsed_data or {}
        category = None
        if data.get("category_id"):
            category = Category.objects.filter(id=data["category_id"]).first()

        expense = Expense.objects.create(
            user=request.user,
            amount=data.get("amount", ocr.get("total", 0)),
            merchant=data.get("merchant", ocr.get("merchant", "")),
            description=data.get("description", ""),
            date=data.get("date", timezone.now().date()),
            category=category,
            source="ocr",
            receipt_image=receipt.image,
        )

        receipt.expense = expense
        receipt.save(update_fields=["expense"])

        from apps.expenses.serializers import ExpenseDetailSerializer
        return Response(
            ExpenseDetailSerializer(expense).data,
            status=status.HTTP_201_CREATED,
        )
