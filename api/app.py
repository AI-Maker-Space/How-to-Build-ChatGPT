"""
Main FastAPI Application

Production-ready ChatGPT clone API with OpenAI Responses API integration.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from typing import Optional, Dict, List, Any
import json
from io import BytesIO

# Application configuration and utilities
from api.config import settings
from api.utils import (
    logger,
    ValidationError,
    AuthenticationError,
    NotFoundError,
    OpenAIError,
    validate_api_key,
    validate_model_name,
    validate_file_type,
    validate_file_size,
    validate_message_content,
    validate_reasoning_effort,
    session_manager,
)

# Import agents SDK components for research functionality
try:
    from agents import Agent, WebSearchTool, Runner, ModelSettings
    from openai.types.shared.reasoning import Reasoning
    AGENTS_SDK_AVAILABLE = True
except ImportError:
    AGENTS_SDK_AVAILABLE = False
    logger.warning("OpenAI Agents SDK not available. Research functionality will be limited.")

# Import deep research module
try:
    from deep_research import (
        DeepResearchManager,
        ClarificationAgent,
        PromptEnricher,
        WebhookHandler,
        DeepResearchRequest,
        ClarificationRequest,
        PromptEnrichmentRequest,
        DeepResearchModel,
        ResearchDepth
    )
    DEEP_RESEARCH_AVAILABLE = True
except ImportError as e:
    DEEP_RESEARCH_AVAILABLE = False
    logger.warning(f"Deep Research module not available: {e}")

# Initialize FastAPI application
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    debug=settings.debug
)

# Configure CORS middleware with proper security settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Deep research managers (keyed by session ID for better security)
deep_research_managers: Dict[str, DeepResearchManager] = {}
clarification_agents: Dict[str, ClarificationAgent] = {}
prompt_enrichers: Dict[str, PromptEnricher] = {}

# Request/Response Models
class ChatRequest(BaseModel):
    """Chat request model with validation."""
    user_message: str = Field(..., min_length=1, max_length=100000)
    model: Optional[str] = Field(default=settings.default_model)
    api_key: str = Field(..., min_length=20)
    file_ids: Optional[List[str]] = Field(default_factory=list, max_items=10)
    use_research: Optional[bool] = False
    reasoning_effort: Optional[str] = Field(default=settings.default_reasoning_effort)
    session_id: Optional[str] = None

class ResearchRequest(BaseModel):
    """Research request model."""
    query: str = Field(..., min_length=1, max_length=5000)
    api_key: str = Field(..., min_length=20)
    depth: Optional[str] = Field(default="medium", pattern="^(light|medium|deep)$")
    session_id: Optional[str] = None

class ResearchResult(BaseModel):
    """Research result model."""
    query: str
    findings: List[str]
    sources: List[str]
    summary: str

class DeepResearchApiRequest(BaseModel):
    """Deep research request model."""
    query: str = Field(..., min_length=1, max_length=10000)
    api_key: str = Field(..., min_length=20)
    model: Optional[str] = Field(default="o3-deep-research")
    use_web_search: Optional[bool] = True
    use_file_search: Optional[bool] = False
    use_code_interpreter: Optional[bool] = False
    vector_store_ids: Optional[List[str]] = None
    background: Optional[bool] = True
    webhook_url: Optional[str] = None
    max_tool_calls: Optional[int] = Field(default=None, ge=1, le=100)
    clarify_first: Optional[bool] = False
    enrich_prompt: Optional[bool] = True
    session_id: Optional[str] = None

# Helper Functions
def create_file(client: OpenAI, file_content: bytes, file_name: str) -> str:
    """
    Upload a file to OpenAI's File API.
    
    Args:
        client: OpenAI client instance
        file_content: File content as bytes
        file_name: Name of the file
        
    Returns:
        str: File ID from OpenAI
        
    Raises:
        OpenAIError: If file upload fails
    """
    try:
        file_buffer = BytesIO(file_content)
        file_tuple = (file_name, file_buffer)
        
        result = client.files.create(
            file=file_tuple,
            purpose="assistants"
        )
        
        logger.info(f"File uploaded successfully. File ID: {result.id[:8]}...")
        return result.id
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise OpenAIError(f"Failed to upload file: {str(e)}")

def get_or_create_vector_store(client: OpenAI, session_id: str) -> str:
    """
    Get or create a vector store for the session.
    
    Args:
        client: OpenAI client instance
        session_id: Session identifier
        
    Returns:
        str: Vector store ID
        
    Raises:
        OpenAIError: If vector store creation fails
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise NotFoundError("Session not found")
    
    # Check if session already has a vector store
    if session.get("vector_store_id"):
        store_id = session["vector_store_id"]
        try:
            # Verify the store still exists
            client.vector_stores.retrieve(store_id)
            logger.debug(f"Using existing vector store: {store_id[:8]}...")
            return store_id
        except Exception:
            logger.warning(f"Vector store {store_id[:8]}... no longer exists, creating new one")
            session["vector_store_id"] = None
    
    # Create a new vector store
    try:
        vector_store = client.vector_stores.create(
            name=f"Knowledge_Base_{session_id[:8]}"
        )
        
        session_manager.update_session(session_id, {"vector_store_id": vector_store.id})
        logger.info(f"Created new vector store: {vector_store.id[:8]}...")
        return vector_store.id
    except Exception as e:
        logger.error(f"Error creating vector store: {e}")
        raise OpenAIError(f"Failed to create vector store: {str(e)}")

