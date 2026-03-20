"""Shared ViewSet mixins for ArthaSmart API."""
from apps.reports.models import AuditLog


class OwnerQuerySetMixin:
    """Filter queryset to only return objects owned by the requesting user.

    Expects the model to have a `user` ForeignKey field.
    """

    owner_field = "user"

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(**{self.owner_field: self.request.user})


class PerformCreateWithUserMixin:
    """Automatically set user=request.user on create."""

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SoftDeleteMixin:
    """Override destroy() to set is_deleted=True instead of hard delete."""

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class AuditMixin:
    """Auto-create AuditLog entries on create/update/delete."""

    def _get_client_ip(self):
        request = self.request
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def _create_audit_log(self, action, instance, changes=None):
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
            resource_type=instance.__class__.__name__.lower(),
            resource_id=instance.id,
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get("HTTP_USER_AGENT", ""),
            changes=changes or {},
        )

    def perform_create(self, serializer):
        instance = serializer.save(
            **({self.owner_field: self.request.user} if hasattr(self, "owner_field") else {})
        )
        self._create_audit_log("create", instance, serializer.validated_data)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self._create_audit_log("update", instance, serializer.validated_data)
        return instance

    def perform_destroy(self, instance):
        self._create_audit_log("delete", instance)
        # If the model supports soft delete, use it
        if hasattr(instance, "is_deleted"):
            instance.is_deleted = True
            instance.save(update_fields=["is_deleted"])
        else:
            instance.delete()
