import os
import time
from typing import cast, List, Dict, Any
from pydantic import SecretStr, BaseModel, Field

# Core AI Dependencies
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import Tool
from langchain_experimental.utilities import PythonREPL # type: ignore

# Internal Logic Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import reranker
from app.core.monitor import monitor
from app.prompts.templates import VERIFICATION_PROMPT, DISTILLATION_PROMPT

# --- 1. TOOL ARCHITECTURE (Deterministic Math Engine) ---
python_repl = PythonREPL()
repl_tool = Tool(
    name="python_repl",
    description="A Python shell. Use this to execute math calculations, deltas, and percentage changes. Input should be valid python code.",
    func=python_repl.run,
)

# --- 2. BRAIN CONFIGURATION (The Tiered Model Strategy) ---
_env_key = os.getenv("GROQ_API_KEY")
secret_key = SecretStr(_env_key) if _env_key else None

# ARCHITECT: Llama 3.3 70B (Deep Reasoning & Tool Usage)
base_llm = ChatGroq(
    temperature=0, 
    model="llama-3.3-70b-versatile", 
    api_key=secret_key
)
# Bind the math tool to the writer
writer_llm = base_llm.bind_tools([repl_tool])

# DISTILLER: Llama 3.1 8B (Fast Context Engineering)
grader_llm = ChatGroq(
    temperature=0, 
    model="llama-3.1-8b-instant", 
    api_key=secret_key
)

# --- 3. STRUCTURED OUTPUT MODEL (The Prosecutor) ---
class HallucinationGrade(BaseModel):
    is_hallucinating: bool = Field(description="True if the answer contains info not in the context")
    explanation: str = Field(description="Trace of the logic audit")

prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    """
    Station 1: Evidence Retrieval & Cross-Encoding.
    """
    print("--- AXIOM: INITIATING RERANKED RETRIEVAL ---")
    question = state["question"]
    user_id = state["user_id"]
    
    # 1. Broad Search (Top 20 candidates)
    initial_chunks = await hybrid_search(query=question, user_id=user_id, limit=20)
    
    if not initial_chunks:
        print("⚠️ VAULT-SILENCE: No context found.")
        return {
            "documents": [], 
            "generation": "Insufficient Evidence: The document vault does not contain data related to this query.", 
            "status": "no_evidence"
        }

    # 2. Precision Reranking (BGE-v2 Cross-Encoder)
    # The reranker returns List[Dict[text, score]], we extract the 'text' strings
    reranked_results = reranker.rerank(question, initial_chunks, top_k=6)
    gold_chunks = [str(r.get("text", "")) for r in reranked_results]
    
    return {"documents": gold_chunks, "status": "thinking"}

async def distill_node(state: AgentState):
    """
    Station 1.5: Context Editor (Option B).
    Synthesizes chunks into a concise Evidence Brief.
    """
    print("--- AXIOM: DISTILLING CONTEXT (8B) ---")
    
    # Apply KV-Cache Guard
    context_text = monitor.guard_context(state["documents"])
    
    if not context_text.strip():
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    chain = DISTILLATION_PROMPT | grader_llm
    response = await chain.ainvoke({
        "context": context_text, 
        "question": state["question"]
    })
    
    return {"generation": str(response.content), "status": "thinking"}

async def generate_node(state: AgentState):
    """
    Station 2: Synthesized Reasoning (70B).
    Reads the Distilled Brief and generates the final answer.
    """
    print("--- AXIOM: FINAL REASONING (70B) ---")
    
    distilled_brief = state["generation"]
    
    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {
            "generation": "I cannot verify an answer as the document contains no relevant data.", 
            "status": "verifying"
        }

    chain = VERIFICATION_PROMPT | writer_llm
    
    response = await chain.ainvoke({
        "context": distilled_brief, 
        "question": state["question"]
    })
    
    return {"generation": str(response.content), "status": "verifying"}

async def grade_generation_node(state: AgentState):
    """
    Station 3: Adversarial Audit.
    """
    print("--- AXIOM: ADVERSARIAL CRITIQUE ---")
    context = "\n\n".join(state["documents"])
    generation = state["generation"]

    # Use the structured prosecutor to fact-check the architect
    raw_grade = prosecutor_llm.invoke(
        f"FACT CHECK PROTOCOL:\nCONTEXT: {context}\nDRAFT: {generation}"
    )
    
    grade = cast(HallucinationGrade, raw_grade)

    if grade.is_hallucinating:
        print(f"❌ LOGIC BREACH: {grade.explanation}")
        return {"hallucination_score": 0.0, "status": "thinking"}
    
    print("EVIDENCE VERIFIED")
    return {"hallucination_score": 1.0, "status": "verified"}