def add_file_to_vector_store(client: OpenAI, file_id: str, vector_store_id: str) -> bool:
    """
    Add a file to the vector store for retrieval.
    
    Args:
        client: OpenAI client instance
        file_id: File ID to add
        vector_store_id: Vector store ID
        
    Returns:
        bool: Success status
    """
    try:
        client.vector_stores.files.create(
            vector_store_id=vector_store_id,
            file_id=file_id
        )
        logger.info(f"File {file_id[:8]}... added to vector store {vector_store_id[:8]}...")
        return True
    except Exception as e:
        logger.error(f"Error adding file to vector store: {e}")
        return False

# Chat Endpoint
@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint with streaming responses.
    
    Validates input, manages sessions, and streams responses from OpenAI.
    """
    try:
        # Validate inputs
        api_key = validate_api_key(request.api_key)
        model = validate_model_name(request.model) if request.model else settings.default_model
        message_content = validate_message_content(request.user_message)
        reasoning_effort = validate_reasoning_effort(request.reasoning_effort)
        
        # Get or create session
        session_id = request.session_id
        if not session_id:
            session_id = session_manager.create_session(api_key)
        else:
            session = session_manager.get_session(session_id)
            if not session:
                raise NotFoundError("Session not found or expired")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Prepare input content
        input_content = message_content
        
        # Perform research if requested
        if request.use_research and AGENTS_SDK_AVAILABLE:
            try:
                research_result = await perform_light_research(message_content, api_key)
                if research_result:
                    research_context = f"\n\nResearch findings:\n{research_result}"
                    input_content += research_context
            except Exception as e:
                logger.warning(f"Research failed: {e}")
        
        # Create async generator for streaming responses
        async def generate():
            try:
                # Check if we have files and need to use vector store
                tools = []
                if request.file_ids and len(request.file_ids) > 0:
                    session = session_manager.get_session(session_id)
                    if session and session.get("vector_store_id"):
                        vector_store_id = session["vector_store_id"]
                        tools = [{
                            "type": "file_search",
                            "vector_store_ids": [vector_store_id]
                        }]
                        logger.debug(f"Using vector store {vector_store_id[:8]}... for file search")
                
                # Try the Responses API with tools if available
                use_responses_api = model in ["gpt-5", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
                
                if use_responses_api:
                    try:
                        logger.debug(f"Attempting Responses API with model: {model}")
                        
                        # Build the request parameters
                        params = {
                            "model": model,
                            "input": input_content,
                            "reasoning": {"effort": reasoning_effort},
                            "instructions": "You are a helpful assistant. When files are provided, use the file_search tool to find relevant information from the uploaded documents. When research context is provided, use it to enhance your answer."
                        }
                        
                        # Add tools if we have them
                        if tools:
                            params["tools"] = tools
                            logger.debug(f"Added tools to Responses API: {tools}")
                        
                        response = client.responses.create(**params)
                        
                        # Check if response has output_text
                        if hasattr(response, 'output_text') and response.output_text:
                            yield response.output_text
                        else:
                            yield str(response) if response else "No response generated"
                        return
                    except Exception as e:
                        logger.warning(f"Responses API failed: {e}, falling back to alternatives")
                
                # Fallback to Assistant API if we have files
                if request.file_ids and len(request.file_ids) > 0:
                    try:
                        logger.debug("Using Assistant API for file handling")
                        
                        # Create an assistant with file_search tool
                        assistant = client.assistants.create(
                            model="gpt-4o-mini",
                            tools=[{"type": "file_search"}],
                            instructions="You are a helpful assistant that answers questions based on the provided files and context."
                        )
                        
                        # Create a thread
                        thread = client.threads.create()
                        
                        # Add message with file attachments
                        message = client.threads.messages.create(
                            thread_id=thread.id,
                            role="user",
                            content=input_content,
                            attachments=[
                                {"file_id": file_id, "tools": [{"type": "file_search"}]}
                                for file_id in request.file_ids
                            ] if request.file_ids else None
                        )
                        
                        # Run the assistant
                        run = client.runs.create_and_poll(
                            thread_id=thread.id,
                            assistant_id=assistant.id
                        )
                        
                        # Get the response
                        if run.status == 'completed':
                            messages_response = client.threads.messages.list(thread_id=thread.id)
                            for msg in messages_response.data:
                                if msg.role == "assistant":
                                    for content in msg.content:
                                        if content.type == 'text':
                                            yield content.text.value
                                            break
                                    break
                        else:
                            yield f"Assistant run failed with status: {run.status}"
                            
                        # Clean up assistant
                        try:
                            client.assistants.delete(assistant.id)
                        except Exception:
                            pass
                            
                    except Exception as assistant_error:
                        logger.warning(f"Assistant API error: {assistant_error}")
                        # Fall back to standard chat
                        async for chunk in standard_chat_completion(client, input_content, model):
                            yield chunk
                else:
                    # Standard chat completion without files
                    async for chunk in standard_chat_completion(client, input_content, model):
                        yield chunk
                    
            except Exception as e:
                logger.error(f"Chat generation error: {e}")
                yield f"Error: {str(e)}"

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except ValidationError as e:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred processing your request")

async def standard_chat_completion(client: OpenAI, content: str, model: str):
    """
    Standard chat completion helper with fallback models.
    
    Args:
        client: OpenAI client instance
        content: Message content
        model: Preferred model name
        
    Yields:
        str: Response chunks
    """
    try:
        # Use a fallback model if the requested one doesn't work
        models_to_try = [model, "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
        
        for model_name in models_to_try:
            try:
                stream = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": content}
                    ],
                    stream=True
                )
                
                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content is not None:
                        yield chunk.choices[0].delta.content
                break
            except Exception as model_error:
                logger.warning(f"Model {model_name} failed: {model_error}")
                if model_name == models_to_try[-1]:
                    yield f"Error: All models failed. Last error: {str(model_error)}"
    except Exception as e:
        logger.error(f"Error in chat completion: {e}")
        yield f"Error in chat completion: {str(e)}"

# Research Endpoint
@app.post("/api/research")
async def research(request: ResearchRequest):
    """
    Research endpoint using OpenAI chat completion.
    
    Provides comprehensive research insights on a given topic.
    """
    try:
        api_key = validate_api_key(request.api_key)
        query = validate_message_content(request.query, max_length=5000)
        
        client = OpenAI(api_key=api_key)
        
        # Simple research using chat completion
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a research assistant. Provide comprehensive insights on the given topic."},
                {"role": "user", "content": f"Research the following topic and provide insights: {query}"}
            ]
        )
        
        output_text = response.choices[0].message.content
        
        return ResearchResult(
            query=query,
            findings=[output_text],
            sources=["OpenAI Analysis"],
            summary=output_text[:500] + "..." if len(output_text) > 500 else output_text
        )
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Research error: {e}", exc_info=True)
        raise OpenAIError(f"Research failed: {str(e)}")

# Helper function for light research
async def perform_light_research(query: str, api_key: str) -> str:
    """
    Perform light research on a topic.
    
    Args:
        query: Research query
        api_key: OpenAI API key
        
    Returns:
        str: Research insights or empty string on failure
    """
    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a research assistant. Provide key insights on the topic."},
                {"role": "user", "content": f"Provide brief research insights about: {query}"}
            ],
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"Light research failed: {e}")
        return ""

# File Upload Endpoint
@app.post("/api/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    session_id: Optional[str] = Form(None)
):
    """
    Upload a file to OpenAI and add it to a vector store.
    
    Validates file type and size, uploads to OpenAI, and manages session state.
    """
    try:
        # Validate inputs
        api_key = validate_api_key(api_key)
        filename = validate_file_type(file.filename)
        
        # Read file content
        content = await file.read()
        file_size = validate_file_size(len(content))
        
        # Get or create session
        if not session_id:
            session_id = session_manager.create_session(api_key)
        else:
            session = session_manager.get_session(session_id)
            if not session:
                raise NotFoundError("Session not found or expired")
        
        # Check file count limit
        session = session_manager.get_session(session_id)
        if session and len(session.get("files", {})) >= settings.max_files_per_session:
            raise ValidationError(
                f"Maximum file limit ({settings.max_files_per_session}) reached for this session"
            )
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Upload to OpenAI Files API
        openai_file_id = create_file(client, content, filename)
        
        # Create or get vector store for this session
        vector_store_id = get_or_create_vector_store(client, session_id)
        
        # Add file to vector store
        success = add_file_to_vector_store(client, openai_file_id, vector_store_id)
        
        if not success:
            logger.warning(f"File {openai_file_id[:8]}... uploaded but not added to vector store")
        
        # Store metadata in session
        file_metadata = {
            'name': filename,
            'openai_id': openai_file_id,
            'size': file_size,
            'content_type': file.content_type,
            'vector_store_id': vector_store_id
        }
        
        session = session_manager.get_session(session_id)
        if session:
            if "files" not in session:
                session["files"] = {}
            session["files"][openai_file_id] = file_metadata
            session_manager.update_session(session_id, session)
        
        return {
            "message": "File uploaded successfully to OpenAI and added to vector store",
            "file_id": openai_file_id,
            "filename": filename,
            "size": file_size,
            "file_type": "document",
            "vector_store_id": vector_store_id,
            "session_id": session_id
        }
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"File upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# Get Uploaded Files List
@app.get("/api/files")
async def get_files(session_id: Optional[str] = Query(None)):
    """
    Get list of uploaded files for a session.
    
    Args:
        session_id: Optional session ID. If not provided, returns empty list.
    """
    if not session_id:
        return {"files": []}
    
    session = session_manager.get_session(session_id)
    if not session:
        raise NotFoundError("Session not found or expired")
    
    files = session.get("files", {})
    return {
        "files": [
            {
                "id": file_id,
                "name": file_info['name'],
                "size": file_info['size'],
                "openai_id": file_info.get('openai_id', file_id),
                "vector_store_id": file_info.get('vector_store_id')
            }
            for file_id, file_info in files.items()
        ]
    }

# Delete a File
@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str, session_id: Optional[str] = Query(None)):
    """
    Delete a file from the session.
    
    Args:
        file_id: File ID to delete
        session_id: Session ID containing the file
    """
    if not session_id:
        raise ValidationError("Session ID is required")
    
    session = session_manager.get_session(session_id)
    if not session:
        raise NotFoundError("Session not found or expired")
    
    files = session.get("files", {})
    if file_id in files:
        try:
            del files[file_id]
            session["files"] = files
            session_manager.update_session(session_id, session)
            return {"message": "File removed from session"}
        except Exception as e:
            logger.error(f"Error removing file: {e}")
            raise HTTPException(status_code=500, detail=f"Error removing file: {str(e)}")
    else:
        raise NotFoundError("File not found in session")

# Clear Session Endpoint
@app.post("/api/clear-session")
async def clear_session(
    api_key: str = Form(...),
    session_id: Optional[str] = Form(None)
):
    """
    Clear the session, removing vector stores and file metadata.
    
    Args:
        api_key: User's API key
        session_id: Optional session ID. If not provided, creates a new session.
    """
    try:
        api_key = validate_api_key(api_key)
        
        if session_id:
            session = session_manager.get_session(session_id)
            if not session:
                raise NotFoundError("Session not found or expired")
            
            # Try to delete the vector store from OpenAI
            vector_store_id = session.get("vector_store_id")
            if vector_store_id:
                try:
                    client = OpenAI(api_key=api_key)
                    client.vector_stores.delete(vector_store_id)
                    logger.info(f"Deleted vector store {vector_store_id[:8]}...")
                except Exception as e:
                    logger.warning(f"Could not delete vector store {vector_store_id[:8]}...: {e}")
            
            # Delete the session
            files_count = len(session.get("files", {}))
            session_manager.delete_session(session_id)
            
            return {
                "message": "Session cleared successfully",
                "files_removed": files_count,
                "vector_store_cleared": vector_store_id is not None
            }
        else:
            # Create a new session (effectively clearing by starting fresh)
            new_session_id = session_manager.create_session(api_key)
            return {
                "message": "New session created",
                "session_id": new_session_id
            }
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error clearing session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error clearing session: {str(e)}")

# Get Vector Store Info
@app.get("/api/vector-stores")
async def get_vector_stores(session_id: Optional[str] = Query(None)):
    """
    Get information about active vector stores for a session.
    
    Args:
        session_id: Optional session ID
    """
    if not session_id:
        return {
            "vector_stores": {},
            "file_mappings": {}
        }
    
    session = session_manager.get_session(session_id)
    if not session:
        raise NotFoundError("Session not found or expired")
    
    vector_store_id = session.get("vector_store_id")
    files = session.get("files", {})
    
    return {
        "vector_store_id": vector_store_id,
        "file_mappings": {
            file_id: {
                "name": file_info['name'],
                "vector_store_id": file_info.get('vector_store_id')
            }
            for file_id, file_info in files.items()
        }
    }

# Deep Research Endpoints

@app.post("/api/deep-research")
async def start_deep_research(request: DeepResearchApiRequest):
    """Start a deep research task using OpenAI's deep research models"""
    if not DEEP_RESEARCH_AVAILABLE:
        raise HTTPException(status_code=501, detail="Deep Research functionality not available")
    
    try:
        # Get or create deep research manager for this API key
        if request.api_key not in deep_research_managers:
            deep_research_managers[request.api_key] = DeepResearchManager(request.api_key)
        
        manager = deep_research_managers[request.api_key]
        
        # Handle clarification if requested
        clarifications = None
        if request.clarify_first:
            if request.api_key not in clarification_agents:
                clarification_agents[request.api_key] = ClarificationAgent(request.api_key)
            
            agent = clarification_agents[request.api_key]
            clarification_req = ClarificationRequest(user_input=request.query)
            clarification_resp = await agent.generate_clarifications(clarification_req)
            clarifications = clarification_resp.questions
        
        # Handle prompt enrichment if requested
        enriched_query = request.query
        if request.enrich_prompt:
            if request.api_key not in prompt_enrichers:
                prompt_enrichers[request.api_key] = PromptEnricher(request.api_key)
            
            enricher = prompt_enrichers[request.api_key]
            enrichment_req = PromptEnrichmentRequest(user_input=request.query)
            enrichment_resp = await enricher.enrich_prompt(enrichment_req)
            enriched_query = enrichment_resp.enriched_prompt
        
        # Prepare deep research request
        deep_req = DeepResearchRequest(
            query=enriched_query,
            model=DeepResearchModel(request.model),
            background=request.background,
            max_tool_calls=request.max_tool_calls,
            vector_store_ids=request.vector_store_ids,
            use_web_search=request.use_web_search,
            use_code_interpreter=request.use_code_interpreter,
            webhook_url=request.webhook_url
        )
        
        # Start the research
        response = await manager.start_deep_research(deep_req)
        
        # Return response with clarifications if generated
        # Use model_dump_json for proper datetime serialization
        result = json.loads(response.model_dump_json())
        if clarifications:
            result["clarification_questions"] = clarifications
        
        return result
        
    except Exception as e:
        print(f"Deep research error: {e}")
        raise HTTPException(status_code=500, detail=f"Deep research error: {str(e)}")

