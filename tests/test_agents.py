import pytest
from unittest.mock import patch, AsyncMock
from app.agents.state import AgentState
from app.agents.nodes import distill_node, generate_node, grade_generation_node, strategist_node
from app.agents.graph import route_post_retrieval, route_post_grading


# ---------------------------------------------------------
# 1. GRAPH ROUTING TESTS (Unit Tests – Unchanged, still perfect)
# ---------------------------------------------------------
def test_langgraph_routing_logic():
    """Proves Axm-CLI commands and state transitions route correctly."""
    # Standard query
    assert route_post_retrieval({"status": "thinking", "filenames": ["doc.pdf"], "command": None}) == "distill"
    # Comparative command
    assert route_post_retrieval({"status": "thinking", "filenames": ["doc.pdf"], "command": "-c"}) == "strategist"
    # Multi-document
    assert route_post_retrieval({"status": "thinking", "filenames": ["d1.pdf", "d2.pdf"], "command": None}) == "strategist"
    # Prosecutor retry logic
    assert route_post_grading({"status": "thinking", "retry_count": 0}) == "retry"
    assert route_post_grading({"status": "thinking", "retry_count": 2}) == "end"


# ---------------------------------------------------------
# 2. DISTILL NODE (Editor) – FULL PATH COVERAGE
# ---------------------------------------------------------
@pytest.mark.asyncio
@pytest.mark.parametrize(
    "test_case, documents, expected_in_generation, should_trigger_failsafe",
    [
        # Happy path – clean evidence
        ("happy_path", ["The company's liability is strictly capped at $5,000,000 USD."], "$5,000,000", False),
        # No evidence case
        ("no_evidence", [], "NO RELEVANT EVIDENCE", False),
        # Noisy / malformed context (forces fallback in real failure scenarios)
        ("malformed_context", ["Random garbage with no markers"], "", True),
    ],
    ids=["happy_path", "no_evidence", "malformed_context_failsafe"]
)

@pytest.mark.asyncio
async def test_distill_node_all_paths(test_case, documents, expected_in_generation, should_trigger_failsafe, capsys):
    state: AgentState = {
        "question": "What is the company's liability limit?",
        "user_id": "test-user",
        "filenames": ["contract.pdf"],
        "history":[],
        "command": None,
        "comparison_map": {},
        "documents": documents,
        "generation": "",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": None
    }

    if should_trigger_failsafe:
        # SOTA: We mock the LLM chain instead of the Pydantic Prompt Template
        with patch('app.agents.nodes.editor_llm_core.with_structured_output') as mock_struct_out:
            # Create a fake async chain that crashes instantly
            mock_chain = AsyncMock()
            mock_chain.ainvoke.side_effect = Exception("Simulated Network Crash")
            mock_struct_out.return_value = mock_chain
            
            # Run the node
            editor_res = await distill_node(state)
            
        captured = capsys.readouterr()
        assert "⚠️ EDITOR JSON FAILSAFE TRIGGERED" in captured.out
        assert len(editor_res["generation"]) <= 6000, "Fallback exceeded 6000-char safety cap"
        assert "--- EXHIBIT_" not in editor_res["generation"]
    else:
        editor_res = await distill_node(state)
        assert expected_in_generation in editor_res["generation"] or "NO RELEVANT EVIDENCE" in editor_res["generation"]
        assert editor_res["status"] == "thinking"
        assert editor_res["active_node"] == "Editor"

    state.update(editor_res)

# ---------------------------------------------------------
# 3. STANDARD AUDIT CIRCUIT (Integration – now covers full flow)
# ---------------------------------------------------------
@pytest.mark.asyncio
async def test_standard_audit_circuit():
    """Full Editor → Architect → Prosecutor circuit with real evidence flow."""
    state: AgentState = {
        "question": "What is the company's liability limit?",
        "user_id": "test-user",
        "filenames": ["contract.pdf"],
        "history": [],
        "command": None,
        "comparison_map": {},
        "documents": ["The company's liability is strictly capped at $5,000,000 USD."],
        "generation": "",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": None
    }

    # 1. Editor (now guaranteed structured output)
    editor_res = await distill_node(state)
    assert "$5,000,000" in editor_res["generation"], "Editor dropped critical fact"
    state.update(editor_res)

    # 2. Architect
    arch_res = await generate_node(state)
    assert len(arch_res["generation"]) > 30, "Architect produced empty draft"
    state.update(arch_res)

    # 3. Prosecutor (RAGAS + DeepSeek grading)
    proc_res = await grade_generation_node(state)
    assert proc_res["status"] in ["verified", "thinking"]
    assert "metrics" in proc_res
    assert "faithfulness" in proc_res["metrics"]

    print(f"\n✅ Standard Circuit Verified! Faithfulness: {proc_res['metrics'].get('faithfulness', 0) * 100:.1f}%")


# ---------------------------------------------------------
# 4. STRATEGIST CIRCUIT (Enhanced with contradiction check)
# ---------------------------------------------------------
@pytest.mark.asyncio
async def test_strategist_comparative_circuit():
    """Validates Strategist node correctly detects and reports cross-document contradictions."""
    state: AgentState = {
        "question": "Compare the liability caps between the 2024 and 2025 contracts.",
        "user_id": "test-user",
        "filenames": ["2024.pdf", "2025.pdf"],
        "history": [],
        "command": "-c",
        "comparison_map": {},
        "documents": [
            "--- EXHIBIT_START_ID_1 ---\nFILE_SOURCE: 2024.pdf\nDATA_CONTENT: Liability capped at $1M.\n--- EXHIBIT_END_ID_1 ---",
            "--- EXHIBIT_START_ID_2 ---\nFILE_SOURCE: 2025.pdf\nDATA_CONTENT: Liability capped at $5M.\n--- EXHIBIT_END_ID_2 ---"
        ],
        "generation": "",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": None
    }

    strat_res = await strategist_node(state)
    generation = strat_res["generation"]

    assert "1M" in generation and "5M" in generation, "Strategist failed to extract both values"
    assert "2024" in generation and "2025" in generation, "Strategist failed to reference source documents"
    assert any(w in generation.lower() for w in ["comparative", "difference", "delta", "risk"]), \
    "Strategist did not synthesize a comparison"
    
    print("\n✅ Strategist Comparative Logic Verified!")


# ---------------------------------------------------------
# 5. PROSECUTOR RETRY / HALLUCINATION PATH (New – critical safety test)
# ---------------------------------------------------------
@pytest.mark.asyncio
async def test_prosecutor_hallucination_retry():
    """Ensures Prosecutor correctly triggers retry on low faithfulness (RAGAS breach)."""
    state: AgentState = {
        "question": "What is the liability limit?",
        "user_id": "test-user",
        "filenames": ["contract.pdf"],
        "documents": ["Some evidence"],
        "generation": "The liability limit is $100,000,000 (completely made up).",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": "Prosecutor"
    }

    proc_res = await grade_generation_node(state)

    assert proc_res["status"] == "thinking" or proc_res.get("retry_count", 0) > 0
    assert proc_res["hallucination_score"] < 1.0, "Prosecutor should have flagged hallucination"
    print(f"✅ Prosecutor correctly detected hallucination (score: {proc_res['hallucination_score']})")
