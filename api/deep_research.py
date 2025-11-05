"""
Deep Research Module for OpenAI Deep Research Models

This module provides comprehensive deep research functionality using OpenAI's
o3-deep-research and o4-mini-deep-research models.
"""

from typing import Optional, Dict, List, Any, Union
from datetime import datetime
import json
import uuid
import asyncio
from pydantic import BaseModel, Field, ConfigDict
from openai import OpenAI
import logging
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Deep Research Models
class DeepResearchModel(str, Enum):
    O3_DEEP_RESEARCH = "o3-deep-research"
    O4_MINI_DEEP_RESEARCH = "o4-mini-deep-research"

# Research Depth Levels
class ResearchDepth(str, Enum):
    LIGHT = "light"
    MEDIUM = "medium"
    DEEP = "deep"

# Research Status
class ResearchStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Request Models
class DeepResearchRequest(BaseModel):
    """Request model for deep research tasks"""
    query: str
    model: DeepResearchModel = DeepResearchModel.O3_DEEP_RESEARCH
    background: bool = True
    max_tool_calls: Optional[int] = None
    tools: List[Dict[str, Any]] = []
    vector_store_ids: Optional[List[str]] = None
    use_web_search: bool = True
    use_code_interpreter: bool = False
    webhook_url: Optional[str] = None
    session_id: Optional[str] = None
    
class ClarificationRequest(BaseModel):
    """Request model for clarification questions"""
    user_input: str
    context: Optional[str] = None

class PromptEnrichmentRequest(BaseModel):
    """Request model for prompt enrichment"""
    user_input: str
    research_type: Optional[str] = None
    
# Response Models
class DeepResearchResponse(BaseModel):
    """Response model for deep research results"""
    id: str
    status: ResearchStatus
    query: str
    output_text: Optional[str] = None
    output: Optional[List[Dict[str, Any]]] = None
    sources: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    
    model_config = ConfigDict(
        # Pydantic v2 configuration for proper serialization
        arbitrary_types_allowed=True,
        json_mode='lax',
        ser_json_timedelta='float',
        ser_json_datetime='iso8601'
    )
    
class ClarificationResponse(BaseModel):
    """Response model for clarification questions"""
    questions: List[str]
    original_input: str

class EnrichedPromptResponse(BaseModel):
    """Response model for enriched prompts"""
    original_prompt: str
    enriched_prompt: str
    instructions: str

