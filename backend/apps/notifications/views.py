"""Notification management views."""
from django_filters.rest_framework import DjangoFilterBackend # type: ignore
from rest_framework import mixins, status, viewsets # type: ignore
from rest_framework.decorators import action # type: ignore
from rest_framework.filters import OrderingFilter # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework.views import APIView # type: ignore

from .models import Notification, NotificationPreference
from .serializers import (
    BulkNotificationPreferenceSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
)


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """List, read, and manage notifications."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["is_read", "notification_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """GET /api/v1/notifications/unread-count/"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        """POST /api/v1/notifications/{id}/read/"""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        """POST /api/v1/notifications/read-all/"""
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})


class NotificationPreferenceView(APIView):
    """GET/PUT /api/v1/notifications/preferences/ — Manage notification preferences."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs = NotificationPreference.objects.filter(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, many=True)
        return Response({"preferences": serializer.data})

    def put(self, request):
        serializer = BulkNotificationPreferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        results = []
        for pref_data in serializer.validated_data["preferences"]:
            notification_type = pref_data.pop("notification_type")
            pref, _ = NotificationPreference.objects.update_or_create(
                user=request.user,
                notification_type=notification_type,
                defaults=pref_data,
            )
            results.append(pref)

        return Response({
            "preferences": NotificationPreferenceSerializer(results, many=True).data,
        })
