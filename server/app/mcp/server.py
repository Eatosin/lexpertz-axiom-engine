import os
from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Any, cast

# Import your Axiom Core Intelligence
from app.agents.graph import app_graph
from app.core.retriever import hybrid_search

# Initialize the MCP Server (The "Agentic USB Port")
mcp = FastMCP("Axiom-Sovereign-Auditor")

# Hardcoded user for local testing (In prod, MCP can pass context)
MCP_SYSTEM_USER = os.getenv("MCP_SYSTEM_USER", "local-mcp-admin")

@mcp.tool()
async def run_axiom_audit(question: str, filenames: List[str]) -> str:
    """
    Executes a formal evidence-gated audit using the Axiom Sovereign Architect.
    Use this tool to compare documents, find loopholes, or perform financial math.
    """
    print(f"[MCP] 🚀 Triggering Axiom Audit: {question}")
    
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
    """
    Performs a high-speed hybrid vector search across the Axiom Vault.
    Use this to pull raw evidence or exact clauses before running an audit.
    """
    print(f"[MCP] 🔍 Searching Vault for: {query}")
    
    try:
        # Pass the list directly to the newly upgraded V3.1 retriever
        results = await hybrid_search(
            query=query, 
            user_id=MCP_SYSTEM_USER, 
            filename=filenames
        )
        
        if not results:
            return "No matching evidence found in the specified documents."
            
        return "\n\n".join(results)
        
    except Exception as e:
        return f"Retrieval Error: {str(e)}"

# Boilerplate execution for stdio communication
if __name__ == "__main__":
    print("Initializing Axiom MCP Server on stdio...")
    mcp.run()
