from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import (
    retrieve_node, 
    distill_node, 
    generate_node, 
    grade_generation_node,
    strategist_node
)

# --- 1. ROUTING LOGIC ---

def route_post_retrieval(state: AgentState):
    if state.get("status") == "no_evidence":
        return "end"
    
    # Path B: Comparison Logic
    if len(state.get("filenames", [])) > 1:
        return "strategist"
        
    return "distill"

def route_post_grading(state: AgentState):
    if state.get("status") == "verified":
        return "end"

    # Safety: Adversarial Loop
    current_retries = state.get("retry_count", 0)
    if current_retries < 2:
        return "retry"
    
    return "end"

# --- 2. THE CIRCUIT DESIGN ---
workflow = StateGraph(AgentState)

# Standardized Node Mapping for Professional UI Streaming
workflow.add_node("Librarian", retrieve_node)
workflow.add_node("Editor", distill_node)
workflow.add_node("Strategist", strategist_node)
workflow.add_node("Architect", generate_node)
workflow.add_node("Prosecutor", grade_generation_node)

# --- 3. THE WIRING ---

workflow.set_entry_point("Librarian")

workflow.add_conditional_edges(
    "Librarian",
    route_post_retrieval,
    {
        "end": END,
        "strategist": "Strategist",
        "distill": "Editor"
    }
)

workflow.add_edge("Editor", "Architect")
workflow.add_edge("Strategist", "Architect")
workflow.add_edge("Architect", "Prosecutor")

workflow.add_conditional_edges(
    "Prosecutor",
    route_post_grading,
    {
        "end": END,
        "retry": "Librarian" # Recursion
    }
)

app_graph = workflow.compile()
