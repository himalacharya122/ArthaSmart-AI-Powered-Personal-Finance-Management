"""Device pairing flow — attaches an anonymous ESP32 to a logged-in user.

Three endpoints, each a separate APIView because they have *very* different
auth requirements:

                      Called by    Auth              Purpose
  /iot/pair/request/  device       none              get a 6-digit code
  /iot/pair/claim/    user (web)   JWT               attach pending code to me
  /iot/pair/status/   device       none (code only)  poll until api_key ready

The code itself acts as a short-lived bearer token — enough to be useful
in a classroom setting without giving an attacker who scans codes the
ability to create devices under arbitrary user accounts (claim requires
JWT). A code expires in 10 minutes and can be claimed at most once.
"""

from __future__ import annotations

import secrets
from datetime import timedelta

from django.db import transaction  # type: ignore
from django.utils import timezone  # type: ignore
from rest_framework import status  # type: ignore
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.views import APIView  # type: ignore

from apps.shared.utils import generate_api_key

from .models import DevicePairing, IoTDevice
from .serializers import (
    IoTDeviceSerializer,
    PairingClaimSerializer,
    PairingRequestSerializer,
)

# How long a pairing code is valid for. 10 minutes is generous enough
# that a user can fish their phone out, log in, and type it, but short
# enough that a lost code doesn't sit claimable forever.
PAIRING_TTL = timedelta(minutes=10)


def _generate_unique_code() -> str:
    """Random 6-digit numeric code, unique among currently-pending pairings.

    Collisions are vanishingly rare (10^6 space, ~seconds of lifespan) but
    we check anyway — two devices pairing simultaneously with the same code
    would be a very confusing bug.
    """
    for _ in range(10):
        code = f"{secrets.randbelow(1_000_000):06d}"
        if not DevicePairing.objects.filter(
            pairing_code=code, status=DevicePairing.Status.PENDING
        ).exists():
            return code
    # 10 collisions in a row means something is deeply wrong.
    raise RuntimeError("Could not generate unique pairing code after 10 attempts.")


