"""
Utility modules for the API.
"""

from api.utils.logger import logger, setup_logger
from api.utils.errors import (
    APIError,
    ValidationError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    OpenAIError
)
from api.utils.validation import (
    validate_api_key,
    validate_model_name,
    validate_file_type,
    validate_file_size,
    validate_message_content,
    validate_reasoning_effort
)
from api.utils.session import session_manager, SessionManager

__all__ = [
    "logger",
    "setup_logger",
    "APIError",
    "ValidationError",
    "AuthenticationError",
    "NotFoundError",
    "RateLimitError",
    "OpenAIError",
    "validate_api_key",
    "validate_model_name",
    "validate_file_type",
    "validate_file_size",
    "validate_message_content",
    "validate_reasoning_effort",
    "session_manager",
    "SessionManager",
]

