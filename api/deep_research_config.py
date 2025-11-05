"""
Deep Research Configuration

This file contains configuration settings for deep research functionality,
including model settings, rate limits, and webhook configurations.
"""

import os
from typing import List, Dict, Any

# Deep Research Models Configuration
DEEP_RESEARCH_MODELS = {
    "o3-deep-research": {
        "name": "O3 Deep Research",
        "description": "Most comprehensive deep research model for complex analysis",
        "max_tool_calls": 100,
        "timeout": 3600,  # 1 hour
        "capabilities": ["web_search", "file_search", "code_interpreter"]
    },
    "o4-mini-deep-research": {
        "name": "O4 Mini Deep Research",
        "description": "Faster deep research model for quick analysis",
        "max_tool_calls": 50,
        "timeout": 1800,  # 30 minutes
        "capabilities": ["web_search", "file_search", "code_interpreter"]
    }
}

# Default Deep Research Settings
DEFAULT_DEEP_RESEARCH_SETTINGS = {
    "background": True,
    "use_web_search": True,
    "use_file_search": False,
    "use_code_interpreter": False,
    "enrich_prompt": True,
    "clarify_first": False,
    "max_tool_calls": 50,
    "timeout": 3600
}

# Webhook Configuration
WEBHOOK_CONFIG = {
    "enabled": os.getenv("ENABLE_WEBHOOKS", "false").lower() == "true",
    "webhook_base_url": os.getenv("WEBHOOK_BASE_URL", ""),
    "webhook_secret": os.getenv("WEBHOOK_SECRET", ""),
    "retry_attempts": 3,
    "retry_delay": 5  # seconds
}

# Prompt Templates for Clarification and Enrichment
PROMPT_TEMPLATES = {
    "clarification_system": """
You are talking to a user who is asking for a research task to be conducted. 
Your job is to gather more information from the user to successfully complete the task.

Focus on:
1. Scope and boundaries of the research
2. Specific aspects or dimensions to explore
3. Desired level of detail and depth
4. Preferred sources or data types
5. Expected output format and structure

Be concise and ask no more than 5 clarifying questions.
""",
    
    "enrichment_system": """
You will be given a research task by a user. Your job is to produce detailed 
instructions for a deep research model that will complete the task.

Requirements:
1. Include all user requirements and preferences
2. Specify data sources to prioritize
3. Define expected output structure (reports, tables, summaries)
4. Request inline citations and source metadata
5. Emphasize analytical, data-backed reasoning
6. Specify any constraints or boundaries

Format the instructions clearly and comprehensively.
"""
}

# Rate Limiting Configuration
RATE_LIMITS = {
    "deep_research_per_hour": 10,
    "clarifications_per_hour": 30,
    "enrichments_per_hour": 30,
    "concurrent_research_tasks": 3
}

# Logging Configuration
LOGGING_CONFIG = {
    "log_level": os.getenv("LOG_LEVEL", "INFO"),
    "log_file": os.getenv("LOG_FILE", "deep_research.log"),
    "log_tool_calls": True
}

# Vector Store Configuration for Deep Research
VECTOR_STORE_CONFIG = {
    "max_stores_per_user": 5,
    "max_files_per_store": 100,
    "supported_file_types": [
        ".txt", ".pdf", ".docx", ".md", ".csv", ".json",
        ".py", ".js", ".java", ".cpp", ".html", ".xml"
    ],
    "max_file_size_mb": 50,
    "chunk_size": 1000,
    "chunk_overlap": 200
}

# Cost Management
COST_LIMITS = {
    "max_cost_per_research": 10.0,  # USD
    "warning_threshold": 5.0,  # USD
    "track_costs": True
}

def get_model_config(model_name: str) -> Dict[str, Any]:
    """Get configuration for a specific deep research model"""
    return DEEP_RESEARCH_MODELS.get(model_name, DEEP_RESEARCH_MODELS["o4-mini-deep-research"])

def get_webhook_url(event_type: str) -> str:
    """Get webhook URL for a specific event type"""
    if not WEBHOOK_CONFIG["enabled"] or not WEBHOOK_CONFIG["webhook_base_url"]:
        return None
    
    return f"{WEBHOOK_CONFIG['webhook_base_url']}/deep-research/{event_type}"

def validate_research_request(request: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate a deep research request against configuration limits
    
    Returns:
        (is_valid, error_message)
    """
    # Check model
    if request.get("model") not in DEEP_RESEARCH_MODELS:
        return False, f"Invalid model: {request.get('model')}"
    
    # Check max tool calls
    max_calls = request.get("max_tool_calls", 0)
    model_config = get_model_config(request.get("model"))
    if max_calls > model_config["max_tool_calls"]:
        return False, f"Max tool calls exceeds limit: {model_config['max_tool_calls']}"
    
    return True, ""
