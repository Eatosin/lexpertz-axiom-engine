import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List
from app.core.adapters import get_vault
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user

router = APIRouter()

# --- 1. HARDENED SCHEMAS (Security) ---
class VaultSearchRequest(BaseModel):
    # Bound the query to ~400 words to prevent provider token limit crashes
    query: str = Field(..., min_length=2, max_length=2000, description="The audit query")
    # Cap the limit to prevent DB compute DoS attacks
    limit: int = Field(default=5, ge=1, le=50, description="Max results to return")

class VaultSearchResult(BaseModel):
    id: int
    filename: str
    content: str
    similarity: float
    fts_rank: float

# --- 2. ASYNC HYBRID SEARCH (vector KNN + keyword FTS) ---
@router.post("/search", response_model=List[VaultSearchResult])
async def search_vault(
    req: VaultSearchRequest,
    user_id: str = Depends(get_current_user),
):
    """Hybrid retrieval across the active vault: vec0 KNN merged with FTS."""
    try:
        # Non-blocking embedding generation (offloaded to a background thread)
        query_vector = await asyncio.to_thread(
            get_embedding,
            text=req.query,
            input_type="query",
        )

        vault = get_vault()
        results = await vault.search_vault(
            query_embedding=query_vector,
            query_text=req.query,
            limit=req.limit,
        )
        return results

    except Exception as e:
        print(f"VAULT SEARCH ERROR: {str(e)}")
        # Generic 500 prevents leaking exact database schemas/errors to the client
        raise HTTPException(status_code=500, detail="Retrieval Protocol Failure")