class DeepResearchManager:
    """Manager class for handling deep research operations
    
    Note: Research tasks are stored in memory and will be lost on server restart.
    For production use, consider implementing persistence using:
    - Redis for distributed caching
    - SQLite/PostgreSQL for persistent storage
    - File-based storage for simple deployments
    """
    
    def __init__(self, api_key: str, timeout: int = 3600):
        """Initialize the Deep Research Manager"""
        self.client = OpenAI(api_key=api_key, timeout=timeout)
        self.active_research = {}
        self.completed_research = {}
        
    async def start_deep_research(self, request: DeepResearchRequest) -> DeepResearchResponse:
        """
        Start a deep research task
        
        Args:
            request: DeepResearchRequest with query and configuration
            
        Returns:
            DeepResearchResponse with initial status
        """
        try:
            # Generate unique ID for this research
            research_id = f"dr_{uuid.uuid4().hex[:16]}"
            
            # Prepare tools configuration
            tools = self._prepare_tools(request)
            
            # Build request parameters
            params = {
                "model": request.model.value,
                "input": request.query,
                "background": request.background,
                "tools": tools
            }
            
            # Add optional parameters
            if request.max_tool_calls:
                params["max_tool_calls"] = request.max_tool_calls
                
            # Add webhook if provided
            if request.webhook_url:
                params["webhook"] = {
                    "url": request.webhook_url,
                    "events": ["response.completed", "response.failed"]
                }
            
            logger.info(f"Starting deep research {research_id} with model {request.model.value}")
            
            # Create the response
            response = self.client.responses.create(**params)
            
            # Store research metadata
            research_response = DeepResearchResponse(
                id=research_id,
                status=ResearchStatus.IN_PROGRESS if request.background else ResearchStatus.PENDING,
                query=request.query,
                created_at=datetime.now(),
                output_text=None,
                output=[]
            )
            
            if request.background:
                # Store for background processing
                # Store only serializable data, not the full request object
                self.active_research[research_id] = {
                    "response_id": response.id,
                    "query": request.query,  # Store the query string directly
                    "start_time": datetime.now()
                }
                logger.info(f"Deep research {research_id} started in background mode")
            else:
                # Process synchronously
                research_response = await self._process_response(response, research_response)
                
            return research_response
            
        except Exception as e:
            logger.error(f"Error starting deep research: {str(e)}")
            return DeepResearchResponse(
                id=f"dr_error_{uuid.uuid4().hex[:8]}",
                status=ResearchStatus.FAILED,
                query=request.query,
                error=str(e),
                created_at=datetime.now()
            )
    
    def _prepare_tools(self, request: DeepResearchRequest) -> List[Dict[str, Any]]:
        """Prepare tools configuration for deep research"""
        tools = []
        
        # Add web search if enabled
        if request.use_web_search:
            tools.append({"type": "web_search_preview"})
        
        # Add file search with vector stores if provided
        if request.vector_store_ids:
            tools.append({
                "type": "file_search",
                "vector_store_ids": request.vector_store_ids
            })
        
        # Add code interpreter if enabled
        if request.use_code_interpreter:
            tools.append({
                "type": "code_interpreter",
                "container": {"type": "auto"}
            })
        
        # Include any additional tools from the request
        tools.extend(request.tools)
        
        return tools
    
    async def _process_response(self, response, research_response: DeepResearchResponse) -> DeepResearchResponse:
        """Process the deep research response"""
        def safe_extract_value(obj, attr, default=None):
            """Safely extract and convert value to JSON-serializable type"""
            try:
                value = getattr(obj, attr, default)
                if value is None:
                    return default
                # Try to convert Pydantic models
                if hasattr(value, 'model_dump'):
                    return value.model_dump(mode='json')
                # Try to convert to dict
                if hasattr(value, '__dict__') and not isinstance(value, (str, int, float, bool, list, dict)):
                    return {k: str(v) for k, v in value.__dict__.items() if not k.startswith('_')}
                # Return as string if it's a complex type
                if not isinstance(value, (str, int, float, bool, list, dict)):
                    return str(value)
                return value
            except Exception:
                return default
        
        try:
            # Extract the final output text from the response
            # According to OpenAI docs, final answer is in response.output[-1].content[0].text
            if hasattr(response, 'output') and response.output:
                try:
                    last_output = response.output[-1]
                    if hasattr(last_output, 'content') and last_output.content:
                        first_content = last_output.content[0]
                        if hasattr(first_content, 'text'):
                            research_response.output_text = str(first_content.text)
                        elif isinstance(first_content, dict) and 'text' in first_content:
                            research_response.output_text = str(first_content['text'])
                except (IndexError, AttributeError, TypeError):
                    # Fallback to output_text if direct access fails
                    if hasattr(response, 'output_text'):
                        research_response.output_text = str(response.output_text) if response.output_text else None
            elif hasattr(response, 'output_text'):
                research_response.output_text = str(response.output_text) if response.output_text else None
            
            # Extract output items (web searches, code execution, etc.)
            if hasattr(response, 'output'):
                output_items = []
                sources = []
                
                for item in response.output:
                    # Build a safe dictionary for this item
                    item_dict = {
                        "id": safe_extract_value(item, 'id'),
                        "type": safe_extract_value(item, 'type'),
                        "status": safe_extract_value(item, 'status')
                    }
                    
                    # Handle action field
                    if hasattr(item, 'action'):
                        item_dict["action"] = safe_extract_value(item, 'action')
                    else:
                        item_dict["action"] = None
                    
                    # Handle content field
                    if hasattr(item, 'content'):
                        content = item.content
                        if isinstance(content, list):
                            # Process list of content items
                            content_list = []
                            for c in content:
                                if hasattr(c, 'model_dump'):
                                    content_list.append(c.model_dump(mode='json'))
                                elif hasattr(c, '__dict__'):
                                    content_list.append({k: str(v) for k, v in c.__dict__.items() if not k.startswith('_')})
                                else:
                                    content_list.append(str(c) if c else None)
                            item_dict["content"] = content_list
                        else:
                            item_dict["content"] = safe_extract_value(item, 'content')
                    else:
                        item_dict["content"] = None
                    
                    output_items.append(item_dict)
                    
                    # Extract sources from web search results
                    if safe_extract_value(item, 'type') == 'web_search_call':
                        if hasattr(item, 'action') and hasattr(item.action, 'type'):
                            action_type = safe_extract_value(item.action, 'type')
                            if action_type == 'open_page':
                                sources.append({
                                    "url": safe_extract_value(item.action, 'url'),
                                    "title": safe_extract_value(item.action, 'title')
                                })
                
                research_response.output = output_items
                research_response.sources = sources
            
            # Update status and timing
            research_response.status = ResearchStatus.COMPLETED
            research_response.completed_at = datetime.now()
            research_response.duration_seconds = (
                research_response.completed_at - research_response.created_at
            ).total_seconds()
            
            return research_response
            
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}")
            research_response.status = ResearchStatus.FAILED
            research_response.error = str(e)
            return research_response
    
    async def get_research_status(self, research_id: str) -> DeepResearchResponse:
        """Get the status of a deep research task"""
        # Check completed research
        if research_id in self.completed_research:
            return self.completed_research[research_id]
        
        # Check active research
        if research_id in self.active_research:
            research_data = self.active_research[research_id]
            
            # Try to get updated status from OpenAI
            try:
                response = self.client.responses.retrieve(research_data["response_id"])
                
                # Check if completed
                if hasattr(response, 'status') and response.status == 'completed':
                    # Process and move to completed
                    research_response = DeepResearchResponse(
                        id=research_id,
                        status=ResearchStatus.COMPLETED,
                        query=research_data["query"],
                        created_at=research_data["start_time"],
                        completed_at=datetime.now()
                    )
                    
                    research_response = await self._process_response(response, research_response)
                    
                    # Move to completed and remove from active
                    self.completed_research[research_id] = research_response
                    del self.active_research[research_id]
                    
                    return research_response
                    
            except Exception as e:
                logger.error(f"Error checking research status: {str(e)}")
            
            # Still in progress
            return DeepResearchResponse(
                id=research_id,
                status=ResearchStatus.IN_PROGRESS,
                query=research_data["query"],
                created_at=research_data["start_time"]
            )
        
        # Not found
        return DeepResearchResponse(
            id=research_id,
            status=ResearchStatus.FAILED,
            query="Unknown",
            error="Research task not found",
            created_at=datetime.now()
        )
    
    async def cancel_research(self, research_id: str) -> bool:
        """Cancel an active research task"""
        if research_id in self.active_research:
            try:
                # Note: OpenAI API may not support direct cancellation
                # Mark as cancelled in our system
                research_data = self.active_research[research_id]
                cancelled_response = DeepResearchResponse(
                    id=research_id,
                    status=ResearchStatus.CANCELLED,
                    query=research_data["query"],
                    created_at=research_data["start_time"],
                    completed_at=datetime.now()
                )
                
                self.completed_research[research_id] = cancelled_response
                del self.active_research[research_id]
                
                logger.info(f"Research {research_id} cancelled")
                return True
                
            except Exception as e:
                logger.error(f"Error cancelling research: {str(e)}")
                return False
        
        return False

