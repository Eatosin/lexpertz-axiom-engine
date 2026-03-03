from typing import List, Dict, Any, Optional, cast
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(query: str, user_id: str, filename: Optional[str] = None, limit: int = 20) -> List[str]:
    """
    SOTA Retrieval Engine V3.0-PREMIUM.
    Injects 'Exhibit-ID' metadata envelopes to force granular citations
    and eliminate internal 'Evidence Block' leakage in the UI.
    """
    if not db: 
        return []
        
    try:
        # 1. Generate the NVIDIA Embedding (1024-D)
        vector = get_embedding(query, input_type="query")
        
        # 2. Case: DOCUMENT-SCOPED SEARCH (Specific file)
        if filename and filename != "vault":
            doc_res = db.table("documents").select("id").eq("filename", filename).eq("user_id", user_id).execute()
            doc_data = cast(List[Dict[str, Any]], doc_res.data)

            if doc_data:
                doc_id = doc_data[0]['id']
                
                # Call the single-document RPC
                res = db.rpc("match_document_chunks", {
                    "query_embedding": vector,
                    "match_limit": limit,
                    "target_document_id": doc_id,
                    "target_user_id": user_id
                }).execute()
                
                rows = cast(List[Dict[str, Any]], res.data)
                
                # SOTA ENVELOPE: Injects Exhibit IDs and Filenames into the stream
                return [
                    f"--- EXHIBIT_START_ID_{i+1} ---\n"
                    f"FILE_SOURCE: {filename}\n"
                    f"DATA_CONTENT: {row['content']}\n"
                    f"--- EXHIBIT_END_ID_{i+1} ---" 
                    for i, row in enumerate(rows)
                ]
            else:
                print(f"⚠️ RETRIEVER: Context {filename} missing from vault.")
                return []

        # 3. Case: GLOBAL VAULT SEARCH (Multi-file reasoning)
        res = db.rpc("hybrid_vault_search", {
            "query_text": query,
            "query_embedding": vector,
            "match_count": limit,
            "target_user_id": user_id
        }).execute()
        
        rows = cast(List[Dict[str, Any]], res.data)
        
        # SOTA ENVELOPE: Dynamic filename extraction for cross-doc synthesis
        return [
            f"--- EXHIBIT_START_ID_{i+1} ---\n"
            f"FILE_SOURCE: {row['filename']}\n"
            f"DATA_CONTENT: {row['content']}\n"
            f"--- EXHIBIT_END_ID_{i+1} ---" 
            for i, row in enumerate(rows)
        ]

    except Exception as e:
        print(f"❌ RETRIEVER CRITICAL ERROR: {e}")
        return []
