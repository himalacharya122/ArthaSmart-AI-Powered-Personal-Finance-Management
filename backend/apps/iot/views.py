"""IoT device and NFC tag management views (deprioritized — basic CRUD only)."""
from django.utils import timezone # type: ignore
from rest_framework import viewsets # type: ignore
from rest_framework.decorators import action # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore

from apps.shared.permissions import IsOwner
from apps.shared.utils import generate_api_key

from .models import IoTDevice, NFCTag
from .serializers import IoTDeviceSerializer, NFCTagSerializer


class IoTDeviceViewSet(viewsets.ModelViewSet):
    """CRUD for IoT devices."""

    serializer_class = IoTDeviceSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return IoTDevice.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        api_key = generate_api_key(prefix="ask_iot")
        serializer.save(user=self.request.user, api_key=api_key)

    @action(detail=True, methods=["post"], url_path="rotate-key")
    def rotate_key(self, request, pk=None):
        """POST /api/v1/iot/devices/{id}/rotate-key/ — Generate new API key."""
        device = self.get_object()
        device.api_key = generate_api_key(prefix="ask_iot")
        device.api_key_expires_at = timezone.now() + timezone.timedelta(days=365)
        device.save(update_fields=["api_key", "api_key_expires_at"])
        return Response({
            "api_key": device.api_key,
            "api_key_expires_at": device.api_key_expires_at,
        })


class NFCTagViewSet(viewsets.ModelViewSet):
    """CRUD for NFC tags."""

    serializer_class = NFCTagSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return NFCTag.objects.filter(user=self.request.user).select_related("category")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
