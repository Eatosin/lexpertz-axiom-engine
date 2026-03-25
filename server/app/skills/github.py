import os
from typing import List
from app.agents.graph import app_graph
from app.core.retriever import hybrid_search

# --- PROMPT ADAPTERS ---
# These format the raw code for the 70B Architect Node
GITHUB_QUERY_WRAPPER = """Audit this codebase implementation against the provided vault evidence.

### GITHUB CODE ({file_path}):
{file_content}

### AUDIT QUERY:
{audit_query}
"""

GITHUB_EXHIBIT_WRAPPER = """--- EXHIBIT_START_ID_CODE ---
FILE_SOURCE: GitHub Evidence | File: {file_path}
DATA_CONTENT: {file_content}
--- EXHIBIT_END_ID_CODE ---"""


# --- SKILL EXECUTION LOGIC ---
async def execute_github_audit(
    file_path: str, 
    file_content: str, # NEW: Received from user's local bridge
    audit_query: str, 
    vault_filenames: List[str], 
    system_user: str
) -> str:
    """
    V4.5 SOTA: Receives local code content and cross-references it with Cloud PDF Vault.
    No GITHUB_TOKEN required on server - 100% Secure for Commercial SaaS.
    """
    try:
        # 1. Format the data using the decoupled wrappers
        formatted_query = GITHUB_QUERY_WRAPPER.format(
            file_path=file_path, 
            file_content=file_content, 
            audit_query=audit_query
        )
        
        code_exhibit = GITHUB_EXHIBIT_WRAPPER.format(
            file_path=file_path, 
            file_content=file_content
        )
        
        # 2. Pull secondary context from the Supabase PDF Vault
        pdf_context = []
        if vault_filenames:
            pdf_context = await hybrid_search(
                query=audit_query, 
                user_id=system_user, 
                filename=vault_filenames
            )

        # 3. Merge Local Code with Cloud PDFs into the context stream
        all_context = pdf_context + [code_exhibit]
        
        # 4. Initialize State for V4.4 Graph
        initial_state = {
            "question": formatted_query,
            "filenames": vault_filenames, 
            "user_id": system_user,
            "comparison_map": {},
            "documents": all_context, 
            "generation": "",
            "hallucination_score": 0.0,
            "metrics": {},
            "status": "thinking",
            "retry_count": 0,
            "active_node": None # Required by new State schema
        }
        
        # 5. Invoke the Sovereign reasoning circuit
        final_state = await app_graph.ainvoke(initial_state)
        return str(final_state.get("generation", "Audit yielded no results."))
        
    except Exception as e:
        return f"Sovereign Audit Error: {str(e)}"
