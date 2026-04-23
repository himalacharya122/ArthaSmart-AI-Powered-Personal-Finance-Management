"""Device-level authentication for IoT endpoints.

Unlike normal users (JWT in `Authorization: Bearer ...`), IoT devices
authenticate with a long-lived API key minted at pairing time. The key
travels in the `X-Device-API-Key` header, and optionally the device
includes `X-Device-Timestamp` (unix ms) so we can reject replayed
requests whose clock drift exceeds MAX_DRIFT_SECONDS.

Why a dedicated auth class (not JWT):
  - ESP32s can't realistically rotate JWTs or run a full crypto stack
    just to refresh access tokens every 15 minutes.
  - A single header makes firmware trivial: one string, baked into NVS.
  - Keeps device auth orthogonal to user auth — removing IoT only
    removes this file, JWT flow is untouched.

Authenticating successfully sets:
  - request.user  = the human user who owns this device
  - request.auth  = the IoTDevice row itself (so views can reach device
                    metadata without another DB lookup)
"""

from __future__ import annotations

import time

from django.utils import timezone  # type: ignore
from rest_framework import authentication, exceptions  # type: ignore

from .models import IoTDevice

# Reject requests whose client-reported timestamp drifts more than this
# from the server clock. 60 s is loose enough to tolerate NTP jitter on
# a cheap ESP32 but tight enough to kill trivial replay attacks.
MAX_DRIFT_SECONDS = 60


class DeviceAPIKeyAuthentication(authentication.BaseAuthentication):
    """Authenticate an IoT device via X-Device-API-Key header."""

    keyword = "X-Device-API-Key"
    timestamp_header = "X-Device-Timestamp"

    def authenticate(self, request):
        # DRF contract: return None when *this* auth scheme isn't applicable,
        # so other auth classes (JWT, session) still get their turn.
        api_key = request.META.get("HTTP_X_DEVICE_API_KEY")
        if not api_key:
            return None

        try:
            device = IoTDevice.objects.select_related("user").get(api_key=api_key)
        except IoTDevice.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid device API key.") from None

        if not device.is_active:
            raise exceptions.AuthenticationFailed("Device is disabled.")

        # Enforce api_key_expires_at if the web app has rotated the key.
        if device.api_key_expires_at and timezone.now() >= device.api_key_expires_at:
            raise exceptions.AuthenticationFailed("Device API key has expired.")

        self._verify_timestamp(request)

        # Touch last_seen so the web UI can show "online X seconds ago".
        # update_fields keeps this cheap (no UPDATE on the whole row).
        device.last_seen = timezone.now()
        device.save(update_fields=["last_seen"])

        return (device.user, device)

    def _verify_timestamp(self, request):
        """Reject requests whose clock is way off (replay protection).

        Timestamp is optional — if the firmware doesn't bother sending one,
        we skip this check. That's a deliberate tradeoff: devices on
        sketchy WiFi may not have NTP synced yet on first boot.
        """
        raw = request.META.get(f"HTTP_{self.timestamp_header.upper().replace('-', '_')}")
        if not raw:
            return

        try:
            ts_ms = int(raw)
        except (TypeError, ValueError):
            raise exceptions.AuthenticationFailed("Malformed device timestamp.") from None
        server_ms = int(time.time() * 1000)
        drift = abs(server_ms - ts_ms) / 1000.0
        if drift > MAX_DRIFT_SECONDS:
            raise exceptions.AuthenticationFailed(f"Device clock drift too large ({drift:.1f}s).")

    def authenticate_header(self, request):
        # DRF uses this to build the WWW-Authenticate header on 401s.
        return self.keyword
