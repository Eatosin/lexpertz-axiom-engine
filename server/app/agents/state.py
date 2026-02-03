from typing import TypedDict, List

class AgentState(TypedDict):
    """
    The Brain's Working Memory.
    Now includes Identity Context for RLS enforcement.
    """
    question: str
    user_id: str            # <--- NEW: The Identity Key
    documents: List[str]
    generation: str
    hallucination_score: float
    status: str
