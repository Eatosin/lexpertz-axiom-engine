from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import retrieve_node, generate_node, grade_generation_node

# --- Define Conditional Routing ---
def decide_to_finish(state: AgentState):
    """
    SOTA Router: Decides if the answer is high-fidelity or needs re-work.
    """
    if state["hallucination_score"] == 1.0:
        return "end"
    else:
        # If score is 0, we loop back to retrieval to find better context
        return "retrieve"

workflow = StateGraph(AgentState)

# 1. Register Nodes
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)
workflow.add_node("grade", grade_generation_node)

# 2. Wire the Path
workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", "grade")

# 3. Add Conditional Edge (The Brain's Self-Correction)
workflow.add_conditional_edges(
    "grade",
    decide_to_finish,
    {
        "end": END,
        "retrieve": "retrieve" # LOOP BACK
    }
)

app_graph = workflow.compile()
