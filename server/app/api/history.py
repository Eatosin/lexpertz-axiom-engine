from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, cast
from app.core.database import db
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/documents")
async def get_user_documents(user_id: str = Depends(get_current_user)):
    """
    SOTA History Engine: Retrieves all documents owned by the user.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Vault DB Offline")

    # Fetch filename and status, ordered by newest first
    res = db.table("documents") \
            .select("filename, status, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
    
    data = cast(List[Dict[str, Any]], res.data)
    return data
