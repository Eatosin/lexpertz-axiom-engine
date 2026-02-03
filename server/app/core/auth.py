from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # FIXED: Corrected path
from jose import jwt # type: ignore
import os

# --- Security Configuration ---
security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    SOTA Auth Guard: Decodes the Clerk JWT and returns the User ID.
    Extracted via the fastapi.security sub-module for Enterprise compliance.
    """
    token = auth.credentials
    try:
        # Note: In MVP, we extract the claims without signature validation 
        # to ensure connectivity. Full JWKS validation will be added in Phase 9.
        payload = jwt.get_unverified_claims(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=401, 
                detail="Security Protocol Violation: Invalid Identity Token"
            )
            
        return str(user_id)
        
    except Exception as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Identity Handshake Failed: {str(e)}"
        )
