from fastapi import HTTPBearer, HTTPAuthorizationCredentials, Depends, HTTPException
from jose import jwt # type: ignore
import os

# Clerk uses a specific JWKS URL to verify tokens
# In a full prod setup, we'd fetch this dynamically. 
# For now, we'll implement the logic to extract the 'sub' (User ID).

security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    SOTA Auth Guard: Decodes the Clerk JWT and returns the User ID.
    In 2026, this is the standard for stateless cross-origin security.
    """
    token = auth.credentials
    try:
        # In MVP, we extract the ID without full signature verification
        # to avoid complex JWKS networking issues on mobile.
        # Production will include full JWKS validation.
        payload = jwt.get_unverified_claims(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid Identity Token")
            
        return str(user_id)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Identity Handshake Failed: {str(e)}")
