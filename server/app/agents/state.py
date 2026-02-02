from typing import TypedDict, List

class AgentState(TypedDict):
    """
    The Brain's Working Memory.
    Tracks the conversation state as it moves through the graph.
    """
    question: str           # User's Input
    documents: List[str]    # Evidence found by Retriever
    generation: str         # The Draft Answer
    hallucination_score: float # 0.0 (Lie) to 1.0 (Truth)
    status: str             # "thinking", "critiquing", "verified"
