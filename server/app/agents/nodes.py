import os
import time
from typing import cast, List, Dict, Any

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
from app.core.evaluator import axiom_evaluator

# --- 1. TOOL ARCHITECTURE ---
python_repl = PythonREPL()
repl_tool = Tool(
    name="python_repl",
    description="A Python shell. Use this to execute math calculations. Input should be valid python code.",
    func=python_repl.run,
)

# --- 2. BRAIN CONFIGURATION ---
_env_key = os.getenv("GROQ_API_KEY")
secret_key = SecretStr(_env_key) if _env_key else None

# ARCHITECT: Llama 3.3 70B (The Lead Auditor)
base_llm = ChatGroq(
    temperature=0,
    model="llama-3.3-70b-versatile",
    api_key=secret_key
)
writer_llm = base_llm.bind_tools([repl_tool])

# DISTILLER: Llama 3.1 8B (The Context Editor)
grader_llm = ChatGroq(
    temperature=0,
    model="llama-3.1-8b-instant",
    api_key=secret_key
)

# --- 3. STRUCTURED OUTPUT MODELS ---
class DistilledContext(BaseModel):
    has_relevant_evidence: bool = Field(description="True if snippets contain facts relevant to the query.")
    brief: str = Field(description="The synthesized evidence brief. Must preserve source filenames if present.")

class HallucinationGrade(BaseModel):
    is_hallucinating: str = Field(description="Must be 'true' or 'false'.")
    explanation: str = Field(description="Detailed logic behind the grade")

# Bind Structured Outputs
editor_llm = grader_llm.with_structured_output(DistilledContext)
prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    """
    Station 1: Evidence Retrieval. 
    V3.0 Upgrade: Dynamically handles Single-Doc or Global Vault modes.
    """
    is_vault_mode = state["filename"] == "vault"
    target_label = "GLOBAL VAULT" if is_vault_mode else state["filename"]
    
    print(f"--- AXIOM: RETRIEVING FROM {target_label} ---")
    
    # Path B Strategy: If searching all docs, we double the candidate pool
    # to find relationships across different files.
    search_limit = 40 if is_vault_mode else 20
    search_filename = None if is_vault_mode else state["filename"]

    initial_chunks = await hybrid_search(
        query=state["question"], 
        user_id=state["user_id"], 
        filename=search_filename, 
        limit=search_limit
    )
    
    if not initial_chunks:
        return {
            "documents": [], 
            "generation": "Insufficient Evidence: The vault does not contain data related to this query.", 
            "status": "no_evidence"
        }

    # Path B Strategy: In Multi-Doc mode, we pass 8 chunks to the 70B instead of 5
    # to allow for comparative analysis (e.g., Doc A vs Doc B).
    top_k = 8 if is_vault_mode else 5
    gold_chunks = get_reranked_scores(query=state["question"], documents=initial_chunks, top_k=top_k)

    return {"documents": gold_chunks, "status": "thinking"}

async def distill_node(state: AgentState):
    """
    Station 1.5: Context Editor.
    Refines raw chunks into a high-density intelligence brief.
    """
    print("--- AXIOM: DISTILLING MULTI-SOURCE CONTEXT ---")
    context_text = monitor.guard_context(state["documents"])

    if not context_text.strip():
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    chain = DISTILLATION_PROMPT | editor_llm
    
    try:
        raw_response = await chain.ainvoke({
            "context": context_text,
            "question": state["question"]
        })
        response = cast(DistilledContext, raw_response)
        
        if not response.has_relevant_evidence:
            print("⚠️ EDITOR: Evidence insufficient for logical synthesis.")
            return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}
            
        return {"generation": response.brief, "status": "thinking"}
    except Exception as e:
        print(f"❌ EDITOR ERROR: {e}")
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

async def generate_node(state: AgentState):
    """
    Station 2: Synthesized Reasoning (70B).
    Final Audit Report Generation.
    """
    print("--- AXIOM: FINAL REASONING (70B) ---")
    distilled_brief = state["generation"]

    if distilled_brief == "NO RELEVANT EVIDENCE":
        return {
            "generation": "No direct evidence found in the vault.",
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
    Fast Logic Check + RAGAS Lite Telemetry.
    """
    print("--- AXIOM: ADVERSARIAL CRITIQUE & LITE SCORING ---")
    
    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    generation = state["generation"]
    question = state["question"]

    # Short-circuit for refusals to save latency
    if "No direct evidence found" in generation or "Insufficient Evidence" in generation:
        return {
            "hallucination_score": 1.0, 
            "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0}, 
            "status": "verified"
        }

    try:
        # Phase 1: Logic Check
        raw_grade = prosecutor_llm.invoke(
            f"FACT CHECK PROTOCOL:\nCONTEXT: {context_str}\nDRAFT: {generation}"
        )
        grade = cast(HallucinationGrade, raw_grade)
        is_hallucinating_bool = str(grade.is_hallucinating).strip().lower() == "true"

        if is_hallucinating_bool:
            print(f"❌ LOGIC BREACH: {grade.explanation}")
            from app.core.database import db 
            if db:
                try:
                    db.table("audit_logs").insert({
                        "user_id": state["user_id"],
                        "question": state["question"],
                        "faithfulness": 0.0, 
                        "precision": 0.0,
                        "relevance": 0.0,
                        "latency": 0.0 
                    }).execute()
                except: pass
            return {"hallucination_score": 0.0, "status": "thinking"}

        # Phase 2: RAGAS Audit
        print("--- AXIOM: EXECUTING RAGAS MATH AUDIT ---")
        scores = await axiom_evaluator.score_response(
            question=question,
            answer=generation,
            contexts=context_list
        )
        
        faithfulness_score = scores.get('faithfulness', 0.0)
        print(f"RAGAS Faithfulness: {faithfulness_score:.2f}")

        if faithfulness_score < 0.8:
            return {"hallucination_score": faithfulness_score, "metrics": scores, "status": "thinking"}

        return {"hallucination_score": faithfulness_score, "metrics": scores, "status": "verified"}
        
    except Exception as e:
        print(f"ERROR in Prosecutor: {e}")
        return {"hallucination_score": 0.0, "status": "thinking"}
