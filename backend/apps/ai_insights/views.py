"""AI insights views."""
import logging

from django_filters.rest_framework import DjangoFilterBackend  # type: ignore
from rest_framework import mixins, status, viewsets  # type: ignore
from rest_framework.decorators import action  # type: ignore
from rest_framework.filters import OrderingFilter  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore

from .models import AIInsight
from .serializers import AIInsightSerializer

logger = logging.getLogger(__name__)


class AIInsightViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """List, read, dismiss, and generate AI-generated insights."""

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

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """POST /api/v1/insights/generate/ — Generate new insights on demand.

        Calls the AI service to analyze the user's financial data and create
        new insights. Returns the newly created insights.
        """
        from .services import generate_insights_for_user

        try:
            new_insights = generate_insights_for_user(request.user)
            return Response(
                {
                    "generated": len(new_insights),
                    "insights": AIInsightSerializer(new_insights, many=True).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.error("Insight generation failed: %s", exc)
            return Response(
                {"detail": "Failed to generate insights. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @action(detail=False, methods=["post"], url_path="update-memory")
    def update_memory(self, request):
        """POST /api/v1/insights/update-memory/ — Update AI memory profile.

        Analyzes spending patterns and updates the user's AI memory.
        """
        from .services import update_user_memory

        try:
            result = update_user_memory(request.user)
            return Response(
                {
                    "personality": result.get("financial_personality", ""),
                    "new_facts": result.get("new_facts", []),
                    "message": "Memory updated successfully",
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.error("Memory update failed: %s", exc)
            return Response(
                {"detail": "Failed to update memory."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
