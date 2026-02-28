from typing import List, Dict, Any, Optional, cast
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(query: str, user_id: str, filename: Optional[str] = None, limit: int = 20) -> List[str]:
    """
    SOTA Retrieval Engine.
    Injects 'Evidence Block' IDs to support academic Footnote Citations.
    """
    if not db: 
        return[]
        
    try:
        vector = get_embedding(query, input_type="query")
        
        # 1. DOCUMENT-SCOPED SEARCH
        if filename and filename != "vault":
            doc_res = db.table("documents").select("id").eq("filename", filename).eq("user_id", user_id).execute()
            doc_data = cast(List[Dict[str, Any]], doc_res.data)

            if doc_data:
                doc_id = doc_data[0]['id']
                res = db.rpc("match_document_chunks", {
                    "query_embedding": vector,
                    "match_limit": limit,
                    "target_document_id": doc_id,
                    "target_user_id": user_id
                }).execute()
                
                rows = cast(List[Dict[str, Any]], res.data)
                # FIX: Format as Evidence Blocks for Footnoting
                return [f"[Evidence Block {i+1} | Source: {filename}]\n{row['content']}" for i, row in enumerate(rows)]
            else:
                print(f"⚠️ RETRIEVER: Document {filename} not found in vault.")
                return[]

        # 2. GLOBAL VAULT SEARCH
        res = db.rpc("hybrid_vault_search", {
            "query_text": query,
            "query_embedding": vector,
            "match_count": limit,
            "target_user_id": user_id
        }).execute()
        
        rows = cast(List[Dict[str, Any]], res.data)
        # FIX: Format as Evidence Blocks including dynamic filenames
        return [f"[Evidence Block {i+1} | Source: {row['filename']}]\n{row['content']}" for i, row in enumerate(rows)]

    except Exception as e:
        print(f"❌ Retriever Error: {e}")
        return[]
