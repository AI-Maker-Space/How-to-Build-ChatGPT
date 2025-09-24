"""
FastAPI backend for ChatGPT application
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from database import init_db, get_db
from models import Thread, Message, User
from auth import verify_google_token, create_access_token, get_current_user
from schemas import (
    ThreadCreate, ThreadResponse, MessageCreate, MessageResponse,
    UserResponse, ChatRequest, ChatResponse, GoogleAuthRequest
)
from openai_service import OpenAIService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    await init_db()
    yield

app = FastAPI(
    title="ChatGPT Clone API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI service
openai_service = OpenAIService()

@app.get("/")
async def root():
    return {"message": "ChatGPT Clone API", "version": "1.0.0"}

@app.post("/api/auth/google", response_model=UserResponse)
async def google_auth(
    request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user with Google OAuth"""
    try:
        # Verify Google token
        google_user = await verify_google_token(request.token)
        
        # Check if user exists
        from sqlalchemy import select
        result = await db.execute(
            select(User).where(User.email == google_user["email"])
        )
        user = result.scalar_one_or_none()
        
        # Create user if doesn't exist
        if not user:
            user = User(
                email=google_user["email"],
                name=google_user.get("name", ""),
                picture=google_user.get("picture", "")
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            picture=user.picture,
            access_token=access_token
        )
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/threads", response_model=list[ThreadResponse])
async def get_threads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all threads for current user"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Thread)
        .where(Thread.user_id == current_user.id)
        .order_by(Thread.updated_at.desc())
        .options(selectinload(Thread.messages))
    )
    threads = result.scalars().all()
    
    return [ThreadResponse.from_orm(thread) for thread in threads]

@app.post("/api/threads", response_model=ThreadResponse)
async def create_thread(
    thread: ThreadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new thread"""
    new_thread = Thread(
        title=thread.title,
        user_id=current_user.id,
        model=thread.model
    )
    db.add(new_thread)
    await db.commit()
    await db.refresh(new_thread)
    
    return ThreadResponse.from_orm(new_thread)

@app.get("/api/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific thread with messages"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    import uuid
    
    result = await db.execute(
        select(Thread)
        .where(
            Thread.id == uuid.UUID(thread_id),
            Thread.user_id == current_user.id
        )
        .options(selectinload(Thread.messages))
    )
    thread = result.scalar_one_or_none()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    return ThreadResponse.from_orm(thread)

@app.post("/api/threads/{thread_id}/messages", response_model=MessageResponse)
async def add_message(
    thread_id: str,
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a message to a thread"""
    from sqlalchemy import select
    import uuid
    
    # Verify thread belongs to user
    result = await db.execute(
        select(Thread).where(
            Thread.id == uuid.UUID(thread_id),
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Create message
    new_message = Message(
        thread_id=uuid.UUID(thread_id),
        role=message.role,
        content=message.content
    )
    db.add(new_message)
    
    # Update thread's updated_at
    thread.updated_at = new_message.created_at
    
    await db.commit()
    await db.refresh(new_message)
    
    return MessageResponse.from_orm(new_message)

@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stream chat response"""
    from fastapi.responses import StreamingResponse
    from sqlalchemy import select
    import uuid
    import json
    
    # Verify thread belongs to user
    result = await db.execute(
        select(Thread).where(
            Thread.id == uuid.UUID(request.thread_id),
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Save user message
    user_message = Message(
        thread_id=uuid.UUID(request.thread_id),
        role="user",
        content=request.message
    )
    db.add(user_message)
    await db.commit()
    
    async def generate():
        try:
            # Get thread messages for context
            from sqlalchemy import select
            result = await db.execute(
                select(Message)
                .where(Message.thread_id == uuid.UUID(request.thread_id))
                .order_by(Message.created_at)
            )
            messages = result.scalars().all()
            
            # Stream response from OpenAI
            assistant_content = ""
            async for chunk in openai_service.stream_chat(
                messages=[{"role": m.role, "content": m.content} for m in messages],
                model=request.model or thread.model
            ):
                assistant_content += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # Save assistant message
            assistant_message = Message(
                thread_id=uuid.UUID(request.thread_id),
                role="assistant",
                content=assistant_content
            )
            db.add(assistant_message)
            thread.updated_at = assistant_message.created_at
            await db.commit()
            
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.error(f"Chat error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.delete("/api/threads/{thread_id}")
async def delete_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a thread"""
    from sqlalchemy import select, delete
    import uuid
    
    # Verify thread belongs to user
    result = await db.execute(
        select(Thread).where(
            Thread.id == uuid.UUID(thread_id),
            Thread.user_id == current_user.id
        )
    )
    thread = result.scalar_one_or_none()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Delete thread (messages will cascade)
    await db.execute(
        delete(Thread).where(Thread.id == uuid.UUID(thread_id))
    )
    await db.commit()
    
    return {"message": "Thread deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
