"""AI chatbot conversation, message, and memory models."""

from django.conf import settings  # type: ignore
from django.db import models  # type: ignore


class ChatConversation(models.Model):
    """A conversation session between a user and the AI chatbot."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversations",
    )
    title = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(
        default=True,
        help_text="FALSE = archived conversation",
    )
    message_count = models.IntegerField(
        default=0,
        help_text="Cached count of messages (updated on insert)",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(
        default=dict, blank=True,
        help_text="Context summary, model version, etc.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "chat_conversations"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["user", "last_message_at"]),
        ]

    def __str__(self):
        return f"Chat #{self.id} | {self.user.email} | {self.title or 'Untitled'}"


class ChatMessage(models.Model):
    """A single message within a conversation (user or assistant)."""

    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    intent = models.CharField(
        max_length=50, blank=True,
        help_text="Detected intent: add_expense, query_balance, get_insight, general",
    )
    entities = models.JSONField(
        default=dict, blank=True,
        help_text="Extracted entities: {amount, category, merchant, date}",
    )
    expense = models.ForeignKey(
        "expenses.Expense",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages",
        help_text="If this message created an expense",
    )
    income = models.ForeignKey(
        "expenses.Income",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages",
        help_text="If this message created an income",
    )
    tokens_used = models.IntegerField(
        null=True, blank=True,
        help_text="LLM tokens consumed (for API cost tracking)",
    )
    response_time_ms = models.IntegerField(
        null=True, blank=True,
        help_text="AI response generation time in ms",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["intent"]),
        ]

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."


class UserAIMemory(models.Model):
    """Accumulated AI knowledge about a user's financial behavior.

    This is how the AI *learns* and *remembers* each user over time.
    Updated after each conversation and periodically by background tasks.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_memory",
    )

    financial_personality = models.CharField(
        max_length=50, blank=True,
        help_text="saver, balanced, spender, impulsive, planned",
    )

    facts = models.JSONField(
        default=list, blank=True,
        help_text=(
            "List of learned facts: "
            "['Shops at Bhat-Bhateni weekly', 'Salary on 1st of month']"
        ),
    )

    spending_patterns = models.JSONField(
        default=dict, blank=True,
        help_text=(
            "{avg_daily_spend, top_merchants, peak_spending_days, "
            "category_preferences}"
        ),
    )

    goals = models.JSONField(
        default=list, blank=True,
        help_text="['Save 10000/month', 'Reduce dining out', 'Build emergency fund']",
    )

    conversation_summary = models.TextField(
        blank=True,
        help_text="Compressed summary of past conversations for context continuity",
    )

    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_ai_memory"
        verbose_name = "User AI Memory"
        verbose_name_plural = "User AI Memories"

    def __str__(self):
        return f"AI Memory | {self.user.email} | {self.financial_personality or 'Unknown'}"
