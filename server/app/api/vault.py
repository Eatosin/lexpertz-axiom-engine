from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, cast
from app.core.database import db
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user

router = APIRouter()

class VaultSearchRequest(BaseModel):
    query: str
    limit: int = 5

class VaultSearchResult(BaseModel):
    id: int
    filename: str
    content: str
    similarity: float
    fts_rank: float

@router.post("/search", response_model=List[VaultSearchResult])
async def search_vault(
    req: VaultSearchRequest,
    user_id: str = Depends(get_current_user)
):
    """
    SOTA Hybrid Interrogator:
    Executes a parallel Vector + Keyword search across the user's entire vault.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Vault Engine Offline")

    try:
        # 1. Generate 1024-D Embedding using NVIDIA Protocol
        # input_type="query" is critical for E5-v5 accuracy
        query_vector = get_embedding(req.query, input_type="query")

        # 2. Call the Supabase RPC function we created in SQL
        rpc_params = {
            "query_text": req.query,
            "query_embedding": query_vector,
            "match_count": req.limit,
            "target_user_id": user_id
        }
        
        res = db.rpc("hybrid_vault_search", rpc_params).execute()
        
        # 3. Format and Return Results
        return cast(List[Dict[str, Any]], res.data)

    except Exception as e:
        print(f"❌ VAULT SEARCH ERROR: {e}")
        raise HTTPException(status_code=500, detail="Retrieval Protocol Failure")
