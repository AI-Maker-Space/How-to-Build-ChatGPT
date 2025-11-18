"""
Input Validation Utilities

Centralized validation functions for API inputs.
"""

import re
from typing import List, Optional
from api.utils.errors import ValidationError
from api.config import settings


def validate_api_key(api_key: Optional[str]) -> str:
    """
    Validate OpenAI API key format.
    
    Args:
        api_key: API key to validate
        
    Returns:
        Validated API key
        
    Raises:
        ValidationError: If API key is invalid
    """
    if not api_key:
        raise ValidationError("API key is required")
    
    api_key = api_key.strip()
    
    # Basic format validation
    if not api_key.startswith("sk-"):
        raise ValidationError("Invalid API key format. Must start with 'sk-'")
    
    if len(api_key) < 20:
        raise ValidationError("API key appears to be invalid (too short)")
    
    return api_key


def validate_model_name(model: str) -> str:
    """
    Validate model name.
    
    Args:
        model: Model name to validate
        
    Returns:
        Validated model name
        
    Raises:
        ValidationError: If model name is invalid
    """
    if not model:
        raise ValidationError("Model name is required")
    
    model = model.strip()
    
    # Allowed models
    allowed_models = [
        "gpt-5", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
        "gpt-3.5-turbo", "o3-deep-research", "o4-mini-deep-research"
    ]
    
    if model not in allowed_models:
        raise ValidationError(
            f"Invalid model: {model}. Allowed models: {', '.join(allowed_models)}"
        )
    
    return model


def validate_file_type(filename: str) -> str:
    """
    Validate file type based on extension.
    
    Args:
        filename: File name to validate
        
    Returns:
        Validated filename
        
    Raises:
        ValidationError: If file type is not allowed
    """
    if not filename:
        raise ValidationError("Filename is required")
    
    # Extract extension
    if "." not in filename:
        raise ValidationError("File must have an extension")
    
    extension = filename.lower().split(".")[-1]
    extension = f".{extension}"
    
    if extension not in settings.allowed_file_types:
        raise ValidationError(
            f"File type '{extension}' not allowed. "
            f"Allowed types: {', '.join(settings.allowed_file_types)}"
        )
    
    return filename


def validate_file_size(file_size: int) -> int:
    """
    Validate file size.
    
    Args:
        file_size: File size in bytes
        
    Returns:
        Validated file size
        
    Raises:
        ValidationError: If file size exceeds limit
    """
    max_size_bytes = settings.max_file_size_mb * 1024 * 1024
    
    if file_size > max_size_bytes:
        raise ValidationError(
            f"File size ({file_size / 1024 / 1024:.2f} MB) exceeds "
            f"maximum allowed size ({settings.max_file_size_mb} MB)"
        )
    
    if file_size <= 0:
        raise ValidationError("File size must be greater than 0")
    
    return file_size


def validate_message_content(content: str, max_length: int = 100000) -> str:
    """
    Validate message content.
    
    Args:
        content: Message content to validate
        max_length: Maximum allowed length
        
    Returns:
        Validated content
        
    Raises:
        ValidationError: If content is invalid
    """
    if not content:
        raise ValidationError("Message content cannot be empty")
    
    content = content.strip()
    
    if len(content) > max_length:
        raise ValidationError(
            f"Message too long. Maximum length: {max_length} characters"
        )
    
    # Check for potentially malicious content
    if re.search(r'<script[^>]*>', content, re.IGNORECASE):
        raise ValidationError("Message contains potentially unsafe content")
    
    return content


def validate_reasoning_effort(effort: str) -> str:
    """
    Validate reasoning effort level.
    
    Args:
        effort: Reasoning effort level
        
    Returns:
        Validated effort level
        
    Raises:
        ValidationError: If effort level is invalid
    """
    if not effort:
        return "medium"
    
    effort = effort.lower().strip()
    
    allowed_levels = ["low", "medium", "high"]
    
    if effort not in allowed_levels:
        raise ValidationError(
            f"Invalid reasoning effort: {effort}. "
            f"Allowed values: {', '.join(allowed_levels)}"
        )
    
    return effort

