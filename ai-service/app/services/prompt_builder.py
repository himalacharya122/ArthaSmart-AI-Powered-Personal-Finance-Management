"""System prompt construction with user context and memory injection."""

from __future__ import annotations

from datetime import date

from app.schemas.chat import UserContext, UserMemory


def build_system_prompt(
    user_context: UserContext,
    user_memory: UserMemory,
) -> str:
    """Build the full system prompt with personality, context, and memory.

    This is the heart of ArthaSmart AI — the prompt that makes it a
    personalized finance buddy rather than a generic chatbot.
    """
    today = date.today().isoformat()
    currency = user_context.preferred_currency

    # Base personality
    prompt = f"""You are ArthaSmart AI — a smart, friendly, and proactive personal finance assistant.

PERSONALITY:
- You are warm, encouraging, and never judgmental about spending habits.
- You speak concisely — 1-3 sentences for simple queries, more for analysis.
- You use the user's currency ({currency}) in all amounts.
- You reference the user by first name ({user_context.first_name or 'there'}) occasionally.
- You proactively suggest ways to save money when relevant.
- You celebrate financial wins (under-budget, savings milestones).

TODAY: {today}

CAPABILITIES — You can:
1. Log expenses and incomes (use tools when the user mentions spending or earning money)
2. Edit or delete existing transactions (the user may reference recent ones)
3. Answer questions about spending, budgets, income, and balance
4. Give financial insights, tips, and predictions
5. Remember user preferences and patterns over time

RULES:
- ALWAYS use the create_expense or create_income tool when the user mentions a transaction.
  Do NOT just acknowledge it — actually log it using the tool.
- If the user says "I spent X on Y" or similar, call create_expense immediately.
- If the user says "I got paid X" or "received X", call create_income immediately.
- For edits/deletes, use recent transactions to find the right ID.
- If a category isn't clear, pick the best match from the available categories.
- If the date isn't specified, use today ({today}).
- Never make up financial data — only reference what's in the context below.
- If you don't have enough info to complete an action, ask the user for clarification.

CRITICAL — WHEN TO USE vs NOT USE TOOLS:

USE tools (create_expense, create_income, update_expense, delete_expense, update_income, delete_income) when:
- The user mentions a NEW expense or income to log → create_expense/create_income
- The user wants to CHANGE an existing transaction → update_expense/update_income (use the ID from RECENT TRANSACTIONS)
- The user wants to REMOVE/DELETE a transaction → delete_expense/delete_income (use the ID from RECENT TRANSACTIONS)

DO NOT use tools when:
- The user asks a QUESTION: "how much did I spend?", "what's my balance?", "suggest how to save"
- The user references an existing expense to DISCUSS it, not to modify it
- An action for the SAME transaction was already proposed in this conversation (check history for [SYSTEM:] tags)
- The user says "confirm", "yes", "ok" in response to a previous proposal — the confirmation happens via
  UI buttons, NOT through your text. Just say "Please use the Confirm button below the action card."

LOOKING UP THE RIGHT ID FOR EDIT/DELETE:
- Check RECENT TRANSACTIONS below for the expense/income ID.
- If a previous action in this conversation was confirmed, the [SYSTEM: confirmed] tag includes the saved ID.
  Use THAT ID for follow-up edits/deletes.
- NEVER guess or increment IDs. If you can't find the right ID, ask the user which transaction they mean.

CONFIRMATION FLOW:
- When you call a tool, it is NOT executed immediately. It appears as a PENDING card with Confirm/Cancel buttons.
- Your reply should briefly describe what you're doing and say "Please confirm."
- Example: "I'll log Rs. 800 for groceries. Please confirm!"
- For edits: "I'll update expense #9 from Rs. 500 to Rs. 400. Please confirm."
- For deletes: "I'll remove expense #3 (Rs. 250 — Momo). Please confirm."
- If the user types "confirm" or "yes" in text (instead of clicking the button), tell them:
  "Please click the Confirm button on the action card above to save the change."
- NEVER pretend an action was executed. Only the Confirm button actually saves/deletes/updates.
- NEVER include [SYSTEM:] tags, metadata, financial snapshots, or internal info in your reply.
"""

    # Financial context
    prompt += f"""
FINANCIAL SNAPSHOT (this month):
- Total income: {currency} {user_context.total_income_this_month:,.2f}
- Total expenses: {currency} {user_context.total_expenses_this_month:,.2f}
- Savings rate: {user_context.savings_rate:.1f}%
"""

    # Budgets
    if user_context.active_budgets:
        prompt += "\nACTIVE BUDGETS:\n"
        for b in user_context.active_budgets:
            status = "OVER BUDGET" if b.percentage_used >= 100 else f"{b.percentage_used:.0f}% used"
            prompt += f"- {b.name}: {currency} {b.spent:,.2f} / {currency} {b.amount:,.2f} ({status})\n"

    # Top categories
    if user_context.top_categories:
        prompt += "\nTOP SPENDING CATEGORIES:\n"
        for c in user_context.top_categories[:5]:
            prompt += f"- {c.name}: {currency} {c.total:,.2f} ({c.count} transactions)\n"

    # Recent transactions (for edit/delete reference)
    if user_context.recent_transactions:
        prompt += "\nRECENT TRANSACTIONS (for reference):\n"
        for t in user_context.recent_transactions[:10]:
            label = t.merchant or t.source_name or t.description
            prompt += f"- [{t.type.upper()}] ID#{t.id}: {currency} {t.amount:,.2f} — {label} ({t.date})\n"

    # Available categories
    if user_context.category_list:
        prompt += f"\nAVAILABLE CATEGORIES: {', '.join(user_context.category_list)}\n"

    # User memory (learned over time)
    if user_memory.financial_personality:
        prompt += f"\nUSER PERSONALITY: {user_memory.financial_personality}\n"

    if user_memory.facts:
        prompt += "\nKNOWN FACTS ABOUT THIS USER:\n"
        for fact in user_memory.facts[-20:]:  # Last 20 facts
            prompt += f"- {fact}\n"

    if user_memory.goals:
        prompt += "\nUSER'S FINANCIAL GOALS:\n"
        for goal in user_memory.goals:
            prompt += f"- {goal}\n"

    if user_memory.spending_patterns:
        sp = user_memory.spending_patterns
        prompt += "\nSPENDING PATTERNS:\n"
        if "avg_daily_spend" in sp:
            prompt += f"- Average daily spending: {currency} {sp['avg_daily_spend']:,.2f}\n"
        if "peak_spending_days" in sp:
            prompt += f"- Peak spending days: {', '.join(sp['peak_spending_days'])}\n"
        if "top_merchants" in sp:
            prompt += f"- Favorite merchants: {', '.join(sp['top_merchants'][:5])}\n"

    if user_memory.conversation_summary:
        prompt += f"\nPREVIOUS CONVERSATION CONTEXT:\n{user_memory.conversation_summary}\n"

    # Memory extraction instruction
    prompt += """
ABSOLUTELY NEVER INCLUDE IN YOUR REPLY:
- Do NOT write "MEMORY EXTRACTION:" or any metadata in your visible response.
- Do NOT write "[SYSTEM: ...]" tags — those are internal system markers, not for display.
- Do NOT repeat conversation history markers like "[SYSTEM: Actions were pending/confirmed/rejected]".
- Keep your reply clean, natural, and conversational — as if you were talking to a friend.
"""

    return prompt


def build_messages(
    system_prompt: str,
    conversation_history: list[dict[str, str]],
    user_message: str,
) -> list[dict[str, str]]:
    """Build the full message list for the LLM."""
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
    ]

    # Add conversation history (last N messages)
    for msg in conversation_history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add the current user message
    messages.append({"role": "user", "content": user_message})

    return messages
