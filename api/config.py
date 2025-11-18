"""
Application Configuration

Centralized configuration management using environment variables.
"""

import os
from typing import List, Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    api_title: str = "OpenAI Responses API Chat"
    api_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # CORS Configuration
    cors_origins: List[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000,http://localhost:8000"
    ).split(",")
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["GET", "POST", "DELETE", "OPTIONS"]
    cors_allow_headers: List[str] = ["*"]
    
    # Server Configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    
    # OpenAI Configuration
    default_model: str = os.getenv("DEFAULT_MODEL", "gpt-4o-mini")
    default_reasoning_effort: str = os.getenv("DEFAULT_REASONING_EFFORT", "medium")
    
    # File Upload Configuration
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    max_files_per_session: int = int(os.getenv("MAX_FILES_PER_SESSION", "10"))
    allowed_file_types: List[str] = [
        ".txt", ".pdf", ".docx", ".md", ".csv", ".json",
        ".py", ".js", ".java", ".cpp", ".html", ".xml",
        ".jpg", ".jpeg", ".png", ".gif", ".webp"
    ]
    
    # Session Configuration
    session_timeout_seconds: int = int(os.getenv("SESSION_TIMEOUT_SECONDS", "3600"))
    
    # Rate Limiting
    rate_limit_enabled: bool = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_format: str = os.getenv(
        "LOG_FORMAT", 
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Deep Research Configuration
    deep_research_enabled: bool = os.getenv("DEEP_RESEARCH_ENABLED", "true").lower() == "true"
    deep_research_timeout: int = int(os.getenv("DEEP_RESEARCH_TIMEOUT", "3600"))
    
    # Security
    api_key_required: bool = os.getenv("API_KEY_REQUIRED", "true").lower() == "true"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()

