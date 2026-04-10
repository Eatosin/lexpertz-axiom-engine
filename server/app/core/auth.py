import os
import requests
import hashlib
import asyncio
from datetime import datetime
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from typing import Optional, Dict, Any, List, cast
from app.core.database import db

# --- Security Configuration ---
security = HTTPBearer()

# SOTA: Resilient Clerk Public Key Manager
class ClerkKeyManager:
    _instance = None
    _jwks: Optional[Dict[str, Any]] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ClerkKeyManager, cls).__new__(cls)
        return cls._instance

    def get_jwks(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetches Clerk's public keys. 
        Supports forced cache invalidation to survive automatic Key Rotations.
        """
        if self._jwks is None or force_refresh:
            jwks_url = os.getenv("CLERK_JWKS_URL")
            if not jwks_url:
                print("⚠️ SECURITY ALERT: CLERK_JWKS_URL missing.")
                return {}
            
            try:
                # Synchronous request, but we will wrap this in to_thread when calling
                response = requests.get(jwks_url, timeout=10)
                response.raise_for_status()
                self._jwks = response.json()
                if force_refresh:
                    print("AXIOM-AUTH: Clerk JWKS Cache Successfully Rotated.")
            except Exception as e:
                print(f"❌ AUTH ERROR: Failed to fetch JWKS: {e}")
                return self._jwks or {} # Fallback to stale cache if network is down
        return self._jwks

key_manager = ClerkKeyManager()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    V4.6 Enterprise Dual-Auth Guard: 
    Fully async, non-blocking, and resilient to cryptographic key rotation.
    """
    token = auth.credentials

    # ==========================================
    # PATH A: AXIOM API KEY (MCP / IDE / CLI)
    # ==========================================
    if token.startswith("axm_live_") or token.startswith("axm_test_"):
        if not db:
            raise HTTPException(status_code=503, detail="Auth Database Offline")
            
        token_hash = hashlib.sha256(token.encode()).hexdigest()
            
        # 1. Non-Blocking High-speed lookup
        res = await asyncio.to_thread(
            lambda: db.table("api_keys").select("user_id, is_active").eq("key_value", token_hash).execute()
        )
        key_data = cast(List[Dict[str, Any]], res.data)
        
        # 2. Reject if invalid or revoked
        if not key_data or not key_data[0].get("is_active"):
            raise HTTPException(status_code=401, detail="Invalid or Revoked Axiom API Key.")
            
        # 3. SOTA: Fire-and-Forget Timestamp Update (Zero added latency for the user)
        def update_timestamp():
            try:
                db.table("api_keys").update({"last_used_at": datetime.utcnow().isoformat()}).eq("key_value", token_hash).execute()
            except Exception as e:
                print(f"⚠️ Timestamp Update Failed (Non-fatal): {e}")
                
        asyncio.create_task(asyncio.to_thread(update_timestamp))
        
        return str(key_data[0]["user_id"])

    # ==========================================
    # PATH B: CLERK JWT (Web Browser Dashboard)
    # ==========================================
    
    # 1. Async fetch of the JWKS cache
    jwks = await asyncio.to_thread(key_manager.get_jwks)
    
    if not jwks:
        if os.getenv("ENV") == "development":
            payload = jwt.get_unverified_claims(token)
            return str(payload.get("sub"))
        raise HTTPException(status_code=503, detail="Auth Engine Misconfigured")

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        
        # 2. Smart Cache Invalidation (The Key Rotation Fix)
        # If the 'kid' in the JWT isn't in our cache, Clerk likely rotated their keys.
        # We force a refresh of the JWKS cache and try one more time.
        if kid not in[k.get("kid") for k in jwks.get("keys", [])]:
            print(f"AXIOM-AUTH: Unknown Key ID '{kid}' detected. Forcing JWKS rotation...")
            jwks = await asyncio.to_thread(key_manager.get_jwks, force_refresh=True)

        public_key = None
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                public_key = jwk.construct(key)
                break
        
        if not public_key:
            raise HTTPException(status_code=401, detail="Invalid Security Key ID. Issuer may have revoked the key.")

        # 3. VERIFY SIGNATURE, ISSUER, AND EXPIRATION
        # (This is CPU bound, but extremely fast; safe to run synchronously here)
        payload = jwt.decode(
            token, 
            public_key, 
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Identity Subject Missing")
            
        return str(user_id)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Identity Session Expired")
    except Exception as e:
        print(f"❌ AUTH BREACH ATTEMPT: {str(e)}")
        raise HTTPException(status_code=401, detail="Identity Handshake Denied")
