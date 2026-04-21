"""Tests for the LLM tool/function definitions.

These tools are the AI's CRUD interface. Their schema is what tells the LLM
what arguments to send back. If a required field disappears or a name
drifts, the parser will silently produce broken actions.
"""

from __future__ import annotations

from app.services.action_parser import detect_intent
from app.services.tool_definitions import TOOLS

EXPECTED_TOOL_NAMES = {
    "create_expense",
    "create_income",
    "update_expense",
    "delete_expense",
    "update_income",
    "delete_income",
}


class TestToolDefinitions:
    def test_six_tools_defined(self):
        assert len(TOOLS) == 6

    def test_all_tools_are_function_type(self):
        for tool in TOOLS:
            assert tool["type"] == "function"
            assert "function" in tool

    def test_all_expected_names_present(self):
        names = {t["function"]["name"] for t in TOOLS}
        assert names == EXPECTED_TOOL_NAMES

    def test_each_tool_has_description(self):
        for tool in TOOLS:
            desc = tool["function"]["description"]
            assert isinstance(desc, str) and len(desc) > 20, (
                f"{tool['function']['name']} description is too short — LLM needs "
                f"context to know when to call it"
            )

    def test_each_tool_has_parameters_schema(self):
        for tool in TOOLS:
            params = tool["function"]["parameters"]
            assert params["type"] == "object"
            assert "properties" in params
            assert "required" in params

    def test_create_expense_requires_amount(self):
        t = next(t for t in TOOLS if t["function"]["name"] == "create_expense")
        assert "amount" in t["function"]["parameters"]["required"]

    def test_create_income_requires_amount_and_source(self):
        t = next(t for t in TOOLS if t["function"]["name"] == "create_income")
        required = t["function"]["parameters"]["required"]
        assert "amount" in required
        assert "source_name" in required

    def test_update_expense_requires_id(self):
        t = next(t for t in TOOLS if t["function"]["name"] == "update_expense")
        assert "expense_id" in t["function"]["parameters"]["required"]

    def test_delete_endpoints_only_require_id(self):
        for name in ("delete_expense", "delete_income"):
            t = next(t for t in TOOLS if t["function"]["name"] == name)
            req = t["function"]["parameters"]["required"]
            id_field = "expense_id" if "expense" in name else "income_id"
            assert req == [id_field]


class TestToolNamesMatchIntentMap:
    """Each tool's name must round-trip through detect_intent without falling
    back to 'general'."""

    def test_every_tool_name_has_an_intent_mapping(self):
        for tool in TOOLS:
            name = tool["function"]["name"]
            tcs = [{"function": {"name": name}}]
            intent = detect_intent(tcs, None, "")
            assert (
                intent != "general"
            ), f"Tool '{name}' has no intent mapping in action_parser.detect_intent"
