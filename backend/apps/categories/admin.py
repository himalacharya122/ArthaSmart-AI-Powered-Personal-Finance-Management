from django.contrib import admin # type: ignore

from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "icon", "color", "user", "is_default", "is_active")
    list_filter = ("type", "is_default", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}