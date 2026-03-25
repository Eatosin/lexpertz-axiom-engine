import os
import sys
from dotenv import load_dotenv

# 1. Force absolute path for the .env file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

from mcp.server.fastmcp import FastMCP
from typing import List

# Import Axiom Core Intelligence
from app.agents.graph import app_graph
from app.core.retriever import hybrid_search

# Import V4.5 Purged/Secure Skills
from app.skills.github import execute_github_audit
from app.skills.database import upload_local_csv_to_vault, execute_dataset_audit

# Initialize the MCP Server
mcp = FastMCP("Axiom-Sovereign-Auditor")

# Default user for local execution (Maps to RLS in Supabase)
MCP_SYSTEM_USER = os.getenv("MCP_SYSTEM_USER", "local-mcp-admin")

@mcp.tool()
async def run_axiom_audit(question: str, filenames: List[str]) -> str:
    """Executes a formal evidence-gated audit using the Axiom Sovereign Architect."""
    try:
        # V4.4 Sync: Added active_node for SSE compatibility
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
            "retry_count": 0,
            "active_node": None
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
        if not results: return "No matching evidence found in the specified documents."
        return "\n\n".join(results)
    except Exception as e:
        return f"Retrieval Error: {str(e)}"

@mcp.tool()
async def audit_code_implementation(file_path: str, file_content: str, audit_query: str, vault_filenames: List[str] = []) -> str:
    """
    V4.5 SOTA: Audits local code content against Cloud Vault evidence.
    Use this to verify if code logic matches company policy or legal requirements.
    """
    print(f"[MCP] 🧬 Analyzing local implementation: {file_path}")
    return await execute_github_audit(
        file_path=file_path,
        file_content=file_content,
        audit_query=audit_query,
        vault_filenames=vault_filenames,
        system_user=MCP_SYSTEM_USER
    )

@mcp.tool()
async def upload_csv_dataset(file_path: str, dataset_name: str) -> str:
    """
    Reads a local CSV file and securely uploads it to the Axiom Cloud Vault.
    Use this when the user needs to provide a ledger or spreadsheet for reconciliation.
    """
    print(f"[MCP] Ingesting local data: {dataset_name}")
    return await upload_local_csv_to_vault(
        file_path=file_path,
        dataset_name=dataset_name,
        system_user=MCP_SYSTEM_USER
    )

@mcp.tool()
async def audit_live_dataset(dataset_name: str, audit_query: str, vault_filenames: List[str] = []) -> str:
    """
    Reconciles PDF evidence against a LIVE dataset previously uploaded to the vault.
    """
    print(f"[MCP] Reconciling Vault Dataset: {dataset_name}")
    return await execute_dataset_audit(
        dataset_name=dataset_name,
        audit_query=audit_query,
        vault_filenames=vault_filenames,
        system_user=MCP_SYSTEM_USER
    )

if __name__ == "__main__":
    mcp.run()
