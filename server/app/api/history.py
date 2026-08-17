from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.core.adapters import get_vault
from app.core.auth import get_current_user

router = APIRouter()

# --- 1. RESPONSE MODELS (Strict Serialization) ---
class DocumentItem(BaseModel):
    filename: str
    status: str
    created_at: str

class ChatMessageItem(BaseModel):
    id: int
    role: str
    content: str
    metrics: Optional[Dict[str, float]] = None
    created_at: str

# --- 2. ENDPOINTS ---

@router.get("/documents", response_model=List[DocumentItem])
async def get_user_documents(
    # Bounded limit: max 500 documents at a time to prevent RAM exhaustion
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    user_id: str = Depends(get_current_user),
):
    """Retrieves the latest documents from the local vault."""
    try:
        vault = get_vault()
        docs = await vault.list_documents(limit=limit)
        return [
            {
                "filename": d["filename"],
                "status": d["status"],
                "created_at": d.get("created_at", ""),
            }
            for d in docs
        ]
    except Exception as e:
        print(f"DOCUMENT FETCH ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vault ledger")


@router.get("/chat/{filename}", response_model=List[ChatMessageItem])
async def get_document_chat_history(
    # Path validation: protects against malformed URLs
    filename: str = Path(..., min_length=1, max_length=255),
    # Chat limit: fetch only the most recent 50 messages to keep UI snappy
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user),
):
    """Fetches the latest conversation efficiently, offloaded to a background thread."""
    try:
        vault = get_vault()
        doc = await vault.get_document_by_filename(filename)
        if not doc:
            return []  # Cleanly return empty history if document doesn't exist

        history = await vault.get_history(doc["id"], limit=limit)
        return [{"id": i + 1, "role": m["role"], "content": m["content"], "metrics": None, "created_at": ""} for i, m in enumerate(history)]

    except Exception as e:
        print(f"HISTORY FETCH ERROR: {str(e)}")
        # Don't return an empty array on DB crash; tell the UI something went wrong
        raise HTTPException(status_code=500, detail="Failed to retrieve audit history")