class ClarificationAgent:
    """Agent for generating clarification questions"""
    
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
    
    async def generate_clarifications(self, request: ClarificationRequest) -> ClarificationResponse:
        """Generate clarification questions for a research query"""
        
        instructions = """
You are talking to a user who is asking for a research task to be conducted. Your job is to gather more information from the user to successfully complete the task.

GUIDELINES:
- Be concise while gathering all necessary information
- Make sure to gather all the information needed to carry out the research task in a concise, well-structured manner
- Use bullet points or numbered lists for clarity
- Don't ask for unnecessary information, or information that the user has already provided
- Focus on clarifying scope, depth, specific aspects, and desired output format
- Maximum 5 clarification questions

IMPORTANT: Do NOT conduct any research yourself, just gather information that will be given to a researcher to conduct the research task.

Format your response as a JSON array of questions.
"""
        
        try:
            response = self.client.responses.create(
                model="gpt-4.1",
                input=f"User query: {request.user_input}\nContext: {request.context or 'None'}",
                instructions=instructions
            )
            
            # Parse questions from response
            questions = self._parse_questions(response.output_text)
            
            return ClarificationResponse(
                questions=questions,
                original_input=request.user_input
            )
            
        except Exception as e:
            logger.error(f"Error generating clarifications: {str(e)}")
            return ClarificationResponse(
                questions=["Could you provide more details about what you're looking for?"],
                original_input=request.user_input
            )
    
    def _parse_questions(self, text: str) -> List[str]:
        """Parse questions from the response text"""
        try:
            # Try to parse as JSON first
            questions = json.loads(text)
            if isinstance(questions, list):
                return questions
        except:
            pass
        
        # Fallback to text parsing
        questions = []
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # Remove numbering or bullets
                question = line.lstrip('0123456789.-•) ').strip()
                if question:
                    questions.append(question)
        
        return questions[:5]  # Maximum 5 questions

