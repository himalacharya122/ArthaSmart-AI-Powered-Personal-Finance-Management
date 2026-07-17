"""Authentication and user profile URL configuration."""

from django.urls import path  # type: ignore
from rest_framework_simplejwt.views import TokenRefreshView  # type: ignore

from . import views

app_name = "users"

urlpatterns = [
    # Auth
    path("register/", views.RegisterView.as_view(), name="register"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path(
        "resend-verification/", views.ResendVerificationView.as_view(), name="resend-verification"
    ),
    path("google/", views.GoogleAuthView.as_view(), name="google-auth"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("password/change/", views.PasswordChangeView.as_view(), name="password-change"),
    path("password/reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password/reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    # Profile
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("profile/delete/", views.ProfileDeleteView.as_view(), name="profile-delete"),
]
