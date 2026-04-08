import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, cast
from app.core.database import db
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user

router = APIRouter()

# --- 1. HARDENED SCHEMAS (Security) ---
class VaultSearchRequest(BaseModel):
    # Bound the query to ~400 words to prevent NVIDIA NIM Token Limit Crashes (HTTP 413)
    query: str = Field(..., min_length=2, max_length=2000, description="The audit query")
    # Cap the limit to prevent DB Compute DoS attacks
    limit: int = Field(default=5, ge=1, le=50, description="Max results to return")

class VaultSearchResult(BaseModel):
    id: int
    filename: str
    content: str
    similarity: float
    fts_rank: float

# --- 2. ASYNC OPTIMIZED ENDPOINT (Speed) ---
@router.post("/search", response_model=List[VaultSearchResult])
async def search_vault(
    req: VaultSearchRequest,
    user_id: str = Depends(get_current_user)
):
    """
    SOTA Hybrid Interrogator:
    Executes a parallel Vector + Keyword search across the user's entire vault.
    Now utilizes asyncio thread-pooling for non-blocking execution.
    """
    if not db:
        raise HTTPException(status_code=503, detail="Vault Engine Offline")

    try:
        # 1. Non-Blocking Embedding Generation
        # Offload the synchronous NVIDIA network call to a background thread
        query_vector = await asyncio.to_thread(
            get_embedding, 
            text=req.query, 
            input_type="query"
        )

        # 2. Prepare RPC Parameters
        rpc_params = {
            "query_text": req.query,
            "query_embedding": query_vector,
            "match_count": req.limit,
            "target_user_id": user_id
        }
        
        # 3. Non-Blocking Database Execution
        # Offload the synchronous Supabase HTTP request to prevent event loop freezing
        res = await asyncio.to_thread(
            lambda: db.rpc("hybrid_vault_search", rpc_params).execute()
        )
        
        # 4. Strict Type Casting & Return
        return cast(List[Dict[str, Any]], res.data)

    except Exception as e:
        print(f"❌ VAULT SEARCH ERROR: {str(e)}")
        # Generic 500 prevents leaking exact database schemas/errors to the client
        raise HTTPException(status_code=500, detail="Retrieval Protocol Failure")
