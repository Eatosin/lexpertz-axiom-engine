from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, cast
from app.core.database import db
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/documents")
async def get_user_documents(user_id: str = Depends(get_current_user)):
    """
    Retrieves all documents owned by the user for the Sidebar.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Vault DB Offline")

    res = db.table("documents") \
            .select("filename, status, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
    
    data = cast(List[Dict[str, Any]], res.data)
    return data

@router.get("/chat/{filename}")
async def get_document_chat_history(
    filename: str, 
    user_id: str = Depends(get_current_user)
):
    """
    V2.9: Retrieves full conversation history for a specific document.
    Includes RAGAS metrics for previous answers.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Vault DB Offline")

    try:
        # 1. Get the Document ID
        doc_res = db.table("documents").select("id").eq("filename", filename).eq("user_id", user_id).execute()
        doc_data = cast(List[Dict[str, Any]], doc_res.data)
        
        if not doc_data:
            return [] # No history if doc doesn't exist

        doc_id = doc_data[0]['id']

        # 2. Fetch Messages
        msg_res = db.table("chat_messages") \
                    .select("*") \
                    .eq("document_id", doc_id) \
                    .order("created_at", desc=False) \
                    .execute()
        
        return cast(List[Dict[str, Any]], msg_res.data)

    except Exception as e:
        print(f"❌ History Fetch Error: {e}")
        return []
