"""Category URL configuration."""
from django.urls import include, path # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore

from . import views

app_name = "categories"

router = DefaultRouter()
router.register("", views.CategoryViewSet, basename="category")

urlpatterns = [
    path("", include(router.urls)),
]
