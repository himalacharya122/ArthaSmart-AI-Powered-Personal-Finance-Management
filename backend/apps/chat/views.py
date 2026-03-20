"""Chat conversation and message views."""
from django.utils import timezone # type: ignore
from rest_framework import mixins, status, viewsets # type: ignore
from rest_framework.decorators import action # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore

from .models import ChatConversation, ChatMessage
from .serializers import (
    ChatConversationDetailSerializer,
    ChatConversationListSerializer,
    ChatMessageSerializer,
    SendMessageSerializer,
)


class ChatConversationViewSet(viewsets.ModelViewSet):
    """CRUD for chat conversations + send message action."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ChatConversationListSerializer
        if self.action == "send_message":
            return SendMessageSerializer
        return ChatConversationDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        """Archive instead of delete."""
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="messages")
    def send_message(self, request, pk=None):
        """POST /api/v1/chat/conversations/{id}/messages/ — Send message to AI."""
        conversation = self.get_object()
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]

        # Save user message
        user_msg = ChatMessage.objects.create(
            conversation=conversation,
            role="user",
            content=content,
        )

        # TODO: Replace with actual AI integration (FastAPI microservice call)
        # For now, return a placeholder response
        assistant_msg = ChatMessage.objects.create(
            conversation=conversation,
            role="assistant",
            content=f"I received your message: \"{content}\". AI integration coming soon!",
            intent="general",
        )

        # Update conversation counters
        conversation.message_count = conversation.messages.count()
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=["message_count", "last_message_at"])

        return Response(
            {
                "user_message": ChatMessageSerializer(user_msg).data,
                "assistant_message": ChatMessageSerializer(assistant_msg).data,
            },
            status=status.HTTP_201_CREATED,
        )
