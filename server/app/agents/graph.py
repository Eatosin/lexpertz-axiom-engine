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
    """
    Protocol A: Checks if the Librarian found any evidence.
    """
    if state.get("status") == "no_evidence":
        print("GRAPH: No context found. Terminating.")
        return "end"
    
    # Branching Logic: Choose path based on file count
    filenames = state.get("filenames", [])
    if len(filenames) > 1:
        print(f"GRAPH: Multi-document ({len(filenames)}) detected. Routing to Strategist.")
        return "strategist"
        
    print("GRAPH: Single-document detected. Proceeding to Distillation.")
    return "distill"

def route_post_grading(state: AgentState):
    """
    Protocol B: The Adversarial Gatekeeper.
    """
    if state.get("status") == "verified":
        print("GRAPH: Reasoning verified. Audit Complete.")
        return "end"

    # Safety: Limit retry_count
    current_retries = state.get("retry_count", 0)
    if current_retries < 2:
        print(f"⚠️ GRAPH: Hallucination detected. Retry {current_retries + 1}/2.")
        return "retry"
    
    print("GRAPH: Max retries reached. Force terminating.")
    return "end"

# --- 2. THE CIRCUIT DESIGN ---
workflow = StateGraph(AgentState)

# Register Nodes
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("distill", distill_node)     # Standard path
workflow.add_node("strategist", strategist_node) # Comparative path
workflow.add_node("generate", generate_node)
workflow.add_node("grade", grade_generation_node)

# --- 3. THE WIRING ---

# Start at the Librarian
workflow.set_entry_point("retrieve")

# A. Gate 1: Route to Strategist or Distill
workflow.add_conditional_edges(
    "retrieve",
    route_post_retrieval,
    {
        "end": END,
        "strategist": "strategist",
        "distill": "distill"
    }
)

# B. The Reasoning Core
workflow.add_edge("distill", "generate")
workflow.add_edge("strategist", "generate")
workflow.add_edge("generate", "grade")

# C. Gate 2: The Adversarial Loop
workflow.add_conditional_edges(
    "grade",
    route_post_grading,
    {
        "end": END,
        "retry": "retrieve"
    }
)

# Compile the Brain
app_graph = workflow.compile()