class PairingRequestView(APIView):
    """POST /api/v1/iot/pair/request/  — device asks for a pairing code.

    Body:  {"hardware_id": "...", "device_type": "receipt_scanner"}
    Reply: {"pairing_code": "384291", "expires_in": 600}

    Anonymous on purpose: the device has nothing to authenticate with yet.
    Abuse is bounded by DRF throttling (configured globally) and by the
    fact that a code is useless without a JWT-authenticated claim.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []  # explicitly no auth

    def post(self, request):
        serializer = PairingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pairing = DevicePairing.objects.create(
            hardware_id=serializer.validated_data["hardware_id"],
            device_type=serializer.validated_data["device_type"],
            pairing_code=_generate_unique_code(),
            expires_at=timezone.now() + PAIRING_TTL,
        )
        return Response(
            {
                "pairing_code": pairing.pairing_code,
                "expires_in": int(PAIRING_TTL.total_seconds()),
            },
            status=status.HTTP_201_CREATED,
        )


class PairingClaimView(APIView):
    """POST /api/v1/iot/pair/claim/  — logged-in user claims a code.

    Body:  {"pairing_code": "384291", "name": "Kitchen Scanner"}
    Reply: the full IoTDevice row (so the web UI can show it immediately).

    This is the only step that requires a real user session. Once claimed,
    the device can pick up its api_key via PairingStatusView.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PairingClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["pairing_code"]
        name = serializer.validated_data["name"]

        # transaction.atomic so we never end up with a claimed pairing
        # pointing at a half-created IoTDevice.
        with transaction.atomic():
            try:
                pairing = DevicePairing.objects.select_for_update().get(
                    pairing_code=code, status=DevicePairing.Status.PENDING
                )
            except DevicePairing.DoesNotExist:
                return Response(
                    {"detail": "Invalid or already-claimed pairing code."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if pairing.is_expired():
                pairing.status = DevicePairing.Status.EXPIRED
                pairing.save(update_fields=["status"])
                return Response(
                    {"detail": "Pairing code has expired. Reboot the device to get a new one."},
                    status=status.HTTP_410_GONE,
                )

            # hardware_id is unique on IoTDevice — if the same ESP32 is being
            # re-paired, bail early rather than hit an IntegrityError.
            if IoTDevice.objects.filter(device_id=pairing.hardware_id).exists():
                return Response(
                    {"detail": "This hardware is already registered. Reset the device to re-pair."},
                    status=status.HTTP_409_CONFLICT,
                )

            device = IoTDevice.objects.create(
                user=request.user,
                name=name,
                device_type=pairing.device_type,
                device_id=pairing.hardware_id,
                api_key=generate_api_key(prefix="ask_iot"),
                api_key_expires_at=timezone.now() + timedelta(days=365),
            )
            pairing.device = device
            pairing.status = DevicePairing.Status.CLAIMED
            pairing.claimed_at = timezone.now()
            pairing.save(update_fields=["device", "status", "claimed_at"])

        return Response(
            IoTDeviceSerializer(device).data,
            status=status.HTTP_200_OK,
        )


class PairingStatusView(APIView):
    """GET /api/v1/iot/pair/status/<code>/  — device polls, picks up api_key.

    Replies:
      - 200 {"status": "pending"}                                  still waiting
      - 200 {"status": "paired", "api_key": "...", "device_id": N} claimed — consume it
      - 404 if the code doesn't exist or expired

    Returning the api_key flips the pairing to CONSUMED so a second poll
    can't re-leak it. The device is expected to persist it to NVS on the
    first successful response.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request, pairing_code: str):
        try:
            pairing = DevicePairing.objects.select_related("device").get(pairing_code=pairing_code)
        except DevicePairing.DoesNotExist:
            return Response(
                {"detail": "Unknown pairing code."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Lazy expiry: we don't have a cron cleaning these up, so mark on read.
        if pairing.status == DevicePairing.Status.PENDING and pairing.is_expired():
            pairing.status = DevicePairing.Status.EXPIRED
            pairing.save(update_fields=["status"])

        if pairing.status == DevicePairing.Status.PENDING:
            return Response({"status": "pending"})

        if pairing.status == DevicePairing.Status.CLAIMED:
            # One-shot delivery of the api_key.
            api_key = pairing.device.api_key
            device_id = pairing.device.id
            pairing.status = DevicePairing.Status.CONSUMED
            pairing.save(update_fields=["status"])
            return Response({"status": "paired", "api_key": api_key, "device_id": device_id})

        if pairing.status == DevicePairing.Status.CONSUMED:
            # Device already picked up the key. Don't leak it again.
            return Response({"status": "already_consumed"}, status=status.HTTP_410_GONE)

        # EXPIRED
        return Response({"status": "expired"}, status=status.HTTP_410_GONE)


class ReleaseHardwareView(APIView):
    """POST /api/v1/iot/pair/release/  — admin removes a stale hardware registration.

    Lets a superuser delete a device record by hardware_id (or by pairing_code
    to look it up automatically). Use this when a device was previously paired
    under a different account and needs to be re-paired.

    Body (one of):
      {"hardware_id": "AABBCC112233"}
      {"pairing_code": "840139"}        <- looks up hardware_id from the live pairing
    """

    permission_classes = [IsAdminUser]

    def post(self, request):
        hardware_id = request.data.get("hardware_id", "").strip()
        pairing_code = request.data.get("pairing_code", "").strip()

        if not hardware_id and not pairing_code:
            return Response(
                {"detail": "Provide either hardware_id or pairing_code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not hardware_id:
            try:
                pairing = DevicePairing.objects.get(pairing_code=pairing_code)
                hardware_id = pairing.hardware_id
            except DevicePairing.DoesNotExist:
                return Response(
                    {"detail": "No pairing record found for that code."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        deleted_count, _ = IoTDevice.objects.filter(device_id=hardware_id).delete()
        if deleted_count == 0:
            return Response(
                {"detail": "No registered device found with that hardware_id."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "detail": f"Removed {deleted_count} device(s) for hardware_id={hardware_id}. Reboot the ESP32 to re-pair."
            },
            status=status.HTTP_200_OK,
        )
