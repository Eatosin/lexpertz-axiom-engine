import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from typing import Dict, Any, List
from app.core.adapters import get_vault
from app.core.auth import get_current_user

router = APIRouter()

# --- 1. STRICT SCHEMAS ---
class CreateKeyRequest(BaseModel):
    # Firewall: prevent DB overflow by capping the name length
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
    """Generates a new API key. The raw key is returned ONLY ONCE (hash-only storage)."""
    full_key, key_hash, key_hint = generate_secure_key()
    vault = get_vault()
    await vault.create_api_key(req.name, key_hash, key_hint)
    return {
        "status": "success",
        "name": req.name,
        "key_value": full_key,
        "message": "Please copy this key now. You will not be able to see it again.",
    }


@router.get("/")
async def list_api_keys(user_id: str = Depends(get_current_user)):
    """Lists all API keys using their secure hints."""
    vault = get_vault()
    keys = await vault.list_api_keys()
    return {"keys": keys}


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str = Path(..., description="ID of the key to revoke"),
    user_id: str = Depends(get_current_user),
):
    """Instantly revokes an API key (sets is_active to False)."""
    vault = get_vault()
    if not await vault.revoke_api_key(key_id):
        raise HTTPException(status_code=404, detail="API key not found")
    return {"status": "revoked", "id": key_id}
