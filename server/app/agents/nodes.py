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
from app.prompts.templates import VERIFICATION_PROMPT

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
base_llm = ChatGroq(
    temperature=0, 
    model="llama-3.3-70b-versatile", 
    api_key=secret_key
)

# Writer Model (Has Tools)
# This creates a RunnableBinding, which loses some methods
writer_llm = base_llm.bind_tools([repl_tool])

# --- 3. STRUCTURED OUTPUT MODEL (The Prosecutor) ---
class HallucinationGrade(BaseModel):
    is_hallucinating: bool = Field(description="True if the answer contains info not found in the context")
    explanation: str = Field(description="Detailed logic behind the grade")

# Prosecutor Model (Has Structure)
# We invoke this on the BASE LLM, not the writer_llm, to avoid the attribute error
prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    print("--- AXIOM: RETRIEVING EVIDENCE ---")
    question = state["question"]
    user_id = state["user_id"]
    documents = await hybrid_search(query=question, user_id=user_id)
    return {"documents": documents, "status": "critiquing"}

async def generate_node(state: AgentState):
    print("--- AXIOM: GENERATING VERIFIED RESPONSE ---")
    context_text = "\n\n".join(state["documents"])
    
    # We use the Tool-Aware Writer LLM here
    chain = VERIFICATION_PROMPT | writer_llm
    
    response = chain.invoke({
        "context": context_text, 
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
