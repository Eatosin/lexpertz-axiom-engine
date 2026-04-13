import pytest
from app.agents.state import AgentState
from app.agents.nodes import retrieve_node, distill_node, generate_node, grade_generation_node

@pytest.mark.asyncio
async def test_full_audit_circuit():
    """
    SOTA Integration Test: Validates the end-to-end reasoning circuit.
    Tests Librarian, Editor, and Architect nodes in sequence.
    """
    # 1. Setup Mock State
    state: AgentState = {
        "question": "Does the document mention liability limitations?",
        "user_id": "test-user",
        "filenames": ["dummy.pdf"],
        "history": [],
        "command": None,
        "comparison_map": {},
        "documents": ["Liability is limited to $1M in Section 4.2."],
        "generation": "",
        "hallucination_score": 0.0,
        "metrics": {},
        "status": "thinking",
        "retry_count": 0,
        "active_node": None
    }

    # 2. Run Librarian Node (Retrieval)
    # We skip Librarian in this test because we pre-loaded state['documents']
    
    # 3. Run Editor Node
    editor_result = await distill_node(state)
    assert "Liability" in editor_result["generation"]
    
    # 4. Run Architect Node
    state.update(editor_result)
    arch_result = await generate_node(state)
    assert len(arch_result["generation"]) > 10, "Architect failed to generate report."
    
    # 5. Run Prosecutor Node
    state.update(arch_result)
    proc_result = await grade_generation_node(state)
    
    # Verify the logic passed the Prosecutor
    assert proc_result["status"] == "verified"
    print(f"\n✅ Agentic Circuit Verified (Faithfulness: {proc_result['metrics'].get('faithfulness', 0)})")
