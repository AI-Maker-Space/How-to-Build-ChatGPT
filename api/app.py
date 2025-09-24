# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import tempfile
import asyncio
from typing import Optional, Dict, List, Any
import sys
import json
import base64
from io import BytesIO
import requests

# Add the parent directory to the Python path to import aimakerspace
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import agents SDK components for research functionality
try:
    from agents import Agent, WebSearchTool, Runner, ModelSettings
    from openai.types.shared.reasoning import Reasoning
    AGENTS_SDK_AVAILABLE = True
except ImportError:
    AGENTS_SDK_AVAILABLE = False
    print("Warning: OpenAI Agents SDK not available. Research functionality will be limited.")

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Responses API Chat")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Global storage for file metadata and vector store IDs
uploaded_files_metadata: Dict[str, Dict[str, Any]] = {}
user_vector_stores: Dict[str, str] = {}  # Store vector store IDs per session/user

# Define the data model for chat requests
class ChatRequest(BaseModel):
    user_message: str
    model: Optional[str] = "gpt-5"  # Default to GPT-5
    api_key: str
    file_ids: Optional[List[str]] = []
    use_research: Optional[bool] = False
    reasoning_effort: Optional[str] = "medium"  # low, medium, high

# Define the data model for research requests
class ResearchRequest(BaseModel):
    query: str
    api_key: str
    depth: Optional[str] = "medium"  # light, medium, deep

# Define the data model for research results
class ResearchResult(BaseModel):
    query: str
    findings: List[str]
    sources: List[str]
    summary: str

def create_file(client: OpenAI, file_content: bytes, file_name: str) -> str:
    """
    Upload a file to OpenAI's File API.
    
    Args:
        client: OpenAI client instance
        file_content: File content as bytes
        file_name: Name of the file
        
    Returns:
        str: File ID from OpenAI
    """
    try:
        # Create a BytesIO object from the content
        file_buffer = BytesIO(file_content)
        file_tuple = (file_name, file_buffer)
        
        result = client.files.create(
            file=file_tuple,
            purpose="assistants"
        )
        
        print(f"File uploaded successfully. File ID: {result.id}")
        return result.id
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise

def get_or_create_vector_store(client: OpenAI, session_key: str = "default") -> str:
    """
    Get or create a vector store for the session.
    
    Args:
        client: OpenAI client instance
        session_key: Session/user identifier
        
    Returns:
        str: Vector store ID
    """
    global user_vector_stores
    
    # Check if we have a vector store for this session
    if session_key in user_vector_stores:
        store_id = user_vector_stores[session_key]
        try:
            # Verify the store still exists
            store = client.vector_stores.retrieve(store_id)
            print(f"Using existing vector store: {store_id}")
            return store_id
        except:
            print(f"Vector store {store_id} no longer exists, creating new one")
            del user_vector_stores[session_key]
    
    # Create a new vector store
    try:
        vector_store = client.vector_stores.create(
            name=f"Knowledge_Base_{session_key}"
        )
        
        user_vector_stores[session_key] = vector_store.id
        print(f"Created new vector store: {vector_store.id}")
        return vector_store.id
    except Exception as e:
        print(f"Error creating vector store: {e}")
        raise

def add_file_to_vector_store(client: OpenAI, file_id: str, vector_store_id: str) -> bool:
    """
    Add a file to the vector store for retrieval.
    
    Returns:
        bool: Success status
    """
    try:
        client.vector_stores.files.create(
            vector_store_id=vector_store_id,
            file_id=file_id
        )
        print(f"File {file_id} added to vector store {vector_store_id}")
        return True
    except Exception as e:
        print(f"Error adding file to vector store: {e}")
        return False

