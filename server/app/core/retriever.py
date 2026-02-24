from typing import List, Dict, Any, Optional, cast
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(query: str, user_id: str, filename: Optional[str] = None, limit: int = 20) -> List[str]:
    """
    SOTA Retrieval Engine.
    Dynamically switches between Document-Scoped search and Global Vault search.
    """
    if not db: 
        return []
        
    try:
        # 1. Generate the NVIDIA Embedding
        vector = get_embedding(query, input_type="query")
        
        # 2. THE BLEED FIX: If we are in a specific document, lock the search!
        if filename:
            # Find the exact Database ID of the active document
            doc_res = db.table("documents").select("id").eq("filename", filename).eq("user_id", user_id).execute()
            
            # FIX: Explicitly cast data to List[Dict] to satisfy MyPy
            doc_data = cast(List[Dict[str, Any]], doc_res.data)

            if doc_data:
                doc_id = doc_data[0]['id']
                
                # Execute the single-document RPC
                res = db.rpc("match_document_chunks", {
                    "query_embedding": vector,
                    "match_limit": limit,
                    "target_document_id": doc_id,
                    "target_user_id": user_id
                }).execute()
                
                # FIX: Explicitly cast data to List[Dict]
                rows = cast(List[Dict[str, Any]], res.data)
                return [row["content"] for row in rows]
            else:
                print(f"⚠️ RETRIEVER: Document {filename} not found in vault.")
                return []

        # 3. FALLBACK: Global Vault Search (If no filename is passed)
        res = db.rpc("hybrid_vault_search", {
            "query_text": query,
            "query_embedding": vector,
            "match_count": limit,
            "target_user_id": user_id
        }).execute()
        
        # FIX: Explicitly cast data to List[Dict]
        rows = cast(List[Dict[str, Any]], res.data)
        return [row["content"] for row in rows]

    except Exception as e:
        print(f"❌ Retriever Error: {e}")
        return []
