from typing import List
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
        # Note: We will define this 'match_documents' function in SQL later
        params = {
            "query_embedding": query_vector,
            "match_threshold": 0.7, # Strictness (0.0 to 1.0)
            "match_count": limit,
            "filter_user": user_id
        }
        
        # Using the standard pgvector match function
        response = db.rpc("match_documents", params).execute()
        
        # 3. Format Results
        # We return a list of text chunks for the LLM to read
        evidence = [doc['content'] for doc in response.data]
        return evidence

    except Exception as e:
        print(f"Retrieval Error: {str(e)}")
        return []
