"""IoT URL configuration."""

from django.urls import include, path  # type: ignore
from rest_framework.routers import DefaultRouter  # type: ignore

from .views import IoTDeviceViewSet, NFCTagViewSet

app_name = "iot"

router = DefaultRouter()
router.register("devices", IoTDeviceViewSet, basename="iot-device")
router.register("nfc-tags", NFCTagViewSet, basename="nfc-tag")

urlpatterns = [
    path("", include(router.urls)),
]
