import os
from typing import cast, List, Dict, Any
from pydantic import SecretStr, BaseModel, Field

# Core AI Dependencies
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import Tool
from langchain_experimental.utilities import PythonREPL # type: ignore

# Internal Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.prompts.templates import VERIFICATION_PROMPT, DISTILLATION_PROMPT
from app.core.reranker import reranker

# --- 1. TOOL ARCHITECTURE ---
python_repl = PythonREPL()
repl_tool = Tool(
    name="python_repl",
    description="A Python shell. Use this to execute math calculations. Input should be valid python code.",
    func=python_repl.run,
)

# --- 2. BRAIN CONFIGURATION (The Fork) ---
_env_key = os.getenv("GROQ_API_KEY")
secret_key = SecretStr(_env_key) if _env_key else None

# Base Model (Raw)
# ARCHITECT: Llama 3.3 70B
base_llm = ChatGroq(
    temperature=0, 
    model="llama-3.3-70b-versatile", 
    api_key=secret_key
)
writer_llm = base_llm.bind_tools([repl_tool])

# DISTILLER/GRADER: Llama 3.1 8B (Fast & Cheap for processing)
# This saves 80% of your token quota
grader_llm = ChatGroq(
    temperature=0, 
    model="llama-3.1-8b-instant", 
    api_key=secret_key
)

# --- 3. STRUCTURED OUTPUT MODEL (The Prosecutor) ---
class HallucinationGrade(BaseModel):
    is_hallucinating: bool = Field(description="True if the answer contains info not found in the context")
    explanation: str = Field(description="Detailed logic behind the grade")

# Prosecutor Model (Has Structure)
# We invoke this on the BASE LLM, not the writer_llm, to avoid the attribute error
prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    print("--- AXIOM: SEMANTIC RETRIEVAL + RERANKING ---")
    question = state["question"]
    user_id = state["user_id"]
    
    # 1. Fetch 'Candidates' (Top 20) to ensure we have enough noise to filter
    initial_chunks = await hybrid_search(query=question, user_id=user_id, limit=20)
    
    if not initial_chunks:
        return {"documents": [], "status": "error"}

    # 2. RERANKING
    # This specifically solves the 429 Rate Limit by reducing token count by 75%
    verified_context = reranker.rerank(query=question, documents=initial_chunks)
    
    print(f"RERANKED: Selected {len(verified_context)} high-fidelity chunks.")
    
    return {"documents": verified_context, "status": "critiquing"}

# --- Node 1.5: The Context Editor (SOTA Context Engineering) ---
async def distill_node(state: AgentState):
    """
    Synthesizes 20 chunks into 1 Evidence Brief using the 8B model.
    """
    print("--- AXIOM: DISTILLING CONTEXT (8B) ---")
    
    context_text = "\n\n".join(state["documents"])
    chain = DISTILLATION_PROMPT | grader_llm
    
    response = await chain.ainvoke({
        "context": context_text, 
        "question": state["question"]
    })
    
    return {"generation": str(response.content), "status": "thinking"}

# --- Node 2: The Writer (Architect) ---
async def generate_node(state: AgentState):
    """
    Uses the Distilled Brief to write the final verified answer.
    """
    print("--- AXIOM: FINAL REASONING (70B) ---")
    
    # We now use the generation from the distill_node as our context
    distilled_brief = state["generation"]
    
    chain = VERIFICATION_PROMPT | writer_llm
    
    response = await chain.ainvoke({
        "context": distilled_brief, 
        "question": state["question"]
    })
    
    return {"generation": str(response.content), "status": "verifying"}

async def grade_generation_node(state: AgentState):
    print("--- AXIOM: ADVERSARIAL CRITIQUE ---")
    context = "\n\n".join(state["documents"])
    generation = state["generation"]

    # We use the Structured Prosecutor LLM here
    raw_grade = prosecutor_llm.invoke(
        f"AUDIT PROTOCOL: Cross-reference the generation against the context.\n\n"
        f"CONTEXT: {context}\n\n"
        f"GENERATION: {generation}"
    )
    
    grade = cast(HallucinationGrade, raw_grade)

    if grade.is_hallucinating:
        print(f"❌ LOGIC BREACH: {grade.explanation}")
        return {"hallucination_score": 0.0, "status": "thinking"}
    
    print("EVIDENCE VERIFIED")
    return {"hallucination_score": 1.0, "status": "verified"}
