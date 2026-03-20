"""AI insights views."""
from django_filters.rest_framework import DjangoFilterBackend # type: ignore
from rest_framework import mixins, viewsets # type: ignore
from rest_framework.decorators import action # type: ignore
from rest_framework.filters import OrderingFilter # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore

from .models import AIInsight
from .serializers import AIInsightSerializer


class AIInsightViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """List, read, and dismiss AI-generated insights."""

    serializer_class = AIInsightSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["insight_type", "severity", "is_read", "is_dismissed"]
    ordering = ["-generated_at"]

    def get_queryset(self):
        return AIInsight.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        """POST /api/v1/insights/{id}/read/"""
        insight = self.get_object()
        insight.is_read = True
        insight.save(update_fields=["is_read"])
        return Response(AIInsightSerializer(insight).data)

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        """POST /api/v1/insights/{id}/dismiss/"""
        insight = self.get_object()
        insight.is_dismissed = True
        insight.save(update_fields=["is_dismissed"])
        return Response(AIInsightSerializer(insight).data)
