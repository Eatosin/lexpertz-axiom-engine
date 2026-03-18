import os
from dotenv import load_dotenv

# 1. CRITICAL: Load environment variables BEFORE importing Axiom modules
# This ensures Supabase and Groq keys are in memory before the database connects.
load_dotenv()

from mcp.server.fastmcp import FastMCP
from typing import List

# Import Axiom Core
from app.agents.graph import app_graph
from app.core.retriever import hybrid_search

# Import Skills
from app.skills.github import execute_github_audit

# Initialize the MCP Server
mcp = FastMCP("Axiom-Sovereign-Auditor")

# Default user for local execution
MCP_SYSTEM_USER = os.getenv("MCP_SYSTEM_USER", "local-mcp-admin")

@mcp.tool()
async def run_axiom_audit(question: str, filenames: List[str]) -> str:
    """Executes a formal evidence-gated audit using the Axiom Sovereign Architect."""
    try:
        initial_state = {
            "question": question, 
            "filenames": filenames, 
            "user_id": MCP_SYSTEM_USER,
            "comparison_map": {}, 
            "documents":[], 
            "generation": "", 
            "hallucination_score": 0.0,
            "metrics": {}, 
            "status": "thinking", 
            "retry_count": 0
        }
        final_state = await app_graph.ainvoke(initial_state)
        return str(final_state.get("generation", "Audit yielded no results."))
    except Exception as e:
        return f"Axiom Core Error: {str(e)}"

@mcp.tool()
async def search_axiom_vault(query: str, filenames: List[str]) -> str:
    """Performs a high-speed hybrid vector search across the Axiom Vault."""
    try:
        results = await hybrid_search(query=query, user_id=MCP_SYSTEM_USER, filename=filenames)
        if not results: return "No matching evidence found."
        return "\n\n".join(results)
    except Exception as e:
        return f"Retrieval Error: {str(e)}"

@mcp.tool()
async def audit_github_repo(repo_full_name: str, file_path: str, audit_query: str, vault_filenames: List[str] =[]) -> str:
    """Audits a specific code file from GitHub against Vault evidence."""
    return await execute_github_audit(
        repo_full_name=repo_full_name,
        file_path=file_path,
        audit_query=audit_query,
        vault_filenames=vault_filenames,
        system_user=MCP_SYSTEM_USER
    )

if __name__ == "__main__":
    mcp.run()