@app.get("/api/deep-research/{research_id}/status")
async def get_deep_research_status(research_id: str, api_key: str):
    """Get the status of a deep research task"""
    if not DEEP_RESEARCH_AVAILABLE:
        raise HTTPException(status_code=501, detail="Deep Research functionality not available")
    
    try:
        # If no manager exists (e.g., after server restart), create one and return a "not found" status
        if api_key not in deep_research_managers:
            # Return a response indicating the research is no longer available
            return {
                "id": research_id,
                "status": "not_found",
                "query": "Unknown",
                "error": "Research task not found. It may have expired due to server restart.",
                "created_at": None,
                "completed_at": None
            }
        
        manager = deep_research_managers[api_key]
        response = await manager.get_research_status(research_id)
        
        # Ensure proper serialization with datetime handling
        return json.loads(response.model_dump_json())
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")

@app.delete("/api/deep-research/{research_id}")
async def cancel_deep_research(research_id: str, api_key: str = Form(...)):
    """Cancel an active deep research task"""
    if not DEEP_RESEARCH_AVAILABLE:
        raise HTTPException(status_code=501, detail="Deep Research functionality not available")
    
    try:
        if api_key not in deep_research_managers:
            raise HTTPException(status_code=404, detail="No research manager found for this API key")
        
        manager = deep_research_managers[api_key]
        success = await manager.cancel_research(research_id)
        
        if success:
            return {"message": f"Research {research_id} cancelled successfully"}
        else:
            raise HTTPException(status_code=404, detail="Research task not found or already completed")
            
    except Exception as e:
        print(f"Cancel error: {e}")
        raise HTTPException(status_code=500, detail=f"Cancel error: {str(e)}")

