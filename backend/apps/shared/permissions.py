"""Shared permission classes for ArthaSmart API."""
from rest_framework.permissions import BasePermission # type: ignore


class IsOwner(BasePermission):
    """Object-level permission: only the owner can access the object.

    Expects the object to have a `user` attribute pointing to the owning user.
    """

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsOwnerOrReadOnly(BasePermission):
    """Object-level permission: owner can write, others can read."""

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return obj.user == request.user
