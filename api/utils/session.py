"""
Session Management

Handles user sessions and state management.
"""

import hashlib
import secrets
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from api.config import settings
from api.utils.logger import logger


class SessionManager:
    """Manages user sessions and state."""
    
    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._cleanup_interval = 300  # 5 minutes
    
    def create_session(self, api_key: str) -> str:
        """
        Create a new session for a user.
        
        Args:
            api_key: User's API key
            
        Returns:
            Session ID
        """
        # Generate a secure session ID
        session_id = self._generate_session_id(api_key)
        
        # Create session data
        self._sessions[session_id] = {
            "created_at": datetime.now(),
            "last_accessed": datetime.now(),
            "api_key_hash": self._hash_api_key(api_key),
            "files": {},
            "vector_store_id": None,
            "research_tasks": {}
        }
        
        logger.info(f"Created new session: {session_id[:8]}...")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data.
        
        Args:
            session_id: Session ID
            
        Returns:
            Session data or None if not found
        """
        if session_id not in self._sessions:
            return None
        
        session = self._sessions[session_id]
        
        # Check if session expired
        if self._is_session_expired(session):
            logger.info(f"Session expired: {session_id[:8]}...")
            del self._sessions[session_id]
            return None
        
        # Update last accessed time
        session["last_accessed"] = datetime.now()
        
        return session
    
    def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update session data.
        
        Args:
            session_id: Session ID
            updates: Dictionary of updates
            
        Returns:
            True if updated successfully, False otherwise
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.update(updates)
        return True
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            True if deleted, False if not found
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Deleted session: {session_id[:8]}...")
            return True
        return False
    
    def cleanup_expired_sessions(self) -> int:
        """
        Remove expired sessions.
        
        Returns:
            Number of sessions removed
        """
        expired_ids = [
            sid for sid, session in self._sessions.items()
            if self._is_session_expired(session)
        ]
        
        for sid in expired_ids:
            del self._sessions[sid]
        
        if expired_ids:
            logger.info(f"Cleaned up {len(expired_ids)} expired sessions")
        
        return len(expired_ids)
    
    def _generate_session_id(self, api_key: str) -> str:
        """Generate a unique session ID."""
        # Use a combination of API key hash and random token
        api_key_hash = self._hash_api_key(api_key)
        random_token = secrets.token_urlsafe(16)
        combined = f"{api_key_hash}{random_token}"
        
        return hashlib.sha256(combined.encode()).hexdigest()[:32]
    
    def _hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage."""
        return hashlib.sha256(api_key.encode()).hexdigest()[:16]
    
    def _is_session_expired(self, session: Dict[str, Any]) -> bool:
        """Check if session has expired."""
        last_accessed = session.get("last_accessed", session.get("created_at"))
        if not isinstance(last_accessed, datetime):
            return True
        
        timeout = timedelta(seconds=settings.session_timeout_seconds)
        return datetime.now() - last_accessed > timeout


# Global session manager instance
session_manager = SessionManager()

