"""IoT device and NFC tag management views (deprioritized — basic CRUD only)."""

from django.db import transaction  # type: ignore
from django.utils import timezone  # type: ignore
from rest_framework import status, viewsets  # type: ignore
from rest_framework.decorators import action  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.views import APIView  # type: ignore

from apps.shared.permissions import IsOwner
from apps.shared.utils import generate_api_key

from .authentication import DeviceAPIKeyAuthentication  # IoT Receipt Scanner: poll auth
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
        return Response(
            {
                "api_key": device.api_key,
                "api_key_expires_at": device.api_key_expires_at,
            }
        )

    # -------------------------------------------------------------------------
    # IoT Receipt Scanner — remote capture trigger
    # Called by the web UI "Capture now" button (JWT auth, device owner only).
    # Sets pending_capture=True; the ESP32-CAM firmware picks it up on its
    # next GET /api/v1/iot/poll/ call (within POLL_INTERVAL_MS, default 2 s).
    #
    # To remove: delete this action and remove pending_capture from models.py,
    # run python manage.py migrate iot 0001, delete migration 0002.
    # Also remove PollView below and its url from urls.py.
    # -------------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="capture")
    def capture(self, request, pk=None):
        """POST /api/v1/iot/devices/{id}/capture/ — Queue a capture command."""
        device = self.get_object()
        if device.device_type != IoTDevice.DeviceType.RECEIPT_SCANNER:
            return Response(
                {"detail": "Capture commands are only supported for receipt scanners."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not device.is_active:
            return Response(
                {"detail": "Device is disabled. Enable it first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        device.pending_capture = True
        device.save(update_fields=["pending_capture"])
        return Response({"queued": True})


class NFCTagViewSet(viewsets.ModelViewSet):
    """CRUD for NFC tags."""

    serializer_class = NFCTagSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return NFCTag.objects.filter(user=self.request.user).select_related("category")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# -----------------------------------------------------------------------------
# IoT Receipt Scanner — command poll endpoint
# Called by the ESP32-CAM firmware every POLL_INTERVAL_MS (default 2 s).
# Uses DeviceAPIKeyAuthentication (X-Device-API-Key header), not JWT.
#
# Flow:
#   1. Web UI clicks "Capture now" → POST /iot/devices/{id}/capture/ sets
#      pending_capture=True on the IoTDevice row.
#   2. Firmware polls GET /iot/poll/ with its API key.
#   3. This view reads pending_capture; if True, resets it atomically and
#      returns {"capture": true} so the firmware fires the shutter.
#   4. Firmware captures JPEG → POST /iot/ingest/receipt/ → Receipt created.
#
# To remove: delete this class and remove its url from urls.py.
# Also remove the `capture` action from IoTDeviceViewSet above, remove the
# pending_capture field from models.py, and delete migration 0002.
# -----------------------------------------------------------------------------
class PollView(APIView):
    """GET /api/v1/iot/poll/ — Device polls for pending capture commands."""

    authentication_classes = [DeviceAPIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        device = request.auth  # IoTDevice instance set by DeviceAPIKeyAuthentication

        # IoT Receipt Scanner — record device LAN IP for live preview.
        # The firmware sends X-Device-IP on every poll so the web UI can build
        # a direct snapshot URL (GET http://{last_ip}/snapshot) for the preview
        # modal. Only save when the value actually changes to avoid needless writes.
        # To remove: delete this block and the last_ip field from models.py.
        ip = request.META.get("HTTP_X_DEVICE_IP", "").strip()
        if ip and ip != device.last_ip:
            device.last_ip = ip
            device.save(update_fields=["last_ip"])

        # Non-scanner devices never have capture commands — return early.
        if device.device_type != IoTDevice.DeviceType.RECEIPT_SCANNER:
            return Response({"capture": False})

        # Atomically read and clear the flag so a second poll within the same
        # 2 s window doesn't fire the shutter twice.
        with transaction.atomic():
            refreshed = IoTDevice.objects.select_for_update().get(pk=device.pk)
            if refreshed.pending_capture:
                refreshed.pending_capture = False
                refreshed.save(update_fields=["pending_capture"])
                return Response({"capture": True})

        return Response({"capture": False})
