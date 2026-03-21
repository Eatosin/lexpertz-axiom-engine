import os
import requests
import hashlib
from datetime import datetime
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from jose.utils import base64url_decode
from typing import Optional, Dict, Any, List, cast
from app.core.database import db

# --- Security Configuration ---
security = HTTPBearer()

# SOTA: Clerk Public Key Cache (Prevents excessive network calls)
class ClerkKeyManager:
    _instance = None
    _jwks: Optional[Dict[str, Any]] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ClerkKeyManager, cls).__new__(cls)
        return cls._instance

    def get_jwks(self) -> Dict[str, Any]:
        """Fetches and caches Clerk's public keys."""
        if self._jwks is None:
            jwks_url = os.getenv("CLERK_JWKS_URL")
            if not jwks_url:
                print("⚠️ SECURITY ALERT: CLERK_JWKS_URL missing.")
                return {}
            
            try:
                response = requests.get(jwks_url)
                self._jwks = response.json()
            except Exception as e:
                print(f"❌ AUTH ERROR: Failed to fetch JWKS: {e}")
                return {}
        return self._jwks

key_manager = ClerkKeyManager()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    V4.0 Enterprise Dual-Auth Guard: 
    Handles both MCP API Keys (SaaS) and Clerk JWTs (Web UI).
    """
    token = auth.credentials

    # ==========================================
    # PATH A: AXIOM API KEY (MCP / IDE / CLI)
    # ==========================================
    if token.startswith("axm_live_") or token.startswith("axm_test_"):
        if not db:
            raise HTTPException(status_code=500, detail="Auth Database Offline")
            
        # 1. Hash the incoming token to match the database security
        token_hash = hashlib.sha256(token.encode()).hexdigest()
            
        # 2. High-speed lookup in Supabase using the HASH
        res = db.table("api_keys").select("user_id, is_active").eq("key_value", token_hash).execute()
        key_data = cast(List[Dict[str, Any]], res.data)
        
        # 3. Reject if invalid or revoked
        if not key_data or not key_data[0].get("is_active"):
            raise HTTPException(status_code=401, detail="Invalid or Revoked Axiom API Key.")
            
        # 4. Asynchronously record 'last_used_at' for the dashboard UI
        try:
            db.table("api_keys").update({"last_used_at": datetime.utcnow().isoformat()}).eq("key_value", token_hash).execute()
        except Exception as e:
            print(f"⚠️ Non-fatal: Failed to update key timestamp: {e}")
        
        return str(key_data[0]["user_id"])

    # ==========================================
    # PATH B: CLERK JWT (Web Browser Dashboard)
    # ==========================================
    jwks = key_manager.get_jwks()
    
    if not jwks:
        # Fallback to unverified for local dev IF explicitly allowed
        if os.getenv("ENV") == "development":
            payload = jwt.get_unverified_claims(token)
            return str(payload.get("sub"))
        raise HTTPException(status_code=500, detail="Auth Engine Misconfigured")

    try:
        # 1. Decode header to find the Key ID (kid)
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        
        # 2. Find the correct public key in the JWKS
        public_key = None
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                public_key = jwk.construct(key)
                break
        
        if not public_key:
            raise HTTPException(status_code=401, detail="Invalid Security Key ID")

        # 3. VERIFY SIGNATURE, ISSUER, AND EXPIRATION
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
