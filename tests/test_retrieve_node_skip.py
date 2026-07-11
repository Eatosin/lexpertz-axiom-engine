"""Tests for the retrieve_node (Librarian) including skip_retrieval short-circuit
for code-audit and dataset-audit skills."""

import pytest
from unittest.mock import patch, AsyncMock

from app.agents.nodes import retrieve_node
from app.agents.state import AgentState


def _librarian_state(**overrides) -> AgentState:
    base: AgentState = {
        "question": "What is the liability cap?",
        "user_id": "test-user",
        "filenames": ["contract.pdf"],
        "history": [],
        "command": None,
        "comparison_map": {},
        "documents": ["pre-existing exhibit"],
        "generation": "",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": None,
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
@patch("app.agents.nodes.hybrid_search", new_callable=AsyncMock)
@patch("app.agents.nodes.get_reranked_scores", new_callable=AsyncMock)
async def test_skip_retrieval_preserves_preloaded_documents(mock_rerank, mock_search):
    """When skip_retrieval=True, Librarian must NOT call hybrid_search.
    This is the critical fix: previously skills pre-loaded documents that
    got overwritten by Librarian's hybrid_search call."""
    preloaded = ["--- EXHIBIT_START_ID_CODE ---\nfile: foo.py\n--- EXHIBIT_END_ID_CODE ---"]
    state = _librarian_state(
        skip_retrieval=True,
        documents=preloaded,
        question="Audit this codebase against the policy",
    )

    res = await retrieve_node(state)

    # Hybrid search must NOT be called
    mock_search.assert_not_called()
    mock_rerank.assert_not_called()
    # Documents preserved verbatim
    assert res["documents"] == preloaded
    assert res["status"] == "thinking"
    assert res["active_node"] == "Librarian"
    assert "Audit this codebase" in res["question"]


@pytest.mark.asyncio
@patch("app.agents.nodes.hybrid_search", new_callable=AsyncMock)
@patch("app.agents.nodes.get_reranked_scores", new_callable=AsyncMock)
async def test_skip_retrieval_false_runs_normal_search(mock_rerank, mock_search):
    """When skip_retrieval is False/missing, normal retrieval runs."""
    mock_search.return_value = ["chunk 1", "chunk 2"]
    mock_rerank.return_value = ["golden chunk 1", "golden chunk 2"]

    state = _librarian_state(skip_retrieval=False)

    res = await retrieve_node(state)

    mock_search.assert_called_once()
    mock_rerank.assert_called_once()
    assert res["documents"] == ["golden chunk 1", "golden chunk 2"]


@pytest.mark.asyncio
@patch("app.agents.nodes.hybrid_search", new_callable=AsyncMock)
@patch("app.agents.nodes.get_reranked_scores", new_callable=AsyncMock)
async def test_skip_retrieval_field_missing_runs_normal_search(mock_rerank, mock_search):
    """If skip_retrieval key is absent from state, behaviour is unchanged."""
    mock_search.return_value = ["chunk"]
    mock_rerank.return_value = ["golden"]

    state = _librarian_state()
    # Remove the key entirely
    state.pop("skip_retrieval", None)

    res = await retrieve_node(state)

    mock_search.assert_called_once()
    assert res["documents"] == ["golden"]
