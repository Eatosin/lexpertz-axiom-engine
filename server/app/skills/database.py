import os
import json
import pandas as pd
from typing import List, Dict, Any, cast

from app.core.database import db
from app.agents.graph import app_graph
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
        return f"Error: File not found at {file_path}. Please check the path and try again."
    
    try:
        # 1. Safely parse the CSV using Pandas
        df = pd.read_csv(file_path)
        df = df.fillna("") # Clean NaN values that break JSON serialization
        columns = df.columns.tolist()
        records = df.to_dict(orient="records")
        
        # 2. Purge old dataset if overwriting (Idempotency)
        db.table("user_datasets").delete().eq("user_id", system_user).eq("dataset_name", dataset_name).execute()
        
        # 3. Insert new dynamic dataset
        db.table("user_datasets").insert({
            "user_id": system_user,
            "dataset_name": dataset_name,
            "columns": columns,
            "data": records
        }).execute()
        
        return f"SUCCESS: Ingested {len(records)} rows into secure vault under dataset name '{dataset_name}'."
        
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
        # 1. Fetch user's private dataset securely via RLS/User Scoping
        res = db.table("user_datasets").select("columns, data").eq("user_id", system_user).eq("dataset_name", dataset_name).execute()
        rows = cast(List[Dict[str, Any]], res.data)
        
        if not rows:
            return f"Dataset '{dataset_name}' not found. Please upload it using the upload_local_csv_to_vault tool first."
            
        # 2. Limit to 500 rows to protect LLM context window limits
        dataset_records = rows[0]["data"]
        safe_records = dataset_records[:500]
        dataset_content = json.dumps(safe_records, indent=2)
        
        # 3. Format using isolated skill prompts
        formatted_query = DATASET_QUERY_WRAPPER.format(
            dataset_name=dataset_name, 
            dataset_content=dataset_content, 
            audit_query=audit_query
        )
        
        db_exhibit = DATASET_EXHIBIT_WRAPPER.format(
            dataset_name=dataset_name, 
            dataset_content=dataset_content
        )
        
        # 4. Pull additional PDF context if requested
        pdf_context =[]
        if vault_filenames:
            pdf_context = await hybrid_search(query=audit_query, user_id=system_user, filename=vault_filenames)

        # 5. Combine DB Data and PDF Data into the context stream
        all_context = pdf_context + [db_exhibit]
        
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
        
        # 6. Trigger the LangGraph Circuit
        final_state = await app_graph.ainvoke(initial_state)
        return str(final_state.get("generation", "Audit complete."))
        
    except Exception as e:
        return f"Database Audit Error: {str(e)}"
