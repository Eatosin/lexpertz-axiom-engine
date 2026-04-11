import os
import sys
import asyncio
from typing import List, Optional
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from pydantic import Field

# 1. PATH RESOLUTION: Ensures .env is found in the monorepo root
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

# Axiom Intelligence Imports
from app.agents.graph import app_graph
from app.core.retriever import hybrid_search
from app.skills.github import execute_github_audit
from app.skills.database import upload_local_csv_to_vault, execute_dataset_audit

# Initialize FastMCP with Enterprise Service Identity
mcp = FastMCP("Axiom-Sovereign-Gateway")
SYSTEM_USER = os.getenv("MCP_SYSTEM_USER", "svc-axiom-core")

# --- 2. THE SOVEREIGN TOOLSET ---

@mcp.tool()
async def run_axiom_audit(
    question: str = Field(..., description="The high-level audit query (e.g., 'Verify revenue growth')"),
    filenames: List[str] = Field(..., description="The exact PDF filenames to target in the vault")
) -> str:
    """Executes a formal evidence-gated audit using the Sovereign Architect."""
    initial_state = {
        "question": question, 
        "filenames": filenames, 
        "user_id": SYSTEM_USER,
        "comparison_map": {}, "documents": [], "generation": "", 
        "hallucination_score": 0.0, "metrics": {}, "status": "thinking", 
        "retry_count": 0, "active_node": None
    }
    try:
        final_state = await app_graph.ainvoke(initial_state)
        return str(final_state.get("generation", "Audit yielded no results."))
    except Exception as e:
        return f"Axiom Core Error: {str(e)}"

@mcp.tool()
async def search_axiom_vault(
    query: str = Field(..., description="Semantic search query"),
    filenames: List[str] = Field(default=[], description="Specific files to search; leave empty for global")
) -> str:
    """Performs a high-speed hybrid vector search across the Axiom Vault."""
    try:
        results = await hybrid_search(query=query, user_id=SYSTEM_USER, filename=filenames)
        return "\n\n".join(results) if results else "No matching evidence found."
    except Exception as e:
        return f"Retrieval Error: {str(e)}"

@mcp.tool()
async def audit_code_implementation(
    file_path: str = Field(..., description="Path to the local code file"),
    file_content: str = Field(..., description="The raw source code text"),
    audit_query: str = Field(..., description="The specific rule/policy to verify the code against"),
    vault_filenames: List[str] = Field(default=[], description="Policy documents in the cloud vault")
) -> str:
    """Verifies if local code logic matches company policy or legal requirements."""
    print(f"[MCP] 🧬 Analyzing local implementation: {file_path}")
    return await execute_github_audit(
        file_path=file_path, file_content=file_content,
        audit_query=audit_query, vault_filenames=vault_filenames,
        system_user=SYSTEM_USER
    )

@mcp.tool()
async def upload_csv_dataset(
    file_path: str = Field(..., description="Local path to the CSV/Excel file"),
    dataset_name: str = Field(..., description="Unique identifier for this dataset in the vault")
) -> str:
    """Securely uploads a local spreadsheet to the Cloud Vault for reconciliation."""
    print(f"[MCP] Ingesting local data: {dataset_name}")
    return await upload_local_csv_to_vault(
        file_path=file_path, dataset_name=dataset_name, system_user=SYSTEM_USER
    )

@mcp.tool()
async def audit_live_dataset(
    dataset_name: str = Field(..., description="Name of the previously uploaded dataset"),
    audit_query: str = Field(..., description="Reconciliation instructions"),
    vault_filenames: List[str] = Field(default=[], description="PDF evidence to cross-reference")
) -> str:
    """Reconciles PDF evidence against a LIVE dataset previously uploaded to the vault."""
    print(f"[MCP] Reconciling Vault Dataset: {dataset_name}")
    return await execute_dataset_audit(
        dataset_name=dataset_name, audit_query=audit_query,
        vault_filenames=vault_filenames, system_user=SYSTEM_USER
    )

# --- 3. TRANSPORT EXECUTION ---

if __name__ == "__main__":
    # Supports StdIO (Claude Desktop) and Streamable HTTP (Enterprise Scale)
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    
    if transport == "streamable-http":
        print(f"🚀 Axiom MCP Gateway Launching on Port {os.getenv('PORT', 3001)} (HTTP)")
        mcp.run(transport="streamable-http", host="0.0.0.0", port=int(os.getenv("PORT", 3001)))
    else:
        mcp.run(transport="stdio")
