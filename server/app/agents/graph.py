from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import (
    retrieve_node, 
    distill_node, 
    generate_node, 
    grade_generation_node
)

# --- 1. THE SOTA ROUTING PROTOCOLS ---

def route_post_retrieval(state: AgentState):
    """
    Protocol A: Checks if the Librarian found any evidence.
    """
    if state.get("status") == "no_evidence":
        print("GRAPH: No context found. Terminating.")
        return "end"
    
    print("GRAPH: Evidence secured. Proceeding to Distillation.")
    return "continue"

def route_post_grading(state: AgentState):
    """
    Protocol B: The Adversarial Gatekeeper.
    Decides if the Architect's reasoning is mathematically sound.
    """
    # 1. If the Prosecutor verified the mapping, we are done.
    if state.get("status") == "verified":
        print("GRAPH: Reasoning verified. Audit Complete.")
        return "end"

    # 2. Safety Break: We only allow 2 re-attempts to prevent token-burn loops.
    # Note: We will add 'retry_count' to state.py in the next step.
    if state.get("hallucination_score", 0) == 0.0:
        print("⚠️ GRAPH: Hallucination detected. Re-routing for recursive audit.")
        return "retry"
    
    return "end"

# --- 2. THE CIRCUIT DESIGN ---
workflow = StateGraph(AgentState)

# Register Nodes
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("distill", distill_node)
workflow.add_node("generate", generate_node)
workflow.add_node("grade", grade_generation_node)

# --- 3. THE WIRING (Logic Flow) ---

# Start at the Librarian
workflow.set_entry_point("retrieve")

# A. Gate 1: Post-Retrieval
workflow.add_conditional_edges(
    "retrieve",
    route_post_retrieval,
    {
        "end": END,
        "continue": "distill"
    }
)

# B. The Reasoning Core
workflow.add_edge("distill", "generate")
workflow.add_edge("generate", "grade")

# C. Gate 2: The Adversarial Loop (The "Substack" Fix)
workflow.add_conditional_edges(
    "grade",
    route_post_grading,
    {
        "end": END,
        "retry": "retrieve" # Loops back to Librarian for better chunks
    }
)

# Compile the Brain
app_graph = workflow.compile()
