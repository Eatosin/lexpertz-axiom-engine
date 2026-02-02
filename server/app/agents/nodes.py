from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.prompts.templates import VERIFICATION_PROMPT
from langchain_groq import ChatGroq
from pydantic import SecretStr, BaseModel, Field
import os

# --- Secure Configuration ---
_env_key = os.getenv("GROQ_API_KEY")
secret_key = SecretStr(_env_key) if _env_key else None

# --- SOTA INTELLIGENCE UPGRADE ---
# Using Llama 3.3 for superior adversarial critique capabilities
llm = ChatGroq(
    temperature=0, 
    model="llama-3.3-70b-versatile", # <--- UPGRADED
    api_key=secret_key
)

# --- SOTA: Structured Output Model ---
class HallucinationGrade(BaseModel):
    """Binary score for hallucination check."""
    is_hallucinating: bool = Field(description="True if the answer contains info not in the context")
    explanation: str = Field(description="Brief reason for the grade")

# LLM with Structured Output (The Prosecutor)
prosecutor_llm = llm.with_structured_output(HallucinationGrade)

# --- Node 1: The Librarian ---
async def retrieve_node(state: AgentState):
    print("--- PROTOCOL: RETRIEVING EVIDENCE ---")
    question = state["question"]
    # Mock ID for MVP, will be dynamic in Phase 7
    documents = await hybrid_search(query=question, user_id="00000000-0000-0000-0000-000000000000")
    return {"documents": documents, "status": "critiquing"}

# --- Node 2: The Writer ---
async def generate_node(state: AgentState):
    print("--- PROTOCOL: GENERATING DRAFT ---")
    context_text = "\n\n".join(state["documents"])
    chain = VERIFICATION_PROMPT | llm
    response = chain.invoke({"context": context_text, "question": state["question"]})
    return {"generation": response.content, "status": "verifying"}

# --- Node 3: The Prosecutor (The Hallucination Guard) ---
async def grade_generation_node(state: AgentState):
    print("--- PROTOCOL: ADVERSARIAL CRITIQUE ---")
    context = "\n\n".join(state["documents"])
    generation = state["generation"]

    # The Prosecutor examines the draft against the evidence
    grade: HallucinationGrade = prosecutor_llm.invoke(
        f"FACT CHECK: Compare the generation against the context.\n\nContext: {context}\n\nGeneration: {generation}"
    )

    if grade.is_hallucinating:
        print(f"HALLUCINATION DETECTED: {grade.explanation}")
        # Penalty: Reset score to 0 to trigger re-retrieval in graph
        return {"hallucination_score": 0.0, "status": "thinking"}
    
    print("EVIDENCE VERIFIED")
    return {"hallucination_score": 1.0, "status": "verified"}
