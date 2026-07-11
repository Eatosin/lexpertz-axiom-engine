"""Tests for the skill loader — verifies the .md → Pydantic pipeline."""

from pathlib import Path
import textwrap

import pytest

from app.engine import SkillLoader, parse_frontmatter
from app.engine.loader import _resolve_base_path
from app.engine.models import SkillConfig


class TestFrontmatterParser:
    """YAML frontmatter extraction from .md files."""

    def test_parse_with_frontmatter(self):
        raw = textwrap.dedent("""\
            ---
            name: foo
            type: llm
            ---
            # Foo title

            Some body text.
        """).strip()
        front, body = parse_frontmatter(raw)
        assert front == {"name": "foo", "type": "llm"}
        assert body.startswith("# Foo title")

    def test_parse_without_frontmatter_returns_raw(self):
        raw = "# Just a markdown file"
        front, body = parse_frontmatter(raw)
        assert front == {}
        assert body == raw

    def test_parse_rejects_non_mapping_yaml(self):
        raw = textwrap.dedent("""\
            ---
            - foo
            - bar
            ---
            body
            """)
        with pytest.raises(ValueError, match="not a mapping"):
            parse_frontmatter(raw)


class TestSkillLoader:
    """SkillLoader — discovery, validation, prompt-file resolution."""

    def test_resolves_default_base_path(self):
        base = _resolve_base_path(None)
        assert base.exists(), f"axiom-skills base does not exist: {base}"
        assert base.name == "axiom-skills"
        assert (base / "agents").exists()
        assert (base / "routing").exists()
        assert (base / "core").exists()

    def test_discover_all_seven_skills(self):
        loader = SkillLoader()
        skills = loader.discover_skills()
        # 5 agent skills (librarian, editor, strategist, architect, prosecutor)
        # + 2 domain skills (code-audit, dataset-audit)
        assert len(skills) == 7
        for name in ("librarian", "editor", "strategist", "architect", "prosecutor",
                     "code-audit", "dataset-audit"):
            assert name in skills

    def test_editor_skill_config_validates(self):
        loader = SkillLoader()
        editor = loader.load_skill(loader.base / "agents/editor/SKILL.md")
        assert editor.name == "editor"
        assert editor.type == "llm"
        assert editor.model is not None
        assert editor.model.temperature == 0.0
        assert editor.model.response_format == "json_object"
        assert editor.structured_output is not None
        assert editor.structured_output.schema_name == "DistilledContext"
        assert "system" in editor.prompts
        assert "human" in editor.prompts

    def test_prosecutor_skill_has_thinking_mode(self):
        loader = SkillLoader()
        prosecutor = loader.load_skill(loader.base / "agents/prosecutor/SKILL.md")
        assert prosecutor.model.thinking is True
        assert prosecutor.model.max_tokens == 8192
        assert prosecutor.structured_output.schema_name == "HallucinationGrade"

    def test_librarian_skill_is_retriever_type(self):
        loader = SkillLoader()
        librarian = loader.load_skill(loader.base / "agents/librarian/SKILL.md")
        assert librarian.type == "retriever"
        assert librarian.model is None
        assert librarian.config["search"]["default_limit"] == 30

    def test_resolve_prompt_path(self):
        loader = SkillLoader()
        editor = loader.load_skill(loader.base / "agents/editor/SKILL.md")
        path = loader.resolve_prompt_path(editor, "system")
        assert path.exists()
        assert path.name == "system.md"

    def test_resolve_unknown_prompt_key_raises(self):
        loader = SkillLoader()
        editor = loader.load_skill(loader.base / "agents/editor/SKILL.md")
        with pytest.raises(ValueError, match="no 'unknown' prompt"):
            loader.resolve_prompt_path(editor, "unknown")

    def test_load_prompt_text(self):
        loader = SkillLoader()
        editor = loader.load_skill(loader.base / "agents/editor/SKILL.md")
        text = loader.load_prompt_text(editor, "system")
        assert "Axiom Context Editor" in text
        assert len(text) > 100

    def test_load_core_resource(self):
        loader = SkillLoader()
        text = loader.load_core("axiom-system")
        assert "Sovereign Architect" in text
        assert "core_directives" in text

    def test_routing_files_discovered(self):
        loader = SkillLoader()
        rules = loader.discover_routing()
        assert "post-retrieval" in rules
        assert "post-grading" in rules
        # Post-retrieval's targets are: end, strategist, editor
        targets = [r["target"] for r in rules["post-retrieval"].routes]
        assert targets == ["end", "strategist", "editor"]

    def test_validate_all_returns_zero_errors(self):
        loader = SkillLoader()
        errors = loader.validate_all()
        assert errors == [], f"validation errors: {errors}"

    def test_invalid_skill_path_raises(self, tmp_path):
        loader = SkillLoader()
        with pytest.raises(FileNotFoundError):
            loader.load_skill(tmp_path / "missing-SKILL.md")

    def test_invalid_frontmatter_raises(self, tmp_path):
        bad = tmp_path / "SKILL.md"
        bad.write_text("---\nname: bad\ntype: llm\n---\nbody", encoding="utf-8")
        loader = SkillLoader(base_path=tmp_path)
        # type=llm with no model -> model_required_for_llm validator fires
        with pytest.raises(ValueError, match="no 'model' configuration"):
            loader.load_skill(bad)

    def test_llm_skill_missing_prompts_raises(self, tmp_path):
        bad = tmp_path / "SKILL.md"
        bad.write_text(
            "---\nname: bad\ntype: llm\nmodel:\n  provider: nvidia\n  name: m\n---\nbody",
            encoding="utf-8",
        )
        loader = SkillLoader(base_path=tmp_path)
        # type=llm with model but no system/human prompts -> prompts_required validator
        with pytest.raises(ValueError, match="missing prompts"):
            loader.load_skill(bad)


class TestRegistrationDuplicates:
    """Two skills with the same name must be rejected at discovery time."""

    def test_duplicate_skill_name_raises(self, tmp_path):
        (tmp_path / "agents").mkdir()
        for i, sub in enumerate(["foo", "bar"]):
            d = tmp_path / "agents" / sub
            d.mkdir()
            (d / "SKILL.md").write_text(
                "---\nname: same_name\ntype: llm\nmodel:\n  provider: nvidia\n  name: m\nprompts:\n  system: p.md\n  human: q.md\n---\n",
                encoding="utf-8",
            )
            (d / "p.md").write_text("system")
            (d / "q.md").write_text("human")
        loader = SkillLoader(base_path=tmp_path)
        with pytest.raises(ValueError, match="Duplicate skill name"):
            loader.discover_skills()
