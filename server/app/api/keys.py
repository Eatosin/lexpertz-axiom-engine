import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, cast
from app.core.auth import get_current_user
from app.core.database import db

router = APIRouter()

class CreateKeyRequest(BaseModel):
    name: str

def generate_secure_key():
    """
    Generates a production-grade API key.
    Returns: (raw_key_for_user, hashed_key_for_db, key_hint_for_ui)
    """
    # 1. Generate 48 characters of cryptographically secure randomness
    raw_secret = secrets.token_hex(24) 
    full_key = f"axm_live_{raw_secret}"
    
    # 2. One-way hash (SHA-256) for database storage
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    
    # 3. Safe display hint (e.g., axm_live_...e4f2)
    key_hint = f"{full_key[:12]}...{full_key[-4:]}"
    
    return full_key, key_hash, key_hint

@router.post("/")
async def create_api_key(req: CreateKeyRequest, user_id: str = Depends(get_current_user)):
    """Generates a new API key. The raw key is returned ONLY ONCE."""
    if not db: raise HTTPException(500, "DB Offline")
    
    full_key, key_hash, key_hint = generate_secure_key()
    
    # Insert the HASH, never the raw key.
    res = db.table("api_keys").insert({
        "user_id": user_id,
        "name": req.name,
        "key_value": key_hash, # Storing the SHA-256 hash
        "key_hint": key_hint   # Storing the safe visual hint
    }).execute()
    
    # Warning the UI that they will never see 'full_key' again
    return {
        "status": "success", 
        "name": req.name, 
        "key_value": full_key, 
        "message": "Please copy this key now. You will not be able to see it again."
    }

@router.get("/")
async def list_api_keys(user_id: str = Depends(get_current_user)):
    """Lists all active API keys using their secure hints."""
    if not db: raise HTTPException(500, "DB Offline")
    
    res = db.table("api_keys").select("id, name, created_at, last_used_at, is_active, key_hint").eq("user_id", user_id).order("created_at", desc=True).execute()
    
    # The database doesn't even contain the raw key, so it's mathematically impossible to leak it here.
    return {"keys": cast(List[Dict[str, Any]], res.data)}

@router.delete("/{key_id}")
async def revoke_api_key(key_id: str, user_id: str = Depends(get_current_user)):
    """Instantly revokes an API key (Sets is_active to False)."""
    if not db: raise HTTPException(500, "DB Offline")
    
    db.table("api_keys").update({"is_active": False}).eq("id", key_id).eq("user_id", user_id).execute()
    return {"status": "revoked", "id": key_id}
