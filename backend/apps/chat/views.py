"""Chat conversation and message views — with full AI integration."""

import logging

from django.utils import timezone  # type: ignore
from rest_framework import status, viewsets  # type: ignore
from rest_framework.decorators import action  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore

from .models import ChatConversation, ChatMessage
from .serializers import (
    ChatConversationDetailSerializer,
    ChatConversationListSerializer,
    ChatMessageSerializer,
    SendMessageSerializer,
)
from .services.ai_client import call_ai_chat
from .services.context_builder import build_user_context, build_user_memory
from .services.action_executor import execute_actions

logger = logging.getLogger(__name__)


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
        """POST /api/v1/chat/conversations/{id}/messages/ — Send message to AI.

        Flow:
        1. Save user message
        2. Build financial context + user memory
        3. Get conversation history
        4. Call AI service
        5. If AI proposes actions → store as PENDING (not executed yet)
        6. Save assistant message with pending actions
        7. Update user memory with AI learnings
        8. Return both messages
        """
        conversation = self.get_object()
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]
        user = request.user

        # 1. Save user message
        user_msg = ChatMessage.objects.create(
            conversation=conversation,
            role="user",
            content=content,
        )

        # 2. Build context
        user_context = build_user_context(user)
        user_memory = build_user_memory(user)

        # 3. Get conversation history (last N messages) — include action context
        history_qs = (
            ChatMessage.objects.filter(conversation=conversation)
            .exclude(id=user_msg.id)
            .order_by("-created_at")[:10]
        )
        conversation_history = []
        for msg in reversed(list(history_qs)):
            entry = {"role": msg.role, "content": msg.content}
            # Append action context so the AI knows what was already proposed/done
            if msg.role == "assistant" and msg.entities:
                actions = msg.entities.get("actions", [])
                action_status = msg.entities.get("action_status", "none")
                action_results = msg.entities.get("action_results", {})

                if actions and action_status != "none":
                    action_parts = []
                    for a in actions:
                        a_type = a.get("type", "unknown")
                        a_data = a.get("data", {})
                        action_parts.append(f"{a_type}({a_data})")
                    action_desc = ", ".join(action_parts)

                    # Include confirmed result IDs so the AI knows the actual saved IDs
                    result_desc = ""
                    if action_status == "confirmed" and action_results:
                        executed = action_results.get("executed", [])
                        if executed:
                            result_parts = []
                            for r in executed:
                                r_type = r.get("type", "")
                                r_id = r.get("id")
                                if r_id:
                                    result_parts.append(f"{r_type} saved as ID#{r_id}")
                                elif r.get("deleted"):
                                    result_parts.append(f"{r_type} deleted ID#{r.get('id', '?')}")
                            if result_parts:
                                result_desc = f" Results: {', '.join(result_parts)}"

                    entry["content"] += f"\n[SYSTEM: Actions were {action_status}: {action_desc}{result_desc}]"
            conversation_history.append(entry)

        # 4. Call AI service
        ai_payload = {
            "message": content,
            "conversation_id": conversation.id,
            "user_context": user_context,
            "user_memory": user_memory,
            "conversation_history": conversation_history,
        }

        ai_response = call_ai_chat(ai_payload)

        # 5. Store actions as PENDING (not executed)
        actions = ai_response.get("actions", [])
        action_status = "pending" if actions else "none"

        # 6. Save assistant message
        assistant_msg = ChatMessage.objects.create(
            conversation=conversation,
            role="assistant",
            content=ai_response.get("reply", "I'm not sure how to respond to that."),
            intent=ai_response.get("intent", "general"),
            entities={
                "actions": actions,
                "action_status": action_status,
                "action_results": {},
            },
            tokens_used=ai_response.get("tokens_used"),
            response_time_ms=ai_response.get("response_time_ms"),
        )

        # 7. Update user memory
        memory_updates = ai_response.get("memory_updates", [])
        if memory_updates:
            _update_user_memory(user, memory_updates)

        # 8. Auto-generate conversation title if first exchange
        msg_count = conversation.messages.count()
        if msg_count <= 2 and content:
            title = content[:60] + ("..." if len(content) > 60 else "")
            conversation.title = title

        conversation.message_count = msg_count
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=["message_count", "last_message_at", "title"])

        return Response(
            {
                "user_message": ChatMessageSerializer(user_msg).data,
                "assistant_message": ChatMessageSerializer(assistant_msg).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="messages/(?P<message_id>[0-9]+)/confirm")
    def confirm_actions(self, request, pk=None, message_id=None):
        """POST /api/v1/chat/conversations/{id}/messages/{msg_id}/confirm/

        Executes pending actions from an assistant message.
        """
        conversation = self.get_object()
        user = request.user

        try:
            msg = ChatMessage.objects.get(
                id=message_id, conversation=conversation, role="assistant",
            )
        except ChatMessage.DoesNotExist:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        entities = msg.entities or {}
        if entities.get("action_status") != "pending":
            return Response(
                {"detail": "No pending actions to confirm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        actions = entities.get("actions", [])
        if not actions:
            return Response(
                {"detail": "No actions found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Execute the actions
        action_results = execute_actions(user, actions)

        # Link created records to the message
        linked_expense = None
        linked_income = None
        for executed in action_results.get("executed", []):
            if executed.get("type") == "create_expense" and executed.get("id"):
                from apps.expenses.models import Expense  # type: ignore
                try:
                    linked_expense = Expense.objects.get(id=executed["id"])
                except Expense.DoesNotExist:
                    pass
            elif executed.get("type") == "create_income" and executed.get("id"):
                from apps.expenses.models import Income  # type: ignore
                try:
                    linked_income = Income.objects.get(id=executed["id"])
                except Income.DoesNotExist:
                    pass

        # Update the message
        msg.entities = {
            **entities,
            "action_status": "confirmed",
            "action_results": action_results,
        }
        msg.expense = linked_expense
        msg.income = linked_income
        msg.save(update_fields=["entities", "expense", "income"])

        return Response(
            {
                "message": ChatMessageSerializer(msg).data,
                "action_results": action_results,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="messages/(?P<message_id>[0-9]+)/reject")
    def reject_actions(self, request, pk=None, message_id=None):
        """POST /api/v1/chat/conversations/{id}/messages/{msg_id}/reject/

        Rejects pending actions — marks as cancelled, nothing saved.
        """
        conversation = self.get_object()

        try:
            msg = ChatMessage.objects.get(
                id=message_id, conversation=conversation, role="assistant",
            )
        except ChatMessage.DoesNotExist:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        entities = msg.entities or {}
        if entities.get("action_status") != "pending":
            return Response(
                {"detail": "No pending actions to reject."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        msg.entities = {
            **entities,
            "action_status": "rejected",
            "action_results": {},
        }
        msg.save(update_fields=["entities"])

        return Response(
            {"message": ChatMessageSerializer(msg).data},
            status=status.HTTP_200_OK,
        )


def _update_user_memory(user, memory_updates: list[dict]):
    """Store new facts/goals in the user's AI memory."""
    try:
        from .models import UserAIMemory

        memory, _created = UserAIMemory.objects.get_or_create(user=user)

        for update in memory_updates:
            update_type = update.get("type", "fact")
            content = update.get("content", "")
            if not content:
                continue

            if update_type == "goal":
                if content not in memory.goals:
                    goals = memory.goals or []
                    goals.append(content)
                    memory.goals = goals[-20:]
            else:
                if content not in memory.facts:
                    facts = memory.facts or []
                    facts.append(content)
                    memory.facts = facts[-50:]

        memory.save()
        logger.info("Updated AI memory for user %d: %d updates", user.id, len(memory_updates))

    except Exception as exc:
        logger.warning("Failed to update AI memory: %s", exc)
