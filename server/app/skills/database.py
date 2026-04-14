import os
import json
import asyncio
import pandas as pd
from typing import List, Dict, Any, cast

from app.core.database import db
from app.agents.graph import app_graph
from app.agents.state import AgentState
from app.core.retriever import hybrid_search

# ==========================================
# 1. SKILL-SPECIFIC PROMPT ADAPTERS
# ==========================================
DATASET_QUERY_WRAPPER = """Audit the static document claims against the LIVE structured dataset below.

### LIVE DATASET ({dataset_name}):
{dataset_content}

### AUDIT QUERY:
{audit_query}
"""

DATASET_EXHIBIT_WRAPPER = """--- EXHIBIT_START_ID_DATABASE ---
FILE_SOURCE: Live Axiom Database | Dataset: {dataset_name}
DATA_CONTENT: {dataset_content}
--- EXHIBIT_END_ID_DATABASE ---"""

# ==========================================
# 2. SKILL EXECUTION LOGIC
# ==========================================

async def upload_local_csv_to_vault(
    file_path: str, 
    dataset_name: str, 
    system_user: str
) -> str:
    """Reads a local CSV and securely uploads it to the user's JSONB vault."""
    if not db:
        return "CRITICAL ERROR: Database offline."
    
    if not os.path.exists(file_path):
        return f"Error: File not found at {file_path}."
    
    try:
        # 1. Thread-safe parsing
        def parse_csv():
            df = pd.read_csv(file_path)
            return df.fillna("").columns.tolist(), df.to_dict(orient="records")

        columns, records = await asyncio.to_thread(parse_csv)
        
        # 2. Non-blocking Database ops
        await asyncio.to_thread(
            lambda: db.table("user_datasets")
            .delete()
            .eq("user_id", system_user)
            .eq("dataset_name", dataset_name)
            .execute()
        )
        
        await asyncio.to_thread(
            lambda: db.table("user_datasets").insert({
                "user_id": system_user,
                "dataset_name": dataset_name,
                "columns": columns,
                "data": records
            }).execute()
        )
        
        return f"SUCCESS: Ingested {len(records)} rows into dataset '{dataset_name}'."
        
    except Exception as e:
        return f"Failed to parse or upload CSV: {str(e)}"


async def execute_dataset_audit(
    dataset_name: str, 
    audit_query: str, 
    vault_filenames: List[str], 
    system_user: str
) -> str:
    """Pulls live JSONB data and cross-references it with PDF context."""
    if not db:
        return "CRITICAL ERROR: Database offline."
    
    try:
        # 1. Non-blocking fetch
        res = await asyncio.to_thread(
            lambda: db.table("user_datasets")
            .select("columns, data")
            .eq("user_id", system_user)
            .eq("dataset_name", dataset_name)
            .execute()
        )
        rows = cast(List[Dict[str, Any]], res.data)
        
        if not rows:
            return f"Dataset '{dataset_name}' not found. Upload it first."
            
        dataset_content = json.dumps(rows[0]["data"][:500], indent=2)
        
        # 2. Formatting
        formatted_query = DATASET_QUERY_WRAPPER.format(
            dataset_name=dataset_name, dataset_content=dataset_content, audit_query=audit_query
        )
        
        db_exhibit = DATASET_EXHIBIT_WRAPPER.format(
            dataset_name=dataset_name, dataset_content=dataset_content
        )
        
        # 3. PDF Retrieval
        pdf_context = await hybrid_search(query=audit_query, user_id=system_user, filename=vault_filenames) if vault_filenames else []
        all_context = pdf_context + [db_exhibit]
        
        # 4. Strictly Typed State
        initial_state: AgentState = {
            "question": formatted_query,
            "user_id": system_user,
            "filenames": vault_filenames,
            "history": [],
            "command": None,
            "comparison_map": {},
            "documents": all_context, 
            "generation": "",
            "hallucination_score": 0.0,
            "metrics": {},
            "status": "thinking",
            "retry_count": 0,
            "active_node": None
        }
        
        # 5. Invoke circuit with SSE versioning
        final_state = await app_graph.ainvoke(initial_state, {"version": "v1"})
        return str(final_state.get("generation", "Audit complete."))
        
    except Exception as e:
        return f"Database Audit Error: {str(e)}"
