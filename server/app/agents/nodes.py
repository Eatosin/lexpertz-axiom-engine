from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.prompts.templates import VERIFICATION_PROMPT
from langchain_groq import ChatGroq
from pydantic import SecretStr # <--- Crucial Import
import os

# --- Secure Configuration ---
# We retrieve the key and wrap it to satisfy Pydantic strict typing
_env_key = os.getenv("GROQ_API_KEY")
# If key is missing, we pass None (LangChain will likely error at runtime, but types are safe)
secret_key = SecretStr(_env_key) if _env_key else None

# Initialize the Brain (Groq Llama 3)
llm = ChatGroq(
    temperature=0, 
    model="llama3-70b-8192", # FIXED: Changed from model_name to model
    api_key=secret_key       # FIXED: Passed as SecretStr object
)

# --- Node 1: The Librarian ---
async def retrieve_node(state: AgentState):
    """
    Scans the Vault for evidence.
    """
    print("--- RETRIEVING EVIDENCE ---")
    question = state["question"]
    # TODO: Pass real user_id from context in Phase 4
    documents = await hybrid_search(query=question, user_id="00000000-0000-0000-0000-000000000000")
    return {"documents": documents, "status": "critiquing"}

# --- Node 2: The Writer ---
async def generate_node(state: AgentState):
    """
    Synthesizes the answer using the strict Axiom Prompt.
    """
    print("--- GENERATING DRAFT ---")
    question = state["question"]
    documents = state["documents"]
    
    # Format documents as a single string context
    context_text = "\n\n".join(documents)
    
    # Chain the external prompt with the LLM
    chain = VERIFICATION_PROMPT | llm
    
    # Execute
    response = chain.invoke({
        "context": context_text, 
        "question": question
    })
    
    return {"generation": response.content, "status": "verified"}
