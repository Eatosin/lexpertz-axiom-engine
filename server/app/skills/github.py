import os
from github import Github
from typing import List
from app.agents.graph import app_graph
from app.core.retriever import hybrid_search

# ==========================================
# 1. SKILL-SPECIFIC PROMPT ADAPTERS
# ==========================================
GITHUB_QUERY_WRAPPER = """Audit this codebase implementation against the provided vault evidence.

### GITHUB CODE ({file_path}):
{file_content}

### AUDIT QUERY:
{audit_query}
"""

GITHUB_EXHIBIT_WRAPPER = """--- EXHIBIT_START_ID_CODE ---
FILE_SOURCE: GitHub Repo: {repo_full_name} | File: {file_path}
DATA_CONTENT: {file_content}
--- EXHIBIT_END_ID_CODE ---"""


# --- SKILL EXECUTION LOGIC ---
async def execute_github_audit(
    repo_full_name: str, 
    file_path: str, 
    audit_query: str, 
    vault_filenames: List[str], 
    system_user: str
) -> str:
    """Core logic for the GitHub Repository Auditor Skill."""
    
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token:
        return "CRITICAL ERROR: GITHUB_TOKEN environment variable is missing."
        
    try:
        g = Github(github_token)
        repo = g.get_repo(repo_full_name)
        file_content = repo.get_contents(file_path).decoded_content.decode('utf-8')
        
        formatted_query = GITHUB_QUERY_WRAPPER.format(
            file_path=file_path, 
            file_content=file_content, 
            audit_query=audit_query
        )
        
        code_exhibit = GITHUB_EXHIBIT_WRAPPER.format(
            repo_full_name=repo_full_name, 
            file_path=file_path, 
            file_content=file_content
        )
        
        pdf_context = []
        if vault_filenames:
            pdf_context = await hybrid_search(query=audit_query, user_id=system_user, filename=vault_filenames)

        all_context = pdf_context + [code_exhibit]
        
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
            "retry_count": 0
        }
        
        final_state = await app_graph.ainvoke(initial_state)
        return str(final_state.get("generation", "Audit complete."))
        
    except Exception as e:
        return f"GitHub Audit Error: {str(e)}"
