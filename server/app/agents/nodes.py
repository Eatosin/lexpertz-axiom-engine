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

# ARCHITECT: Llama 3.3 70B
base_llm = ChatGroq(
    temperature=0,
    model="llama-3.3-70b-versatile",
    api_key=secret_key
)
writer_llm = base_llm.bind_tools([repl_tool])

# DISTILLER: Llama 3.1 8B
grader_llm = ChatGroq(
    temperature=0,
    model="llama-3.1-8b-instant",
    api_key=secret_key
)

# --- 3. STRUCTURED OUTPUT MODELS (The 10/10 Refactor) ---
class DistilledContext(BaseModel):
    has_relevant_evidence: bool = Field(description="True if the snippets contain facts relevant to the query, False if completely irrelevant.")
    brief: str = Field(description="The synthesized evidence brief. If false, leave blank.")

class HallucinationGrade(BaseModel):
    is_hallucinating: str = Field(description="Must be 'true' or 'false'.")
    explanation: str = Field(description="Detailed logic behind the grade")

# Bind Structured Outputs
editor_llm = grader_llm.with_structured_output(DistilledContext)
prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    print(f"--- AXIOM: RETRIEVING SCOPED TO {state['filename']} ---")
    question = state["question"]
    user_id = state["user_id"]

    initial_chunks = await hybrid_search(query=question, user_id=user_id, filename=state["filename"], limit=20)
    if not initial_chunks:
        return {"documents": [], "generation": "Insufficient Evidence.", "status": "no_evidence"}

    gold_chunks = get_reranked_scores(query=question, documents=initial_chunks, top_k=5)
    return {"documents": gold_chunks, "status": "thinking"}

async def distill_node(state: AgentState):
    print("--- AXIOM: DISTILLING CONTEXT (8B) ---")
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
        
        # DETERMINISTIC OVERRIDE: Python controls the string, not the LLM
        if not response.has_relevant_evidence:
            print("⚠️ EDITOR: Context rejected. No relevant evidence.")
            return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}
            
        return {"generation": response.brief, "status": "thinking"}
    except Exception as e:
        print(f"❌ EDITOR CRASH CAUGHT: {e}")
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

async def generate_node(state: AgentState):
    print("--- AXIOM: FINAL REASONING (70B) ---")
    distilled_brief = state["generation"]

    # 100% Deterministic match
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
    print("--- AXIOM: ADVERSARIAL CRITIQUE & RAGAS LITE ---")
    
    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    generation = state["generation"]
    question = state["question"]
    
    # SHORT-CIRCUIT: If the answer is a standard refusal, skip the heavy audit.
    if "No direct evidence found" in generation or "Insufficient Evidence" in generation:
        print("REFUSAL DETECTED: Skipping RAGAS to conserve latency.")
        return {
            "hallucination_score": 1.0, 
            "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0}, 
            "status": "verified"
        }

    try:
        # Phase 1: Fast Llama Logic Check
        raw_grade = prosecutor_llm.invoke(
            f"FACT CHECK PROTOCOL:\nCONTEXT: {context_str}\nDRAFT: {generation}"
        )
        grade = cast(HallucinationGrade, raw_grade)
        is_hallucinating_bool = str(grade.is_hallucinating).strip().lower() == "true"

        if is_hallucinating_bool:
            print(f"❌ LOGIC BREACH: {grade.explanation}")
            
            if db:
            try:
                db.table("audit_logs").insert({
                    "user_id": state["user_id"],
                    "question": state["question"],
                    "faithfulness": 0.0, # Record the failure
                    "precision": 0.0,
                    "relevance": 0.0,
                    "latency": 0.0 # Failed attempts aren't counted in avg latency
                }).execute()
            except: pass 
                
            return {"hallucination_score": 0.0, "status": "thinking"}

        # Phase 2: RAGAS LITE AUDIT
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
        print(f"❌ ERROR: {e}")
        return {"hallucination_score": 0.0, "status": "thinking"}
