"""Tests for the prompt renderer — verifies .md prompts become ChatPromptTemplate."""

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.engine import SkillLoader, PromptRenderer
from app.engine.prompt_renderer import _escape_braces


class TestBraceEscape:
    """Literal braces in JSON examples must be doubled for LangChain templates."""

    def test_known_variables_left_intact(self):
        assert _escape_braces("Hello {question}") == "Hello {question}"
        assert _escape_braces("{context}") == "{context}"
        assert _escape_braces("{generation}") == "{generation}"

    def test_unknown_braces_are_doubled(self):
        assert _escape_braces("JSON: {\"key\": \"value\"}") == "JSON: {{\"key\": \"value\"}}"

    def test_mixed_known_and_literal(self):
        text = "result: {question} json={\"{x\":1}\""
        out = _escape_braces(text)
        assert "{question}" in out
        assert "{{\"" in out


class TestPromptRenderer:
    """Renders .md prompts into ChatPromptTemplate with format_instructions."""

    def _setup(self):
        loader = SkillLoader()
        return loader, PromptRenderer(loader)

    def test_renders_system_and_human_messages(self):
        loader, renderer = self._setup()
        editor = loader.load_skill(loader.base / "agents/editor/SKILL.md")
        prompt = renderer.render(editor)
        assert isinstance(prompt, ChatPromptTemplate)
        assert len(prompt.messages) == 2

    def test_injects_format_instructions(self):
        loader, renderer = self._setup()
        editor = loader.load_skill(loader.base / "agents/editor/SKILL.md")
        from app.prompts.templates import DistilledContext
        parser = PydanticOutputParser(pydantic_object=DistilledContext)
        prompt = renderer.render(editor, parser=parser)
        # format_instructions is set via .partial() — invoking the prompt materializes
        # the template. Prove partials are wired up: assemble the prompt with the user-side
        # vars, and the partials must resolve without us passing format_instructions.
        formatted = prompt.format_messages(
            question="What is revenue?",
            context="Revenue: $1M",
        )
        sys_text = formatted[0].content
        assert "{format_instructions}" not in sys_text
        assert "scratchpad" in sys_text.lower()
        assert "has_relevant_evidence" in sys_text.lower()

    def test_architect_prompt_includes_axiom_directives(self):
        loader, renderer = self._setup()
        architect = loader.load_skill(loader.base / "agents/architect/SKILL.md")
        prompt = renderer.render(architect)
        sys_text = prompt.messages[0].prompt.template
        assert "Sovereign Architect" in sys_text
        assert "NO CHATTER" in sys_text
        assert "HTML BAN" in sys_text

    def test_prosecutor_prompt_preserves_extra_body_braces(self):
        """The prosecutor's prompt does NOT reference chat_template_kwargs; it should still parse cleanly."""
        loader, renderer = self._setup()
        proc = loader.load_skill(loader.base / "agents/prosecutor/SKILL.md")
        prompt = renderer.render(proc)
        sys_text = prompt.messages[0].prompt.template
        # The system prompt mentions "raw_evidence" but no JSON literals, so should parse as-is
        assert "Axiom Prosecutor" in sys_text

    def test_prompt_can_be_invoked_with_variables(self):
        loader, renderer = self._setup()
        editor = loader.load_skill(loader.base / "agents/editor/SKILL.md")
        prompt = renderer.render(editor)
        # Just check that format() can resolve known variables without errors
        msg = prompt.format_messages(question="What is revenue?", context="Revenue: $1M")
        assert len(msg) == 2
