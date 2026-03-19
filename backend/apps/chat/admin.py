from django.contrib import admin # type: ignore

from .models import ChatConversation, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ("role", "content", "intent", "tokens_used", "created_at")


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "message_count", "is_active", "last_message_at")
    list_filter = ("is_active",)
    search_fields = ("user__email", "title")
    inlines = [ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "intent", "tokens_used", "created_at")
    list_filter = ("role", "intent")
    search_fields = ("content",)