@app.post("/api/deep-research/clarify")
async def get_clarifications(request: ClarificationRequest, api_key: str = Form(...)):
    """Get clarification questions for a research query"""
    if not DEEP_RESEARCH_AVAILABLE:
        raise HTTPException(status_code=501, detail="Deep Research functionality not available")
    
    try:
        if api_key not in clarification_agents:
            clarification_agents[api_key] = ClarificationAgent(api_key)
        
        agent = clarification_agents[api_key]
        response = await agent.generate_clarifications(request)
        
        return json.loads(response.model_dump_json())
        
    except Exception as e:
        print(f"Clarification error: {e}")
        raise HTTPException(status_code=500, detail=f"Clarification error: {str(e)}")

@app.post("/api/deep-research/enrich")
async def enrich_prompt(request: PromptEnrichmentRequest, api_key: str = Form(...)):
    """Enrich a user prompt for better deep research results"""
    if not DEEP_RESEARCH_AVAILABLE:
        raise HTTPException(status_code=501, detail="Deep Research functionality not available")
    
    try:
        if api_key not in prompt_enrichers:
            prompt_enrichers[api_key] = PromptEnricher(api_key)
        
        enricher = prompt_enrichers[api_key]
        response = await enricher.enrich_prompt(request)
        
        return json.loads(response.model_dump_json())
        
    except Exception as e:
        print(f"Enrichment error: {e}")
        raise HTTPException(status_code=500, detail=f"Enrichment error: {str(e)}")

