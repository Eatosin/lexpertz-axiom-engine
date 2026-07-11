"""Integration tests — nodes.py uses SkillExecutor which reads from axiom-skills/."""

from unittest.mock import patch, AsyncMock, MagicMock

import pytest

from app.agents.state import AgentState
from app.agents.nodes import (
    distill_node,
    generate_node,
    grade_generation_node,
    strategist_node,
)


def _base_state(**overrides) -> AgentState:
    base: AgentState = {
        "question": "What is the revenue?",
        "user_id": "test-user",
        "filenames": ["contract.pdf"],
        "history": [],
        "command": None,
        "comparison_map": {},
        "documents": ["Revenue was $5M in Q4."],
        "generation": "",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": None,
    }
    base.update(overrides)
    return base


class TestDistillNodeUsesSkillConfig:
    """distill_node reads preambles_to_strip from editor SKILL.md."""

    @pytest.mark.asyncio
    async def test_empty_docs_triggers_skills_empty_response(self):
        state = _base_state(documents=[])
        res = await distill_node(state)
        assert res["generation"] == "NO RELEVANT EVIDENCE"  # from skill config
        assert res["status"] == "thinking"
        assert res["active_node"] == "Editor"

    @pytest.mark.asyncio
    async def test_happy_path_uses_structured_output(self):
        mock_brief = type("Brief", (), {"brief": "Revenue: $5M", "has_relevant_evidence": True})
        with patch("langchain_nvidia_ai_endpoints.ChatNVIDIA.with_structured_output") as mock:
            mock_chain = AsyncMock()
            mock_chain.ainvoke.return_value = mock_brief
            mock.return_value = mock_chain
            res = await distill_node(_base_state())
        assert "Revenue: $5M" in res["generation"]

    @pytest.mark.asyncio
    async def test_failsafe_triggers_on_llm_exception(self):
        with patch("langchain_nvidia_ai_endpoints.ChatNVIDIA.with_structured_output") as mock:
            mock_chain = AsyncMock()
            mock_chain.ainvoke.side_effect = Exception("crash")
            mock.return_value = mock_chain
            res = await distill_node(_base_state(documents=["Random content x" * 200]))
        # Editor failsafe: strip exhibit markers, apply max_length from skill config
        assert len(res["generation"]) <= 6000
        assert "EXHIBIT" not in res["generation"]
        assert res["status"] == "thinking"


class TestStrategistNodeUsesSkill:
    """strategist_node reads model config from strategist SKILL.md."""

    @pytest.mark.asyncio
    async def test_strategist_invokes_llm(self):
        from app.agents.nodes import executor as nodes_executor

        mock_result = {"content": "Comparative matrix: $5M vs $3M", "structured": None}

        async def fake_execute_llm(skill_name, variables):
            return mock_result

        original = nodes_executor.execute_llm
        nodes_executor.execute_llm = fake_execute_llm
        try:
            res = await strategist_node(_base_state(command="-c"))
        finally:
            nodes_executor.execute_llm = original
        assert "Comparative" in res["generation"]


class TestArchitectNodeUsesSkillConfig:
    """generate_node reads history_turns, formatting_directives from architect SKILL.md."""

    @pytest.mark.asyncio
    async def test_no_evidence_short_circuits(self):
        state = _base_state(generation="NO RELEVANT EVIDENCE")
        res = await generate_node(state)
        assert res["generation"] == "No direct evidence found in the vault."
        assert res["status"] == "verifying"

    @pytest.mark.asyncio
    async def test_happy_path_invokes_llm(self):
        from app.agents.nodes import executor as nodes_executor

        mock_result = {
            "content": "### Revenue AUDIT REPORT\n\nRevenue: $5M",
            "structured": None,
        }

        async def fake_execute_llm(skill_name, variables):
            return mock_result

        original = nodes_executor.execute_llm
        nodes_executor.execute_llm = fake_execute_llm
        try:
            res = await generate_node(_base_state(generation="Revenue $5M evidence here"))
        finally:
            nodes_executor.execute_llm = original
        assert "Revenue: $5M" in res["generation"]
        assert res["status"] == "verifying"
        assert res["active_node"] == "Architect"

    @pytest.mark.asyncio
    async def test_history_injection_respects_double_dot(self):
        from app.agents.nodes import executor as nodes_executor

        captured: dict = {}

        async def fake_execute_llm(skill_name, variables):
            captured.update(variables)
            return {"content": "ok", "structured": None}

        original = nodes_executor.execute_llm
        nodes_executor.execute_llm = fake_execute_llm
        try:
            await generate_node(_base_state(
                generation="Evidence $5M",
                history=[{"role": "user", "content": "previous turn"}],
                command="..",
            ))
        finally:
            nodes_executor.execute_llm = original
        assert captured["context"].find("PREVIOUS AUDIT CONTEXT") == -1


class TestProsecutorNodeUsesSkillConfig:
    """grade_generation_node reads threshold, intensify_flag from prosecutor SKILL.md."""

    @pytest.mark.asyncio
    async def test_empty_generation_early_exits_verified(self):
        res = await grade_generation_node(_base_state(generation=""))
        assert res["status"] == "verified"
        assert res["hallucination_score"] == 1.0

    @pytest.mark.asyncio
    async def test_no_evidence_marker_early_exits(self):
        res = await grade_generation_node(_base_state(generation="No direct evidence found in the vault..."))
        assert res["status"] == "verified"

    @pytest.mark.asyncio
    async def test_intensify_flag_uses_higher_threshold(self):
        # Mock structure: a passing grade at default 0.7 threshold should fail at 0.9 (-v mode)
        mock_grade = type("Grade", (), {
            "faithfulness_score": 0.8,
            "is_hallucinating": "false",
            "explanation": "passes 0.7",
        })()
        with patch("langchain_nvidia_ai_endpoints.ChatNVIDIA.with_structured_output") as mock:
            mock_chain = AsyncMock()
            mock_chain.ainvoke.return_value = mock_grade
            mock.return_value = mock_chain
            res_default = await grade_generation_node(_base_state(generation="some answer"))
            res_intense = await grade_generation_node(_base_state(generation="some answer", command="-v"))
        # 0.8 < 0.9 (intensify) → retry, 0.8 >= 0.7 (default) → verified
        assert res_default["status"] == "verified"
        assert res_intense["status"] == "thinking"
        assert res_intense["retry_count"] == 1

    @pytest.mark.asyncio
    async def test_hallucinating_triggers_retry(self):
        mock_grade = type("Grade", (), {
            "faithfulness_score": 0.5,
            "is_hallucinating": "true",
            "explanation": "fake stuff",
        })()
        with patch("langchain_nvidia_ai_endpoints.ChatNVIDIA.with_structured_output") as mock:
            mock_chain = AsyncMock()
            mock_chain.ainvoke.return_value = mock_grade
            mock.return_value = mock_chain
            res = await grade_generation_node(_base_state(generation="some answer"))
        assert res["status"] == "thinking"
        assert res["retry_count"] == 1

    @pytest.mark.asyncio
    async def test_exception_failsafe_returns_verified(self):
        """If LLM raises, default to pass to avoid infinite retries."""
        with patch("langchain_nvidia_ai_endpoints.ChatNVIDIA.with_structured_output") as mock:
            mock_chain = AsyncMock()
            mock_chain.ainvoke.side_effect = Exception("API down")
            mock.return_value = mock_chain
            res = await grade_generation_node(_base_state())
        assert res["status"] == "verified"
        assert res["hallucination_score"] == 1.0
