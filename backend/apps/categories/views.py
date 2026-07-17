"""Category management views."""

from django.db.models import Q  # type: ignore
from django.utils.text import slugify  # type: ignore
from django_filters.rest_framework import DjangoFilterBackend  # type: ignore
from rest_framework import status, viewsets  # type: ignore
from rest_framework.exceptions import PermissionDenied  # type: ignore
from rest_framework.filters import OrderingFilter, SearchFilter  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """CRUD for categories. Users see system defaults + their own custom ones.

    System default categories (is_default=True) cannot be edited or deleted.
    """

    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["type", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return system defaults + user's custom categories."""
        return Category.objects.filter(Q(is_default=True) | Q(user=self.request.user)).filter(
            is_active=True
        )

    def create(self, request, *args, **kwargs):
        """Create a custom category, reactivating a soft-deleted one if it exists."""
        name = request.data.get("name", "")
        category_type = request.data.get("type", "")
        slug = slugify(name)

        existing = Category.objects.filter(
            user=request.user,
            slug=slug,
            type=category_type,
            is_active=False,
        ).first()

        if existing:
            existing.name = name
            existing.is_active = True
            existing.save(update_fields=["name", "is_active"])
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Create a custom (non-default) category for the current user."""
        serializer.save(user=self.request.user, is_default=False)

    def perform_update(self, serializer):
        if serializer.instance.is_default:
            raise PermissionDenied("System default categories cannot be edited.")
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You can only edit your own categories.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.is_default:
            raise PermissionDenied("System default categories cannot be deleted.")
        if instance.user != self.request.user:
            raise PermissionDenied("You can only delete your own categories.")
        # Soft delete: deactivate instead of removing
        instance.is_active = False
        instance.save(update_fields=["is_active"])