@app.post("/api/deep-research/webhook")
async def handle_webhook(data: Dict[str, Any]):
    """Handle webhook notifications from OpenAI for deep research completion"""
    if not DEEP_RESEARCH_AVAILABLE:
        return {"status": "ignored", "reason": "Deep Research not available"}
    
    try:
        await WebhookHandler.handle_webhook(data)
        return {"status": "processed"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "detail": str(e)}

# Health Check Endpoint
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify API status.
    
    Returns status of all major components and active sessions.
    """
    active_sessions = len([s for s in session_manager._sessions.values()])
    active_research = (
        sum(len(manager.active_research) for manager in deep_research_managers.values())
        if DEEP_RESEARCH_AVAILABLE else 0
    )
    
    return {
        "status": "ok",
        "version": settings.api_version,
        "responses_api": "enabled",
        "research": "enabled" if AGENTS_SDK_AVAILABLE else "limited",
        "deep_research": "enabled" if DEEP_RESEARCH_AVAILABLE else "disabled",
        "file_upload": "enabled",
        "vector_stores": "enabled",
        "active_sessions": active_sessions,
        "active_deep_research": active_research
    }

# Startup and Shutdown Events
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info(f"Starting {settings.api_title} v{settings.api_version}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"CORS origins: {settings.cors_origins}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down application")
    session_manager.cleanup_expired_sessions()

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower()
    )