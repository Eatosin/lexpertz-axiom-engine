from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import retrieve_node, distill_node, generate_node, grade_generation_node

# --- 1. THE ROUTING LOGIC (SOTA Resilience) ---
def decide_next_step(state: AgentState):
    """
    SOTA Router: Handles normal verified paths vs empty-vault refusals.
    """
    # 1. If retrieval found nothing, exit immediately with the refusal message
    if state.get("status") == "no_evidence":
        print("SHORT-CIRCUIT: No context found. Ending loop.")
        return "end"
    
    # 2. If the Prosecutor (Grader) gave a perfect score, we finish.
    if state.get("hallucination_score") == 1.0:
        print("SUCCESS: Reasoning verified.")
        return "end"
    
    # 3. Otherwise, re-attempt retrieval
    print("RE-ROUTING: Hallucination detected, re-attempting retrieval...")
    return "retrieve"

# --- 2. THE CIRCUIT DESIGN ---
workflow = StateGraph(AgentState)

# Register all nodes
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("distill", distill_node)
workflow.add_node("generate", generate_node)
workflow.add_node("grade", grade_generation_node)

# --- 3. THE WIRING (Flow of Consciousness) ---

# Start at the Librarian
workflow.set_entry_point("retrieve")

# A. AFTER RETRIEVAL: Check if we have context to continue or if we should stop
workflow.add_conditional_edges(
    "retrieve",
    decide_next_step,
    {
        "end": END,
        "retrieve": "distill" # If not 'no_evidence', proceed to distill
    }
)

# B. THE REFINING LOOP
workflow.add_edge("distill", "generate")
workflow.add_edge("generate", "grade")

# C. AFTER GRADING: Check for truthfulness or loop back
workflow.add_conditional_edges(
    "grade",
    decide_next_step,
    {
        "end": END,
        "retrieve": "retrieve" # The adversarial retry loop
    }
)

# Compile the Brain
app_graph = workflow.compile()