# Define the main chat endpoint using Responses API
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=request.api_key)
        
        # Prepare input content
        input_content = request.user_message
        
        # Perform research if requested
        research_context = ""
        if request.use_research and AGENTS_SDK_AVAILABLE:
            try:
                research_result = await perform_light_research(request.user_message, request.api_key)
                if research_result:
                    research_context = f"\n\nResearch findings:\n{research_result}"
                    input_content += research_context
            except Exception as e:
                print(f"Research failed: {e}")
        
        # Create an async generator function for streaming responses
        async def generate():
            try:
                # Check if we have files and need to use vector store
                tools = []
                if request.file_ids and len(request.file_ids) > 0:
                    # Get the vector store ID for this session
                    # In production, you'd want to use a proper session identifier
                    session_key = request.api_key[-8:]  # Use last 8 chars of API key as session ID
                    
                    # Check if we have a vector store with these files
                    vector_store_id = None
                    for file_id in request.file_ids:
                        if file_id in uploaded_files_metadata:
                            file_meta = uploaded_files_metadata[file_id]
                            if 'vector_store_id' in file_meta and file_meta['vector_store_id']:
                                vector_store_id = file_meta['vector_store_id']
                                break
                    
                    if vector_store_id:
                        # Use file_search tool with the vector store
                        tools = [{
                            "type": "file_search",
                            "vector_store_ids": [vector_store_id]
                        }]
                        print(f"Using vector store {vector_store_id} for file search")
                
                # Try the Responses API with tools if available
                use_responses_api = request.model in ["gpt-5", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
                
                if use_responses_api:
                    try:
                        print(f"Attempting Responses API with model: {request.model}")
                        
                        # Build the request parameters
                        params = {
                            "model": request.model,
                            "input": input_content,
                            "reasoning": {"effort": request.reasoning_effort},
                            "instructions": "You are a helpful assistant. When files are provided, use the file_search tool to find relevant information from the uploaded documents. When research context is provided, use it to enhance your answer."
                        }
                        
                        # Add tools if we have them
                        if tools:
                            params["tools"] = tools
                            print(f"Added tools to Responses API: {tools}")
                        
                        response = client.responses.create(**params)
                        
                        # Check if response has output_text
                        if hasattr(response, 'output_text'):
                            yield response.output_text
                        else:
                            yield str(response)
                        return
                    except Exception as e:
                        print(f"Responses API failed: {e}, falling back to alternatives")
                
                # Fallback to Assistant API if we have files
                if request.file_ids and len(request.file_ids) > 0:
                    try:
                        print("Using Assistant API for file handling")
                        
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
                        except:
                            pass
                            
                    except Exception as assistant_error:
                        print(f"Assistant API error: {assistant_error}")
                        # Fall back to standard chat
                        async for chunk in standard_chat_completion(client, input_content, request.model):
                            yield chunk
                else:
                    # Standard chat completion without files
                    async for chunk in standard_chat_completion(client, input_content, request.model):
                        yield chunk
                    
            except Exception as e:
                print(f"Chat generation error: {e}")
                yield f"Error: {str(e)}"

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def standard_chat_completion(client: OpenAI, content: str, model: str):
    """Standard chat completion helper"""
    try:
        # Use a fallback model if the requested one doesn't work
        models_to_try = [model, "gpt-5", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
        
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
                    if chunk.choices[0].delta.content is not None:
                        yield chunk.choices[0].delta.content
                break
            except Exception as model_error:
                print(f"Model {model_name} failed: {model_error}")
                if model_name == models_to_try[-1]:
                    yield f"Error: All models failed. Last error: {str(model_error)}"
    except Exception as e:
        yield f"Error in chat completion: {str(e)}"

# Research endpoint using OpenAI Agents SDK
@app.post("/api/research")
async def research(request: ResearchRequest):
    try:
        client = OpenAI(api_key=request.api_key)
        
        # Simple research using chat completion
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a research assistant. Provide comprehensive insights on the given topic."},
                {"role": "user", "content": f"Research the following topic and provide insights: {request.query}"}
            ]
        )
        
        output_text = response.choices[0].message.content
        
        return ResearchResult(
            query=request.query,
            findings=[output_text],
            sources=["OpenAI Analysis"],
            summary=output_text[:500] + "..." if len(output_text) > 500 else output_text
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research error: {str(e)}")

# Helper function for light research
async def perform_light_research(query: str, api_key: str) -> str:
    """Perform light research on a topic"""
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
        print(f"Light research failed: {e}")
        return ""

# File upload endpoint using OpenAI Files API and Vector Stores
@app.post("/api/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    api_key: str = Form(...)
):
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Read file content
        content = await file.read()
        
        # Upload to OpenAI Files API
        openai_file_id = create_file(client, content, file.filename)
        
        # Create or get vector store for this session
        # In production, use proper session management
        session_key = api_key[-8:]  # Use last 8 chars of API key as session ID
        vector_store_id = get_or_create_vector_store(client, session_key)
        
        # Add file to vector store
        success = add_file_to_vector_store(client, openai_file_id, vector_store_id)
        
        if not success:
            print(f"Warning: File uploaded but not added to vector store")
        
        # Store metadata for reference
        uploaded_files_metadata[openai_file_id] = {
            'name': file.filename,
            'openai_id': openai_file_id,
            'size': len(content),
            'content_type': file.content_type,
            'vector_store_id': vector_store_id,
            'session_key': session_key
        }
        
        return {
            "message": "File uploaded successfully to OpenAI and added to vector store",
            "file_id": openai_file_id,
            "filename": file.filename,
            "size": len(content),
            "file_type": "document",
            "vector_store_id": vector_store_id
        }
        
    except Exception as e:
        print(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# Get uploaded files list
@app.get("/api/files")
async def get_files():
    return {
        "files": [
            {
                "id": file_id,
                "name": file_info['name'],
                "size": file_info['size'],
                "openai_id": file_info.get('openai_id', file_id),
                "vector_store_id": file_info.get('vector_store_id')
            }
            for file_id, file_info in uploaded_files_metadata.items()
        ]
    }

# Delete a file
@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    if file_id in uploaded_files_metadata:
        try:
            # Note: We're not deleting from OpenAI to avoid issues
            # Just remove from local metadata
            del uploaded_files_metadata[file_id]
            return {"message": "File removed from session"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error removing file: {str(e)}")
    else:
        raise HTTPException(status_code=404, detail="File not found")

# Clear session endpoint - resets vector stores and files
@app.post("/api/clear-session")
async def clear_session(api_key: str = Form(...)):
    """Clear the session, removing vector stores and file metadata"""
    try:
        # Get session key
        session_key = api_key[-8:]
        
        # Clear vector store for this session
        if session_key in user_vector_stores:
            vector_store_id = user_vector_stores[session_key]
            
            # Try to delete the vector store from OpenAI (optional)
            try:
                client = OpenAI(api_key=api_key)
                client.vector_stores.delete(vector_store_id)
                print(f"Deleted vector store {vector_store_id}")
            except Exception as e:
                print(f"Could not delete vector store {vector_store_id}: {e}")
            
            # Remove from our tracking
            del user_vector_stores[session_key]
        
        # Clear files associated with this session
        files_to_remove = []
        for file_id, file_info in uploaded_files_metadata.items():
            if file_info.get('session_key') == session_key:
                files_to_remove.append(file_id)
        
        for file_id in files_to_remove:
            del uploaded_files_metadata[file_id]
        
        return {
            "message": "Session cleared successfully",
            "files_removed": len(files_to_remove),
            "vector_store_cleared": session_key in user_vector_stores
        }
        
    except Exception as e:
        print(f"Error clearing session: {e}")
        raise HTTPException(status_code=500, detail=f"Error clearing session: {str(e)}")

# Get vector store info
@app.get("/api/vector-stores")
async def get_vector_stores():
    """Get information about active vector stores"""
    return {
        "vector_stores": user_vector_stores,
        "file_mappings": {
            file_id: {
                "name": file_info['name'],
                "vector_store_id": file_info.get('vector_store_id')
            }
            for file_id, file_info in uploaded_files_metadata.items()
        }
    }

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "responses_api": "enabled",
        "research": "enabled",
        "file_upload": "enabled",
        "vector_stores": "enabled",
        "active_vector_stores": len(user_vector_stores),
        "uploaded_files": len(uploaded_files_metadata)
    }

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)