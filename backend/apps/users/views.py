"""Authentication and user profile views."""

import logging

from django.conf import settings  # type: ignore
from django.contrib.auth.tokens import default_token_generator  # type: ignore
from django.core.mail import send_mail  # type: ignore
from django.utils.encoding import force_bytes, force_str  # type: ignore
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode  # type: ignore
from rest_framework import generics, status  # type: ignore
from rest_framework.permissions import AllowAny, IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.views import APIView  # type: ignore
from rest_framework_simplejwt.exceptions import TokenError  # type: ignore
from rest_framework_simplejwt.tokens import RefreshToken  # type: ignore

from apps.reports.models import AuditLog
from apps.shared.utils import get_client_ip

from .models import EmailVerification, User
from .serializers import (
    EmailVerifySerializer,
    GoogleAuthSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
    get_tokens_for_user,
)

logger = logging.getLogger(__name__)


# Auth views


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Create account and send verification email."""

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

        # Send verification email
        verification = EmailVerification.create_for_user(user)
        subject = "ArthaSmart — Verify Your Email"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            f"Welcome to ArthaSmart! Your verification code is:\n\n"
            f"    {verification.code}\n\n"
            f"This code expires in 15 minutes.\n\n"
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
            logger.info("Verification email sent to %s", user.email)
        except Exception as exc:
            logger.error("Failed to send verification email: %s", exc)

        return Response(
            {
                "detail": "Account created. Please check your email for a verification code.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    """POST /api/v1/auth/verify-email/ — Verify email with 6-digit code."""

    permission_classes = [AllowAny]
    serializer_class = EmailVerifySerializer

    def post(self, request):
        serializer = EmailVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "No account found with this email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_email_verified:
            return Response(
                {"detail": "Email is already verified. You can sign in."},
                status=status.HTTP_200_OK,
            )

        verification = (
            EmailVerification.objects.filter(user=user, code=code, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not verification:
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification.is_expired:
            return Response(
                {"detail": "Verification code has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification.is_used = True
        verification.save(update_fields=["is_used"])

        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        logger.info("Email verified for user %s", user.email)

        return Response(
            {"detail": "Email verified successfully. You can now sign in."},
            status=status.HTTP_200_OK,
        )


class ResendVerificationView(APIView):
    """POST /api/v1/auth/resend-verification/ — Resend verification code."""

    permission_classes = [AllowAny]
    serializer_class = ResendVerificationSerializer

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "If an account with that email exists, a new code has been sent."},
                status=status.HTTP_200_OK,
            )

        if user.is_email_verified:
            return Response(
                {"detail": "Email is already verified."},
                status=status.HTTP_200_OK,
            )

        verification = EmailVerification.create_for_user(user)
        subject = "ArthaSmart — Your New Verification Code"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            f"Your new verification code is:\n\n"
            f"    {verification.code}\n\n"
            f"This code expires in 15 minutes.\n\n"
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
        except Exception as exc:
            logger.error("Failed to resend verification email: %s", exc)
            return Response(
                {"detail": "Failed to send email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "A new verification code has been sent to your email."},
            status=status.HTTP_200_OK,
        )


class GoogleAuthView(APIView):
    """POST /api/v1/auth/google/ — Authenticate with Google OAuth."""

    permission_classes = [AllowAny]
    serializer_class = GoogleAuthSerializer

    def post(self, request):
        from google.auth.transport import requests as google_requests  # type: ignore
        from google.oauth2 import id_token as google_id_token  # type: ignore

        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]

        # Try to verify as ID token first, fall back to userinfo endpoint
        user_info = None

        # Method 1: Verify as Google ID token
        try:
            id_info = google_id_token.verify_oauth2_token(token, google_requests.Request())
            # Check audience matches one of our client IDs
            valid_client_ids = [cid for cid in settings.GOOGLE_CLIENT_IDS if cid]
            if valid_client_ids and id_info.get("aud") not in valid_client_ids:
                return Response(
                    {"detail": "Invalid token audience."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user_info = {
                "email": id_info.get("email"),
                "first_name": id_info.get("given_name", ""),
                "last_name": id_info.get("family_name", ""),
                "picture": id_info.get("picture", ""),
                "email_verified": id_info.get("email_verified", False),
            }
        except Exception as exc:
            logger.debug("Google id_token verification failed: %s", exc)

        # Method 2: Use token as access token to fetch user info
        if not user_info:
            try:
                import requests as http_requests  # type: ignore

                resp = http_requests.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    user_info = {
                        "email": data.get("email"),
                        "first_name": data.get("given_name", ""),
                        "last_name": data.get("family_name", ""),
                        "picture": data.get("picture", ""),
                        "email_verified": data.get("email_verified", False),
                    }
            except Exception as exc:
                logger.debug("Google userinfo fetch failed: %s", exc)

        if not user_info or not user_info.get("email"):
            return Response(
                {"detail": "Invalid or expired Google token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = user_info["email"].lower()

        # Find or create user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            username = email.split("@")[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                email=email,
                username=username,
                first_name=user_info.get("first_name", ""),
                last_name=user_info.get("last_name", ""),
                password=None,  # No password for social accounts
            )
            user.is_email_verified = True  # Google already verified
            user.save(update_fields=["is_email_verified"])

        AuditLog.objects.create(
            user=user,
            action="login",
            resource_type="user",
            resource_id=user.id,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            details={"method": "google_oauth"},
        )

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": get_tokens_for_user(user),
            },
            status=status.HTTP_200_OK,
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
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
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

        # Build reset links
        web_reset_url = f"http://localhost:5173/reset-password/{uid}/{token}"
        mobile_reset_url = f"arthasmart://reset-password?uid={uid}&token={token}"

        # Send email
        subject = "ArthaSmart — Reset Your Password"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            f"We received a request to reset your password.\n\n"
            f"Click this link to reset your password:\n"
            f"  {web_reset_url}\n\n"
            f"Or open this link in the mobile app:\n"
            f"  {mobile_reset_url}\n\n"
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
