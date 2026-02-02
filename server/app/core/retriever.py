from typing import List, Dict, Any, cast
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(query: str, user_id: str, limit: int = 4) -> List[str]:
    """
    Performs vector search on Supabase to find evidence.
    Enforces RLS via user_id.
    """
    if not db:
        print("DB Connection missing.")
        return []

    try:
        # 1. Convert User Question to Vector
        query_vector = get_embedding(query)

        # 2. Call Supabase RPC (Remote Procedure Call)
        params = {
            "query_embedding": query_vector,
            "match_threshold": 0.7, # Strictness (0.0 to 1.0)
            "match_count": limit,
            "filter_user": user_id
        }
        
        # Using the standard pgvector match function
        response = db.rpc("match_documents", params).execute()
        
        # --- TYPE SAFETY FIX ---
        # Explicitly tell MyPy that 'response.data' is a list of dictionaries
        data = cast(List[Dict[str, Any]], response.data)
        
        # Safe extraction: convert content to string to satisfy List[str] return type
        evidence = [str(doc.get('content', '')) for doc in data if doc.get('content')]
        
        return evidence

    except Exception as e:
        print(f"Retrieval Error: {str(e)}")
        return []
