"""IoT URL configuration.

URL layout:
  /iot/devices/...        CRUD for registered devices (user-facing)
  /iot/nfc-tags/...       CRUD for NFC tags          (user-facing)
  /iot/pair/request/      device asks for a pairing code  (anonymous)
  /iot/pair/claim/        user claims a code              (JWT)
  /iot/pair/status/<c>/   device polls for the api_key    (anonymous)
  /iot/ingest/receipt/    receipt scanner uploads JPEG    (device key)
  /iot/ingest/nfc-tap/    NFC logger reports a tap        (device key)
"""

from django.urls import include, path  # type: ignore
from rest_framework.routers import DefaultRouter  # type: ignore

from .ingest import IngestNFCTapView, IngestReceiptView
from .pairing import PairingClaimView, PairingRequestView, PairingStatusView
from .views import IoTDeviceViewSet, NFCTagViewSet

app_name = "iot"

router = DefaultRouter()
router.register("devices", IoTDeviceViewSet, basename="iot-device")
router.register("nfc-tags", NFCTagViewSet, basename="nfc-tag")

urlpatterns = [
    # Pairing (anonymous + JWT)
    path("pair/request/", PairingRequestView.as_view(), name="pair-request"),
    path("pair/claim/", PairingClaimView.as_view(), name="pair-claim"),
    path(
        "pair/status/<str:pairing_code>/",
        PairingStatusView.as_view(),
        name="pair-status",
    ),
    # Ingestion (device API key)
    path("ingest/receipt/", IngestReceiptView.as_view(), name="ingest-receipt"),
    path("ingest/nfc-tap/", IngestNFCTapView.as_view(), name="ingest-nfc-tap"),
    # User-facing CRUD (JWT) - kept last so /pair/... and /ingest/... don't
    # accidentally get swallowed by a router-registered prefix.
    path("", include(router.urls)),
]