class PromptEnricher:
    """Agent for enriching user prompts for deep research"""
    
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
    
    async def enrich_prompt(self, request: PromptEnrichmentRequest) -> EnrichedPromptResponse:
        """Enrich a user prompt for better deep research results"""
        
        instructions = """
You will be given a research task by a user. Your job is to produce a set of instructions for a researcher that will complete the task. Do NOT complete the task yourself, just provide instructions on how to complete it.

GUIDELINES:
1. **Maximize Specificity and Detail**
   - Include all known user preferences and explicitly list key attributes or dimensions to consider
   - It is of utmost importance that all details from the user are included in the instructions

2. **Fill in Unstated But Necessary Dimensions as Open-Ended**
   - If certain attributes are essential for a meaningful output but the user has not provided them, explicitly state that they are open-ended or default to no specific constraint

3. **Avoid Unwarranted Assumptions**
   - If the user has not provided a particular detail, do not invent one
   - Instead, state the lack of specification and guide the researcher to treat it as flexible or accept all possible options

4. **Use the First Person**
   - Phrase the request from the perspective of the user

5. **Tables and Formatting**
   - If you determine that including a table will help illustrate, organize, or enhance the information in the research output, you must explicitly request that the researcher provide them
   - Include the expected output format in the prompt
   - If the user is asking for content that would be best returned in a structured format, ask the researcher to format as a report with the appropriate headers and formatting

6. **Sources**
   - Specify that specific sources should be prioritized when relevant
   - For product and travel research, prefer linking directly to official or primary websites
   - For academic or scientific queries, prefer linking directly to the original paper or official journal publication

7. **Include these research directives**:
   - Include specific figures, trends, statistics, and measurable outcomes
   - Prioritize reliable, up-to-date sources
   - Include inline citations and return all source metadata
   - Be analytical, avoid generalities, and ensure each section supports data-backed reasoning
"""
        
        try:
            # Add research type context if provided
            context = ""
            if request.research_type:
                context = f"\nResearch type: {request.research_type}"
            
            response = self.client.responses.create(
                model="gpt-4.1",
                input=f"User query: {request.user_input}{context}",
                instructions=instructions
            )
            
            enriched_prompt = response.output_text
            
            # Extract instructions from the enriched prompt
            instructions_text = self._extract_instructions(enriched_prompt)
            
            return EnrichedPromptResponse(
                original_prompt=request.user_input,
                enriched_prompt=enriched_prompt,
                instructions=instructions_text
            )
            
        except Exception as e:
            logger.error(f"Error enriching prompt: {str(e)}")
            # Return original with basic enrichment
            return EnrichedPromptResponse(
                original_prompt=request.user_input,
                enriched_prompt=f"{request.user_input}\n\nPlease provide comprehensive research with specific data, statistics, and citations from reliable sources.",
                instructions="Conduct thorough research and provide detailed findings with sources."
            )
    
    def _extract_instructions(self, enriched_text: str) -> str:
        """Extract key instructions from enriched prompt"""
        # Take first paragraph or first 200 characters as instructions summary
        lines = enriched_text.split('\n')
        instructions = []
        
        for line in lines[:3]:  # First 3 lines
            line = line.strip()
            if line:
                instructions.append(line)
        
        return ' '.join(instructions)[:500]  # Limit to 500 characters

# Webhook handler for background research completion
class WebhookHandler:
    """Handler for webhook notifications from deep research"""
    
    @staticmethod
    async def handle_webhook(data: Dict[str, Any]) -> None:
        """Process webhook notification"""
        event_type = data.get("event")
        response_id = data.get("response_id")
        
        logger.info(f"Webhook received: {event_type} for response {response_id}")
        
        if event_type == "response.completed":
            # Handle completion
            logger.info(f"Research {response_id} completed successfully")
            # You can add custom logic here (e.g., notify user, store results, etc.)
            
        elif event_type == "response.failed":
            # Handle failure
            logger.error(f"Research {response_id} failed")
            # You can add error handling logic here
