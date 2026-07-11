import pytest
from app.prompts.templates import (
    VERIFICATION_PROMPT,
    DISTILLATION_PROMPT,
    STRATEGIST_COMPARATIVE_PROMPT,
    GRADING_PROMPT,
    distill_parser,
    grade_parser,
    DistilledContext,
    HallucinationGrade,
    AXIOM_SYSTEM_INSTRUCTION,
)


class TestPromptTemplates:
    """Validate prompt structure and schema shapes (no LLM calls)."""

    def test_axiom_system_instruction_contains_key_directives(self):
        assert "Sovereign Architect" in AXIOM_SYSTEM_INSTRUCTION
        assert "NO CHATTER" in AXIOM_SYSTEM_INSTRUCTION
        assert "MARKDOWN ONLY" in AXIOM_SYSTEM_INSTRUCTION
        assert "HTML BAN" in AXIOM_SYSTEM_INSTRUCTION
        assert "citation_protocol" in AXIOM_SYSTEM_INSTRUCTION
        assert "rejection" in AXIOM_SYSTEM_INSTRUCTION

    def test_verification_prompt_structure(self):
        messages = VERIFICATION_PROMPT.format_messages(
            question="Test Q", context="Test Ctx"
        )
        assert len(messages) == 2
        assert messages[0].type == "system"
        assert messages[1].type == "human"
        assert "Test Q" in messages[1].content
        assert "Test Ctx" in messages[1].content

    def test_distillation_prompt_structure(self):
        messages = DISTILLATION_PROMPT.format_messages(
            question="What is revenue?", context="Revenue: $1M"
        )
        assert len(messages) == 2
        assert "Editor" in messages[0].content
        assert "Revenue: $1M" in messages[1].content

    def test_strategist_prompt_structure(self):
        messages = STRATEGIST_COMPARATIVE_PROMPT.format_messages(
            question="Compare rates", context="Info"
        )
        assert len(messages) == 2
        assert "Comparative" in messages[0].content

    def test_grading_prompt_structure(self):
        messages = GRADING_PROMPT.format_messages(
            context="Evidence", generation="Draft"
        )
        assert len(messages) == 2
        assert "Prosecutor" in messages[0].content
        assert "Evidence" in messages[1].content
        assert "Draft" in messages[1].content


class TestDistilledContextSchema:
    """Validate Pydantic schema shape."""

    def test_valid_instance(self):
        obj = DistilledContext(
            scratchpad="Found match",
            has_relevant_evidence=True,
            brief="--- EXHIBIT 1 ---\nRevenue: $1M"
        )
        assert obj.has_relevant_evidence is True
        assert "$1M" in obj.brief

    def test_empty_brief_when_no_evidence(self):
        obj = DistilledContext(
            scratchpad="No match",
            has_relevant_evidence=False,
            brief=""
        )
        assert obj.has_relevant_evidence is False
        assert obj.brief == ""


class TestHallucinationGradeSchema:
    """Validate Prosecutor grading schema."""

    def test_pass_grade(self):
        obj = HallucinationGrade(
            scratchpad="All facts verified",
            is_hallucinating="false",
            faithfulness_score=1.0,
            explanation="No hallucinations detected"
        )
        assert obj.is_hallucinating == "false"
        assert obj.faithfulness_score == 1.0

    def test_fail_grade(self):
        obj = HallucinationGrade(
            scratchpad="Made-up figure found",
            is_hallucinating="true",
            faithfulness_score=0.3,
            explanation="Revenue figure not in evidence"
        )
        assert obj.is_hallucinating == "true"
        assert obj.faithfulness_score == 0.3

    def test_parsers_exist(self):
        assert distill_parser is not None
        assert grade_parser is not None