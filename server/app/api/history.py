import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, cast, Optional
from app.core.database import db
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
    # Bounded Limit: Max 100 documents at a time to prevent RAM exhaustion
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    user_id: str = Depends(get_current_user)
):
    """
    SOTA Document Fetcher:
    Retrieves the latest documents asynchronously.
    """
    if not db:
        raise HTTPException(status_code=503, detail="Vault DB Offline")

    try:
        # Non-blocking Database Call
        res = await asyncio.to_thread(
            lambda: db.table("documents")
            .select("filename, status, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        
        return cast(List[Dict[str, Any]], res.data)
    except Exception as e:
        print(f"❌ DOCUMENT FETCH ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vault ledger")


@router.get("/chat/{filename}", response_model=List[ChatMessageItem])
async def get_document_chat_history(
    # Path Validation: Protects against directory traversal and malformed URLs
    filename: str = Path(..., min_length=1, max_length=255), 
    # Chat Limit: Fetch only the most recent 50 messages to keep UI snappy
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user)
):
    """
    V4.6 SOTA History Hydrator:
    Fetches the latest conversation efficiently, offloaded to a background thread.
    """
    if not db:
        raise HTTPException(status_code=503, detail="Vault DB Offline")

    try:
        # 1. Non-blocking Document ID Fetch
        doc_res = await asyncio.to_thread(
            lambda: db.table("documents").select("id").eq("filename", filename).eq("user_id", user_id).execute()
        )
        doc_data = cast(List[Dict[str, Any]], doc_res.data)
        
        if not doc_data:
            return [] # Cleanly return empty history if document doesn't exist

        doc_id = doc_data[0]['id']

        # 2. Non-blocking Messages Fetch (Smart Chronology)
        # We fetch the LATEST 'limit' messages first (desc=True)
        msg_res = await asyncio.to_thread(
            lambda: db.table("chat_messages")
            .select("id, role, content, metrics, created_at")
            .eq("document_id", doc_id)
            .order("created_at", desc=True) # Get newest first
            .limit(limit)
            .execute()
        )
        
        messages = cast(List[Dict[str, Any]], msg_res.data)
        
        # 3. Reverse the array in Python so the UI displays Oldest -> Newest
        return messages[::-1]

    except Exception as e:
        print(f"❌ HISTORY FETCH ERROR: {str(e)}")
        # Don't return an empty array on DB crash; tell the UI something went wrong
        raise HTTPException(status_code=500, detail="Failed to retrieve audit history")
