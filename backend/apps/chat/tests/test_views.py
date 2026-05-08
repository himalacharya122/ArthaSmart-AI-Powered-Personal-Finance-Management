"""ChatConversationViewSet — CRUD, send_message, confirm/reject, voice proxy."""

from __future__ import annotations

import re
from unittest.mock import patch

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.chat.models import ChatConversation, ChatMessage, UserAIMemory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("chat:conversation-list")
VOICE_URL = reverse("chat:voice-transcribe")


def _detail(pk):
    return reverse("chat:conversation-detail", args=[pk])


def _send(pk):
    return reverse("chat:conversation-send-message", args=[pk])


def _confirm(pk, msg_id):
    return reverse("chat:conversation-confirm-actions", args=[pk, msg_id])


def _reject(pk, msg_id):
    return reverse("chat:conversation-reject-actions", args=[pk, msg_id])


class TestConversationCRUD:
    def test_list_scoped(self, authenticated_client, user, other_user):
        from django.utils import timezone  # type: ignore

        now = timezone.now()
        ChatConversation.objects.create(user=user, title="mine", last_message_at=now)
        ChatConversation.objects.create(user=other_user, title="theirs", last_message_at=now)
        r = authenticated_client.get(LIST_URL)
        titles = {c["title"] for c in r.data["results"]}
        assert titles == {"mine"}

    def test_create(self, authenticated_client, user):
        r = authenticated_client.post(LIST_URL, {"title": "Hello"}, format="json")
        assert r.status_code == 201
        assert ChatConversation.objects.get(title="Hello").user == user

    def test_archive_on_delete(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        r = authenticated_client.delete(_detail(c.pk))
        assert r.status_code == 204
        c.refresh_from_db()
        assert c.is_active is False
        assert ChatConversation.objects.filter(pk=c.pk).exists()

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401


class TestSendMessage:
    def _ai_reply(self, **kw):
        base = {
            "reply": "Got it!",
            "intent": "general",
            "actions": [],
            "memory_updates": [],
            "tokens_used": 10,
            "response_time_ms": 50,
        }
        base.update(kw)
        return base

    def test_success_saves_both_messages(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        with patch("apps.chat.views.call_ai_chat", return_value=self._ai_reply()):
            r = authenticated_client.post(_send(c.pk), {"content": "Hi there"}, format="json")
        assert r.status_code == 201
        assert ChatMessage.objects.filter(conversation=c, role="user").count() == 1
        assert ChatMessage.objects.filter(conversation=c, role="assistant").count() == 1

    def test_auto_generates_title_on_first_message(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user, title="")
        with patch("apps.chat.views.call_ai_chat", return_value=self._ai_reply()):
            authenticated_client.post(
                _send(c.pk), {"content": "Track my coffee spend"}, format="json"
            )
        c.refresh_from_db()
        assert c.title.startswith("Track")

    def test_actions_stored_as_pending(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        with patch(
            "apps.chat.views.call_ai_chat",
            return_value=self._ai_reply(
                actions=[{"type": "create_expense", "data": {"amount": 100}}]
            ),
        ):
            r = authenticated_client.post(_send(c.pk), {"content": "I spent 100"}, format="json")
        assert r.status_code == 201
        msg = ChatMessage.objects.get(conversation=c, role="assistant")
        assert msg.entities["action_status"] == "pending"
        assert len(msg.entities["actions"]) == 1

    def test_memory_updates_persisted(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        with patch(
            "apps.chat.views.call_ai_chat",
            return_value=self._ai_reply(
                memory_updates=[
                    {"type": "fact", "content": "Has a cat"},
                    {"type": "goal", "content": "Save 10000"},
                ]
            ),
        ):
            authenticated_client.post(_send(c.pk), {"content": "hi"}, format="json")
        mem = UserAIMemory.objects.get(user=user)
        assert "Has a cat" in mem.facts
        assert "Save 10000" in mem.goals

    def test_cannot_send_to_others_conversation(self, authenticated_client, other_user):
        c = ChatConversation.objects.create(user=other_user)
        r = authenticated_client.post(_send(c.pk), {"content": "hi"}, format="json")
        assert r.status_code == 404

    def test_empty_content_rejected(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        r = authenticated_client.post(_send(c.pk), {"content": ""}, format="json")
        assert r.status_code == 400


class TestConfirmActions:
    def _msg_with_pending_action(self, user, action_type="create_expense", data=None):
        c = ChatConversation.objects.create(user=user)
        data = data or {"amount": "50", "category": "Food", "merchant": "KFC"}
        m = ChatMessage.objects.create(
            conversation=c,
            role="assistant",
            content="Add it?",
            entities={
                "actions": [{"type": action_type, "data": data}],
                "action_status": "pending",
                "action_results": {},
            },
        )
        return c, m

    def test_confirm_executes_action(self, authenticated_client, user, category_factory):
        category_factory(user=user, name="Food", type="expense")
        c, m = self._msg_with_pending_action(user)
        r = authenticated_client.post(_confirm(c.pk, m.pk))
        assert r.status_code == 200
        m.refresh_from_db()
        assert m.entities["action_status"] == "confirmed"
        from apps.expenses.models import Expense

        assert Expense.objects.filter(user=user, merchant="KFC").exists()
        assert m.expense is not None

    def test_cannot_confirm_twice(self, authenticated_client, user):
        c, m = self._msg_with_pending_action(user)
        m.entities = {**m.entities, "action_status": "confirmed"}
        m.save()
        r = authenticated_client.post(_confirm(c.pk, m.pk))
        assert r.status_code == 400

    def test_unknown_message_returns_404(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        r = authenticated_client.post(_confirm(c.pk, 999))
        assert r.status_code == 404


class TestRejectActions:
    def test_reject_marks_cancelled(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        m = ChatMessage.objects.create(
            conversation=c,
            role="assistant",
            content="?",
            entities={
                "actions": [{"type": "create_expense", "data": {"amount": 10}}],
                "action_status": "pending",
                "action_results": {},
            },
        )
        r = authenticated_client.post(_reject(c.pk, m.pk))
        assert r.status_code == 200
        m.refresh_from_db()
        assert m.entities["action_status"] == "rejected"
        from apps.expenses.models import Expense

        assert not Expense.objects.filter(user=user).exists()

    def test_cannot_reject_without_pending(self, authenticated_client, user):
        c = ChatConversation.objects.create(user=user)
        m = ChatMessage.objects.create(
            conversation=c,
            role="assistant",
            content="?",
            entities={"action_status": "none"},
        )
        r = authenticated_client.post(_reject(c.pk, m.pk))
        assert r.status_code == 400


class TestVoiceTranscribe:
    def test_success(self, authenticated_client, httpx_mock):
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/voice/transcribe"),
            json={"text": "hello", "language": "en", "duration_ms": 100},
        )
        r = authenticated_client.post(
            VOICE_URL,
            data={"audio": _fake_audio_file()},
            format="multipart",
        )
        assert r.status_code == 200
        assert r.data["text"] == "hello"

    def test_missing_audio_rejected(self, authenticated_client):
        r = authenticated_client.post(VOICE_URL, data={}, format="multipart")
        assert r.status_code == 400

    def test_ai_service_error_forwarded(self, authenticated_client, httpx_mock):
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/voice/transcribe"),
            status_code=422,
            json={"detail": "Could not detect speech"},
        )
        r = authenticated_client.post(
            VOICE_URL,
            data={"audio": _fake_audio_file()},
            format="multipart",
        )
        assert r.status_code == 422
        assert "speech" in r.data["detail"].lower()

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.post(VOICE_URL, data={}, format="multipart")
        assert r.status_code == 401


def _fake_audio_file():
    from django.core.files.uploadedfile import SimpleUploadedFile  # type: ignore

    return SimpleUploadedFile("a.webm", b"x" * 200, content_type="audio/webm")
