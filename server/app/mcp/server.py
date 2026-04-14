import os
import sys
import asyncio
from typing import List, Optional
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from pydantic import Field

# 1. PATH RESOLUTION
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

# Axiom Intelligence Imports
from app.agents.graph import app_graph
from app.agents.state import AgentState  # CRITICAL: For MyPy type safety
from app.core.retriever import hybrid_search
from app.skills.github import execute_github_audit
from app.skills.database import upload_local_csv_to_vault, execute_dataset_audit

# Initialize FastMCP
mcp = FastMCP("Axiom-Sovereign-Gateway")
SYSTEM_USER = os.getenv("MCP_SYSTEM_USER", "svc-axiom-core")

# --- 2. THE SOVEREIGN TOOLSET ---

@mcp.tool()
async def run_axiom_audit(
    question: str = Field(..., description="The high-level audit query"),
    filenames: List[str] = Field(..., description="The PDF filenames to target")
) -> str:
    """Executes a formal evidence-gated audit using the Sovereign Architect."""
    
    # SOTA: Strictly typed AgentState initialization
    initial_state: AgentState = {
        "question": question, 
        "user_id": SYSTEM_USER,
        "filenames": filenames, 
        "history": [],
        "command": None,
        "comparison_map": {}, 
        "documents": [], 
        "generation": "", 
        "hallucination_score": 0.0,
        "metrics": {}, 
        "status": "thinking", 
        "retry_count": 0,
        "active_node": None
    }
    
    try:
        # V1.x: Explicitly providing version='v1' ensures compatibility with SSE
        final_state = await app_graph.ainvoke(initial_state, {"version": "v1"})
        return str(final_state.get("generation", "Audit yielded no results."))
    except Exception as e:
        return f"Axiom Core Error: {str(e)}"

@mcp.tool()
async def search_axiom_vault(
    query: str = Field(..., description="Search query"),
    filenames: List[str] = Field(default=[], description="Specific files to search")
) -> str:
    """Performs a high-speed hybrid vector search."""
    try:
        results = await hybrid_search(query=query, user_id=SYSTEM_USER, filename=filenames)
        return "\n\n".join(results) if results else "No evidence found."
    except Exception as e:
        return f"Retrieval Error: {str(e)}"

@mcp.tool()
async def audit_code_implementation(
    file_path: str = Field(..., description="Path to code file"),
    file_content: str = Field(..., description="Raw source code"),
    audit_query: str = Field(..., description="Audit rule"),
    vault_filenames: List[str] = Field(default=[], description="Policy docs")
) -> str:
    """Verifies if local code logic matches policy."""
    return await execute_github_audit(
        file_path=file_path, file_content=file_content,
        audit_query=audit_query, vault_filenames=vault_filenames,
        system_user=SYSTEM_USER
    )

@mcp.tool()
async def upload_csv_dataset(
    file_path: str = Field(..., description="CSV path"),
    dataset_name: str = Field(..., description="Dataset ID")
) -> str:
    """Uploads spreadsheet to Vault."""
    return await upload_local_csv_to_vault(
        file_path=file_path, dataset_name=dataset_name, system_user=SYSTEM_USER
    )

@mcp.tool()
async def audit_live_dataset(
    dataset_name: str = Field(..., description="Dataset name"),
    audit_query: str = Field(..., description="Reconciliation instructions"),
    vault_filenames: List[str] = Field(default=[], description="PDF evidence")
) -> str:
    """Reconciles PDF evidence against a LIVE dataset."""
    return await execute_dataset_audit(
        dataset_name=dataset_name, audit_query=audit_query,
        vault_filenames=vault_filenames, system_user=SYSTEM_USER
    )

# --- 3. TRANSPORT EXECUTION ---

if __name__ == "__main__":
    transport_mode = os.getenv("MCP_TRANSPORT", "stdio")
    
    if transport_mode == "sse":
        print("Axiom MCP Gateway Launching in SSE Mode")
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")
