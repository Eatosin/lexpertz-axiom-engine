from langgraph.graph import StateGraph, END, START
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
    """
    Determines path based on evidence status and document count.
    """
    if state.get("status") == "no_evidence":
        return "end"
    
    # Path B: Multi-doc Comparison Logic
    if len(state.get("filenames", [])) > 1:
        return "strategist"
        
    return "distill"

def route_post_grading(state: AgentState):
    """
    The Adversarial Gatekeeper. Decides if we finish or loop back for retry.
    """
    if state.get("status") == "verified":
        return "end"

    # Safety: Limit retry recursion to prevent token burn
    current_retries = state.get("retry_count", 0)
    if current_retries < 2:
        return "retry"
    
    return "end"

# --- 2. THE CIRCUIT DESIGN ---
workflow = StateGraph(AgentState)

# Register Professional Agent Nodes
workflow.add_node("Librarian", retrieve_node)
workflow.add_node("Editor", distill_node)
workflow.add_node("Strategist", strategist_node)
workflow.add_node("Architect", generate_node)
workflow.add_node("Prosecutor", grade_generation_node)

# --- 3. THE WIRING ---

# V4.4 Standard: Explicitly link START to the first node
workflow.add_edge(START, "Librarian")

# A. Gate 1: Post-Retrieval Routing
workflow.add_conditional_edges(
    "Librarian",
    route_post_retrieval,
    {
        "end": END,
        "strategist": "Strategist",
        "distill": "Editor"
    }
)

# B. Reasoning & Comparison Processing
workflow.add_edge("Editor", "Architect")
workflow.add_edge("Strategist", "Architect")
workflow.add_edge("Architect", "Prosecutor")

# C. Gate 2: The Adversarial/Retry Loop
workflow.add_conditional_edges(
    "Prosecutor",
    route_post_grading,
    {
        "end": END,
        "retry": "Librarian" 
    }
)

# Compile the Sovereign Brain
app_graph = workflow.compile()
