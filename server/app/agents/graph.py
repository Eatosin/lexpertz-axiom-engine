from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import retrieve_node, distill_node, generate_node, grade_generation_node

# --- 1. THE ROUTING LOGIC ---
def decide_to_finish(state: AgentState):
    """
    SOTA Router: Decides if the answer is verified or needs re-processing.
    """
    # If the Prosecutor (Grader) gave a perfect score, we finish.
    if state.get("hallucination_score") == 1.0:
        return "end"
    
    # If not, we loop back to retrieval to find better/different evidence.
    print("RE-ROUTING: Hallucination detected, re-attempting retrieval...")
    return "retrieve"

# --- 2. THE CIRCUIT DESIGN ---
workflow = StateGraph(AgentState)

# Register all nodes
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("distill", distill_node)   # <--- THE NEW EDITOR NODE
workflow.add_node("generate", generate_node)
workflow.add_node("grade", grade_generation_node)

# --- 3. THE WIRING (Flow of Consciousness) ---

# Start at the Librarian
workflow.set_entry_point("retrieve")

# Retrieve (20 chunks) -> Distill (1 Evidence Brief)
workflow.add_edge("retrieve", "distill")

# Distill (1 Evidence Brief) -> Generate (70B Final Answer)
workflow.add_edge("distill", "generate")

# Generate -> Grade (Adversarial Fact Check)
workflow.add_edge("generate", "grade")

# Grade -> (End or Loop Back)
workflow.add_conditional_edges(
    "grade",
    decide_to_finish,
    {
        "end": END,
        "retrieve": "retrieve"
    }
)

# Compile the Brain
app_graph = workflow.compile()
