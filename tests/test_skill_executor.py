"""Tests for SkillExecutor and SchemaRegistry."""

from unittest.mock import patch, MagicMock

import pytest
from pydantic import BaseModel

from app.engine import (
    SkillExecutor,
    SkillLoader,
    PromptRenderer,
    SchemaRegistry,
    registry,
)
from app.engine.models import SkillConfig
from app.prompts.templates import DistilledContext, HallucinationGrade


class TestSchemaRegistry:
    """SchemaRegistry — name → Pydantic class mapping."""

    def test_default_registry_has_distilled_and_hallucination(self):
        names = registry.names()
        assert "DistilledContext" in names
        assert "HallucinationGrade" in names

    def test_register_duplicate_with_same_class_is_ok(self):
        reg = SchemaRegistry()
        reg.register(DistilledContext)
        reg.register(DistilledContext)  # idempotent
        assert reg.get("DistilledContext") is DistilledContext

    def test_register_different_classes_with_distinct_names(self):
        """Distinct names register cleanly; no collision expected."""
        reg = SchemaRegistry()
        reg.register(DistilledContext)
        reg.register(HallucinationGrade)
        assert reg.get("DistilledContext") is DistilledContext
        assert reg.get("HallucinationGrade") is HallucinationGrade

    def test_register_different_class_for_same_name_raises(self):
        """Re-registering under the same name with a different class raises."""
        reg = SchemaRegistry()

        # Create a class sharing the exact class name as DistilledContext
        class DistilledContext:
            """Stand-in with the same __name__ as the real schema."""

            def __init__(self) -> None:
                pass

        reg.register(DistilledContext)  # this uses __name__ = "DistilledContext"
        # Now register a different class also named DistilledContext
        class SameNameOther:
            x = 0

        SameNameOther.__name__ = "DistilledContext"
        with pytest.raises(ValueError, match="already registered"):
            reg.register(SameNameOther)

    def test_get_unknown_raises_with_helpful_message(self):
        reg = SchemaRegistry()
        reg.register(DistilledContext)
        # Unknown schema should raise with helpful message that lists available
        with pytest.raises(KeyError, match="not found"):
            reg.get("UnknownSchema")
        # When nothing is registered yet, available should say (empty)
        empty = SchemaRegistry()
        with pytest.raises(KeyError, match=r"Available: \(empty\)"):
            empty.get("Anything")


class TestSkillExecutor:
    """SkillExecutor — config caching, schema resolution, fail-safe logic."""

    def setup_method(self):
        self.loader = SkillLoader()
        self.renderer = PromptRenderer(self.loader)
        self.executor = SkillExecutor(self.loader, self.renderer)

    def test_get_skill_caches(self):
        editor1 = self.executor.get_skill("editor")
        editor2 = self.executor.get_skill("editor")
        assert editor1 is editor2  # cached

    def test_get_skill_unknown_raises(self):
        with pytest.raises(KeyError, match="not found"):
            self.executor.get_skill("not-a-skill-xyz")

    def test_strip_preambles(self):
        text = "Here is the synthesized evidence brief: Revenue: $1M"
        out = self.executor.strip_preambles(text, "editor")
        assert "Revenue: $1M" in out
        assert "Here is the synthesized" not in out

    def test_strip_preambles_multiple(self):
        text = "Synthesized Evidence Brief: Based on the provided snippets: foo"
        out = self.executor.strip_preambles(text, "editor")
        assert "foo" in out
        assert "Synthesized" not in out
        assert "Based on" not in out

    def test_apply_fail_safe_editor_strips_exhibit_markers(self):
        text = "--- EXHIBIT_START_ID_1 ---\nDATA: $1M\n--- EXHIBIT_END_ID_1 ---"
        out = self.executor.apply_fail_safe(text, "editor")
        assert "DATA: $1M" in out
        assert "EXHIBIT" not in out
        assert len(out) <= 6000

    def test_apply_fail_safe_truncates_to_max_length(self):
        text = "x" * 10000
        out = self.executor.apply_fail_safe(text, "editor")
        assert len(out) == 6000

    def test_apply_fail_safe_no_config_returns_input(self):
        """Skills without a fail_safe config should be a no-op."""
        text = "anything"
        assert self.executor.apply_fail_safe(text, "strategist") == text

    def test_resolve_schema_via_registry(self):
        from app.engine.skill_executor import SkillExecutor
        cls = self.executor._resolve_schema("DistilledContext")
        assert cls is DistilledContext
        # Decorate SchemaRegistry to reflect non-default registries
        custom = SchemaRegistry()
        custom.register(DistilledContext)
        e2 = SkillExecutor(loader=self.loader, renderer=self.renderer, schema_registry=custom)
        assert e2._resolve_schema("DistilledContext") is DistilledContext

    def test_resolve_unknown_schema_raises(self):
        with pytest.raises(KeyError, match="not found"):
            self.executor._resolve_schema("NopeSchema")

    def test_build_llm_requires_api_key(self, monkeypatch):
        monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        editor = self.executor.get_skill("editor")
        with pytest.raises(RuntimeError, match="No LLM provider available"):
            self.executor._build_llm(editor.model)
