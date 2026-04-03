"""Serializers for authentication and user profile."""
from django.contrib.auth import authenticate # type: ignore
from django.contrib.auth.password_validation import validate_password # type: ignore
from rest_framework import serializers # type: ignore
from rest_framework_simplejwt.tokens import RefreshToken # type: ignore

from .models import User


# Auth serializers

class RegisterSerializer(serializers.ModelSerializer):
    """Create a new user account and return JWT tokens."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email", "username", "first_name", "last_name",
            "password", "password_confirm",
        ]

    def validate_email(self, value):
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Authenticate with email + password, return JWT tokens."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].lower()
        password = attrs["password"]
        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )
        if not user:
            raise serializers.ValidationError(
                {"detail": "Invalid email or password."}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "Account is deactivated."}
            )
        if not user.is_email_verified:
            raise serializers.ValidationError(
                {
                    "detail": "Please verify your email before signing in.",
                    "email": user.email,
                    "code": "EMAIL_NOT_VERIFIED",
                }
            )
        attrs["user"] = user
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Change password for authenticated user."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        validate_password(attrs["new_password"])
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Request a password reset email."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Set a new password using the reset token."""

    token = serializers.CharField()
    uid = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        validate_password(attrs["new_password"])
        return attrs


class EmailVerifySerializer(serializers.Serializer):
    """Verify email with a 6-digit code."""

    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_email(self, value):
        return value.lower()


class ResendVerificationSerializer(serializers.Serializer):
    """Resend email verification code."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class GoogleAuthSerializer(serializers.Serializer):
    """Authenticate with a Google OAuth token."""
    token = serializers.CharField(help_text="Google access token or ID token")


class LogoutSerializer(serializers.Serializer):
    """Blacklist the refresh token on logout."""

    refresh = serializers.CharField()


# User profile serializers

class UserSerializer(serializers.ModelSerializer):
    """Read-only representation of the user (embedded in auth responses)."""

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "first_name", "last_name",
            "phone_number", "preferred_currency", "monthly_income_goal",
            "timezone", "profile_picture", "is_email_verified",
            "date_joined", "updated_at",
        ]
        read_only_fields = fields


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Update editable profile fields."""

    class Meta:
        model = User
        fields = [
            "first_name", "last_name", "phone_number",
            "preferred_currency", "monthly_income_goal",
            "timezone", "profile_picture",
        ]


# Token helper

def get_tokens_for_user(user):
    """Generate access + refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }
