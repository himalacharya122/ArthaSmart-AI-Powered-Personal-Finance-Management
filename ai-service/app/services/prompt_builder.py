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

    # --- Base personality ---
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

CONFIRMATION FLOW (IMPORTANT):
- When you use a tool (create/edit/delete), the action will NOT be saved immediately.
- Instead it is shown to the user as a PENDING action they can Confirm or Cancel.
- So your reply MUST tell the user what you're about to do and ask them to confirm.
- Example: "I'll log Rs. 800 for groceries at Bhat-Bhateni. Please confirm to save it!"
- For deletes: "I'll remove expense #42 (Rs. 500 lunch at KFC). Please confirm."
- For edits: "I'll update expense #42 amount from Rs. 500 to Rs. 600. Please confirm."
- Keep the confirmation message clear and show all the details so the user knows exactly what will happen.
"""

    # --- Financial context ---
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

    # --- User memory (learned over time) ---
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

    # --- Memory extraction instruction ---
    prompt += """
MEMORY EXTRACTION:
After responding, if you learned something new about the user (habits, preferences,
goals, financial situation), include it in your response metadata. This helps you
remember the user better in future conversations. Examples:
- "User gets salary on the 1st of each month"
- "User wants to save for a new laptop"
- "User frequently orders food from Foodmandu"
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
