import os
import time
from typing import cast, List, Dict, Any

# --- CRITICAL FIX ---
from langchain_core.pydantic_v1 import SecretStr, BaseModel, Field

# Core AI Dependencies
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import Tool
from langchain_experimental.utilities import PythonREPL # type: ignore

# Internal Logic Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import get_reranked_scores 
from app.core.monitor import monitor
from app.prompts.templates import VERIFICATION_PROMPT, DISTILLATION_PROMPT

# --- 1. TOOL ARCHITECTURE (Deterministic Math Engine) ---
python_repl = PythonREPL()
repl_tool = Tool(
    name="python_repl",
    description="A Python shell. Use this to execute math calculations. Input should be valid python code.",
    func=python_repl.run,
)

# --- 2. BRAIN CONFIGURATION ---
_env_key = os.getenv("GROQ_API_KEY")
secret_key = SecretStr(_env_key) if _env_key else None

# ARCHITECT: Llama 3.3 70B
base_llm = ChatGroq(
    temperature=0,
    model="llama-3.3-70b-versatile",
    api_key=secret_key
)
# MYPY FIX: Properly pass the tool as a list
writer_llm = base_llm.bind_tools()

# DISTILLER: Llama 3.1 8B
grader_llm = ChatGroq(
    temperature=0,
    model="llama-3.1-8b-instant",
    api_key=secret_key
)

# --- 3. STRUCTURED OUTPUT MODEL ---
class HallucinationGrade(BaseModel):
    # TIMEOUT FIX: Accepts a string so the API never crashes if LLM outputs "false"
    is_hallucinating: str = Field(description="Must be exactly 'true' or 'false'. True if the answer contains info not found in the context")
    explanation: str = Field(description="Detailed logic behind the grade")

prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    """
    Station 1: Evidence Retrieval & Cross-Encoding.
    """
    print("--- AXIOM: RETRIEVING & RERANKING ---")
    
    # MYPY FIX: Access the dictionary keys properly
    question = state
    user_id = state

    # 1. Broad Search
    initial_chunks = await hybrid_search(query=question, user_id=user_id, limit=20)

    if not initial_chunks:
        print("⚠️ VAULT-SILENCE: No context found.")
        return {
            "documents":[],
            "generation": "Insufficient Evidence: The document vault does not contain data related to this query.",
            "status": "no_evidence"
        }

    # 2. Precision Reranking (Using our new thread-safe function)
    gold_chunks = get_reranked_scores(query=question, documents=initial_chunks, top_k=5)

    return {"documents": gold_chunks, "status": "thinking"}

async def distill_node(state: AgentState):
    """
    Station 1.5: Context Editor.
    """
    print("--- AXIOM: DISTILLING CONTEXT (8B) ---")
    
    # MYPY FIX: Pass the documents list, not the whole state
    context_text = monitor.guard_context(state)

    if not context_text.strip():
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    chain = DISTILLATION_PROMPT | grader_llm
    response = await chain.ainvoke({
        "context": context_text,
        "question": state
    })

    return {"generation": str(response.content), "status": "thinking"}

async def generate_node(state: AgentState):
    """
    Station 2: Synthesized Reasoning.
    """
    print("--- AXIOM: FINAL REASONING (70B) ---")
    
    # MYPY FIX: Access the generation key
    distilled_brief = state

    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {
            "generation": "I cannot verify an answer as the document contains no relevant data.",
            "status": "verifying"
        }

    chain = VERIFICATION_PROMPT | writer_llm

    response = await chain.ainvoke({
        "context": distilled_brief,
        "question": state
    })

    return {"generation": str(response.content), "status": "verifying"}

async def grade_generation_node(state: AgentState):
    """
    Station 3: Adversarial Audit.
    """
    print("--- AXIOM: ADVERSARIAL CRITIQUE ---")
    
    # MYPY FIX: Access dictionary keys
    context = "\n\n".join(state)
    generation = state

    try:
        # Wrap in try-except to catch Groq strict-JSON glitches
        raw_grade = prosecutor_llm.invoke(
            f"FACT CHECK PROTOCOL:\nCONTEXT: {context}\nDRAFT: {generation}"
        )

        grade = cast(HallucinationGrade, raw_grade)

        # Safely convert the string "false"/"true" to boolean
        is_hallucinating_bool = str(grade.is_hallucinating).strip().lower() == "true"

        if is_hallucinating_bool:
            print(f"❌ LOGIC BREACH: {grade.explanation}")
            return {"hallucination_score": 0.0, "status": "thinking"}

        print("EVIDENCE VERIFIED")
        return {"hallucination_score": 1.0, "status": "verified"}
        
    except Exception as e:
        print(f"❌ GRAPH CRASH CAUGHT: {e}")
        # Fail-Safe: Don't timeout, let the graph retry
        return {"hallucination_score": 0.0, "status": "thinking"}
