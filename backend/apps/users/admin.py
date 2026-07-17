from django.contrib import admin  # type: ignore
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin  # type: ignore

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "preferred_currency", "is_active", "date_joined")
    list_filter = ("is_active", "is_email_verified", "preferred_currency")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-date_joined",)
