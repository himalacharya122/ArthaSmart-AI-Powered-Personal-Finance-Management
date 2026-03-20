"""Serializers for chat conversations and messages."""
from rest_framework import serializers # type: ignore

from .models import ChatConversation, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    """Single chat message."""

    class Meta:
        model = ChatMessage
        fields = [
            "id", "role", "content", "intent", "entities",
            "expense", "income", "tokens_used", "response_time_ms",
            "created_at",
        ]
        read_only_fields = fields


class ChatConversationListSerializer(serializers.ModelSerializer):
    """Lightweight conversation for list views."""

    class Meta:
        model = ChatConversation
        fields = [
            "id", "title", "is_active", "message_count",
            "last_message_at", "created_at", "updated_at",
        ]


class ChatConversationDetailSerializer(serializers.ModelSerializer):
    """Conversation with messages for detail view."""

    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatConversation
        fields = [
            "id", "title", "is_active", "message_count",
            "last_message_at", "metadata",
            "created_at", "updated_at", "messages",
        ]
        read_only_fields = [
            "id", "message_count", "last_message_at",
            "created_at", "updated_at",
        ]


class SendMessageSerializer(serializers.Serializer):
    """Send a message to the AI chatbot."""

    content = serializers.CharField(min_length=1, max_length=4000)
