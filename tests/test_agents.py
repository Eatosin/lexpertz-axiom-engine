import pytest
from app.agents.state import AgentState
from app.agents.nodes import distill_node, generate_node, grade_generation_node, strategist_node
from app.agents.graph import route_post_retrieval, route_post_grading

# ---------------------------------------------------------
# 1. GRAPH ROUTING TESTS (Unit Tests)
# ---------------------------------------------------------
def test_langgraph_routing_logic():
    """Proves the Axm-CLI commands properly route traffic through the circuit."""
    
    # 1. Standard Query -> Editor
    state_standard = {"status": "thinking", "filenames": ["doc.pdf"], "command": None}
    assert route_post_retrieval(state_standard) == "distill", "Failed standard routing"

    # 2. Comparative Command -> Strategist
    state_compare = {"status": "thinking", "filenames": ["doc.pdf"], "command": "-c"}
    assert route_post_retrieval(state_compare) == "strategist", "Failed -c command routing"

    # 3. Multi-Doc -> Strategist
    state_multi = {"status": "thinking", "filenames":["d1.pdf", "d2.pdf"], "command": None}
    assert route_post_retrieval(state_multi) == "strategist", "Failed multi-doc routing"

    # 4. Prosecutor Retry Limit
    state_retry = {"status": "thinking", "retry_count": 0}
    assert route_post_grading(state_retry) == "retry", "Failed retry allowance"
    
    state_max_retry = {"status": "thinking", "retry_count": 2}
    assert route_post_grading(state_max_retry) == "end", "Failed to stop infinite loop"

# ---------------------------------------------------------
# 2. THE STANDARD AUDIT CIRCUIT (Integration Test)
# ---------------------------------------------------------
@pytest.mark.asyncio
async def test_standard_audit_circuit():
    """Validates Editor -> Architect -> Prosecutor flow with valid evidence."""
    state: AgentState = {
        "question": "What is the company's liability limit?",
        "user_id": "test-user",
        "filenames": ["contract.pdf"],
        "history":[],
        "command": None,
        "comparison_map": {},
        "documents":["The company's liability is strictly capped at $5,000,000 USD."],
        "generation": "",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": None
    }

    # 1. Editor Node
    editor_res = await distill_node(state)
    assert "5,000,000" in editor_res["generation"], "Editor hallucinated or dropped critical facts."
    state.update(editor_res)

    # 2. Architect Node
    arch_res = await generate_node(state)
    assert len(arch_res["generation"]) > 20, "Architect failed to draft a report."
    state.update(arch_res)

    # 3. Prosecutor Node (Requires 2048 max_tokens in evaluator.py!)
    proc_res = await grade_generation_node(state)
    assert proc_res["status"] == "verified", f"Prosecutor incorrectly rejected valid logic: {proc_res}"
    print(f"\n✅ Standard Circuit Verified! Faithfulness: {proc_res['metrics'].get('faithfulness', 0) * 100}%")

# ---------------------------------------------------------
# 3. THE STRATEGIST CIRCUIT (Integration Test)
# ---------------------------------------------------------
@pytest.mark.asyncio
async def test_strategist_comparative_circuit():
    """Validates the Strategist Node handles cross-document contradictions."""
    state: AgentState = {
        "question": "Compare the liability caps between the 2024 and 2025 contracts.",
        "user_id": "test-user",
        "filenames": ["2024.pdf", "2025.pdf"],
        "history":[],
        "command": "-c",
        "comparison_map": {},
        "documents":[
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

    # Run Strategist
    strat_res = await strategist_node(state)
    generation = strat_res["generation"]
    
    # Prove the LLM detected both numbers and synthesized a comparison
    assert "1M" in generation and "5M" in generation, "Strategist failed to map the contradiction."
    print("\n✅ Strategist Comparative Logic Verified!")
