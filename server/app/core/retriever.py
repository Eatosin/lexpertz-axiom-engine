from typing import List, Dict, Any, cast
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(query: str, user_id: str, limit: int = 20) -> List[str]:
    """
    Performs vector search on Supabase to find evidence.
    Enforces RLS via user_id.
    """
    if not db:
        print("⚠️ DB Connection missing.")
        return []

    try:
        # 1. Convert User Question to Vector (Query Mode)
        query_vector = get_embedding(query, input_type="query")

        # 2. Call Supabase RPC
        params = {
            "query_embedding": query_vector,
            "match_threshold": 0.01, # SOTA FIX: Lowered to 0.01 to allow Reranker to decide relevance
            "match_count": limit,
            "filter_user": user_id
        }
        
        response = db.rpc("match_documents", params).execute()
        
        # 3. Format Results
        data = cast(List[Dict[str, Any]], response.data)
        
        # Debug Log: See how many raw chunks we found
        print(f"SEARCH DEBUG: Found {len(data)} raw matches from Vault.")
        
        evidence = [str(doc.get('content', '')) for doc in data if doc.get('content')]
        return evidence

    except Exception as e:
        print(f"❌ Retrieval Error: {str(e)}")
        return []
