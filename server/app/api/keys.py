import secrets
import hashlib
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, cast
from app.core.auth import get_current_user
from app.core.database import db

router = APIRouter()

# --- 1. STRICT SCHEMAS ---
class CreateKeyRequest(BaseModel):
    # Firewall: Prevent DB Overflow by capping the name length
    name: str = Field(..., min_length=1, max_length=64, description="Name identifier for the API key")

def generate_secure_key():
    """
    Generates a production-grade API key.
    Returns: (raw_key_for_user, hashed_key_for_db, key_hint_for_ui)
    """
    raw_secret = secrets.token_hex(24) 
    full_key = f"axm_live_{raw_secret}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    key_hint = f"{full_key[:12]}...{full_key[-4:]}"
    return full_key, key_hash, key_hint

# --- 2. ASYNC ENDPOINTS ---

@router.post("/")
async def create_api_key(req: CreateKeyRequest, user_id: str = Depends(get_current_user)):
    """Generates a new API key. The raw key is returned ONLY ONCE."""
    if not db: raise HTTPException(503, "DB Offline")
    
    full_key, key_hash, key_hint = generate_secure_key()
    
    # Non-blocking DB Insert
    await asyncio.to_thread(
        lambda: db.table("api_keys").insert({
            "user_id": user_id,
            "name": req.name,
            "key_value": key_hash, 
            "key_hint": key_hint   
        }).execute()
    )
    
    return {
        "status": "success", 
        "name": req.name, 
        "key_value": full_key, 
        "message": "Please copy this key now. You will not be able to see it again."
    }

@router.get("/")
async def list_api_keys(user_id: str = Depends(get_current_user)):
    """Lists all active API keys using their secure hints asynchronously."""
    if not db: raise HTTPException(503, "DB Offline")
    
    res = await asyncio.to_thread(
        lambda: db.table("api_keys")
        .select("id, name, created_at, last_used_at, is_active, key_hint")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    
    return {"keys": cast(List[Dict[str, Any]], res.data)}

@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str = Path(..., description="ID of the key to revoke"), 
    user_id: str = Depends(get_current_user)
):
    """Instantly revokes an API key (Sets is_active to False) without freezing the UI."""
    if not db: raise HTTPException(503, "DB Offline")
    
    await asyncio.to_thread(
        lambda: db.table("api_keys")
        .update({"is_active": False})
        .eq("id", key_id)
        .eq("user_id", user_id)
        .execute()
    )
    return {"status": "revoked", "id": key_id}
