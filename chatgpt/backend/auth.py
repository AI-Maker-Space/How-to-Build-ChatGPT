"""
Authentication and authorization utilities
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from database import get_db
from models import User

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_google_token(token: str) -> Dict[str, Any]:
    """Verify Google OAuth token"""
    try:
        # If no Google Client ID is set, bypass verification in development
        if not GOOGLE_CLIENT_ID:
            logger.warning("Google Client ID not set, skipping verification (dev mode)")
            # Return mock data for development
            import hashlib
            email = f"user_{hashlib.md5(token.encode()).hexdigest()[:8]}@example.com"
            return {
                "email": email,
                "name": "Test User",
                "picture": f"https://ui-avatars.com/api/?name=Test+User&background=random"
            }
        
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Token is valid
        return {
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture"),
            "sub": idinfo.get("sub")
        }
    except Exception as e:
        logger.error(f"Error verifying Google token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Google credentials"
        )

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    import uuid
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user
