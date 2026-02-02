from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import retrieve_node, generate_node

# --- Initialize the Graph ---
# We define the flow of data through the system
workflow = StateGraph(AgentState)

# --- Add Nodes ---
# Think of these as "Stations" on a factory line
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)

# --- Define Edges (The Wiring) ---
# 1. Entry Point -> Retrieve
workflow.set_entry_point("retrieve")

# 2. Retrieve -> Generate
# (In the future, we will add a "Critique" node in between here)
workflow.add_edge("retrieve", "generate")

# 3. Generate -> End
workflow.add_edge("generate", END)

# --- Compile the Brain ---
# This creates the executable application
app_graph = workflow.compile()
