"""Serializers for category management."""
from rest_framework import serializers # type: ignore

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    """Full category serializer for CRUD operations."""

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "icon", "color",
            "type", "is_default", "is_active", "created_at",
        ]
        read_only_fields = ["id", "slug", "is_default", "created_at"]

    def validate_name(self, value):
        """Prevent duplicate category names for the same user + type."""
        user = self.context["request"].user
        category_type = self.initial_data.get(
            "type", self.instance.type if self.instance else None
        )
        qs = Category.objects.filter(
            user=user, name__iexact=value, type=category_type
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"You already have a {category_type} category named '{value}'."
            )
        return value


class CategoryMinimalSerializer(serializers.ModelSerializer):
    """Lightweight serializer for embedding in expense/income responses."""

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon", "color", "type"]
        read_only_fields = fields
