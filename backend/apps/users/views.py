"""Authentication and user profile views."""
import logging

from django.contrib.auth.tokens import default_token_generator # type: ignore
from django.core.mail import send_mail # type: ignore
from django.conf import settings # type: ignore
from django.template.loader import render_to_string # type: ignore
from django.utils.encoding import force_bytes, force_str # type: ignore
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode # type: ignore

from rest_framework import generics, status # type: ignore
from rest_framework.permissions import AllowAny, IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework.views import APIView # type: ignore
from rest_framework_simplejwt.tokens import RefreshToken # type: ignore
from rest_framework_simplejwt.exceptions import TokenError # type: ignore

from apps.reports.models import AuditLog
from apps.shared.utils import get_client_ip

from .models import User
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
    get_tokens_for_user,
)

logger = logging.getLogger(__name__)


# Auth views

class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Create a new account."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        AuditLog.objects.create(
            user=user,
            action="create",
            resource_type="user",
            resource_id=user.id,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": get_tokens_for_user(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/v1/auth/login/ — Authenticate and return tokens."""

    permission_classes = [AllowAny]
    serializer_class = LoginSerializer  # For Swagger schema

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        AuditLog.objects.create(
            user=user,
            action="login",
            resource_type="user",
            resource_id=user.id,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": get_tokens_for_user(user),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklist the refresh token."""

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Token is invalid or already blacklisted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        AuditLog.objects.create(
            user=request.user,
            action="logout",
            resource_type="user",
            resource_id=request.user.id,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(status=status.HTTP_205_RESET_CONTENT)


class PasswordChangeView(APIView):
    """POST /api/v1/auth/password/change/ — Change password."""

    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password/reset/ — Send a password reset email."""

    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        # Always return success to avoid email enumeration
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "If an account with that email exists, a reset link has been sent."},
                status=status.HTTP_200_OK,
            )

        # Generate token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Build reset link (for now, point to a web page or deep link)
        reset_url = f"arthasmart://reset-password?uid={uid}&token={token}"

        # Send email
        subject = "ArthaSmart — Reset Your Password"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            f"We received a request to reset your password.\n\n"
            f"Your password reset code:\n"
            f"  UID: {uid}\n"
            f"  Token: {token}\n\n"
            f"Or use this link: {reset_url}\n\n"
            f"This link expires in 1 hour.\n\n"
            f"If you didn't request this, you can safely ignore this email.\n\n"
            f"— ArthaSmart Team"
        )

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            logger.info("Password reset email sent to %s", email)
        except Exception as exc:
            logger.error("Failed to send password reset email: %s", exc)
            return Response(
                {"detail": "Failed to send email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "If an account with that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password/reset/confirm/ — Set new password with token."""

    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        logger.info("Password reset completed for user %s", user.email)

        return Response(
            {"detail": "Password has been reset successfully. You can now sign in."},
            status=status.HTTP_200_OK,
        )


# Profile views

class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/profile/ — View or update current user profile."""

    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return UserProfileUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        # Return the full user representation after update
        response.data = UserSerializer(request.user).data
        return response


class ProfileDeleteView(APIView):
    """DELETE /api/v1/auth/profile/ — Deactivate account."""

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.is_active = False
        user.save(update_fields=["is_active"])

        AuditLog.objects.create(
            user=user,
            action="delete",
            resource_type="user",
            resource_id=user.id,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(status=status.HTTP_204_NO_CONTENT)
