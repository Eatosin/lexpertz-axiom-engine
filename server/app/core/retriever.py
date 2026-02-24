from typing import List, Dict, Any
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(query: str, user_id: str, filename: str = None, limit: int = 20) -> List[str]:
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
            
            if doc_res.data:
                doc_id = doc_res.data[0]['id']
                
                # Execute the single-document RPC we just created
                res = db.rpc("match_document_chunks", {
                    "query_embedding": vector,
                    "match_limit": limit,
                    "target_document_id": doc_id,
                    "target_user_id": user_id
                }).execute()
                
                return [row["content"] for row in res.data]
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
        
        return [row["content"] for row in res.data]

    except Exception as e:
        print(f"❌ Retriever Error: {e}")
        return []
