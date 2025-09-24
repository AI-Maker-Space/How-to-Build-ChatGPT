"""
Pydantic schemas for API request/response models
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

class ModelType(str, Enum):
    GPT_5 = "gpt-5"
    GPT_4_1_MINI = "gpt-4.1-mini"
    GPT_4_1_NANO = "gpt-4.1-nano"

class GoogleAuthRequest(BaseModel):
    token: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    access_token: str

class ThreadCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    model: ModelType = ModelType.GPT_4_1_MINI

class MessageBase(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: str
    thread_id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            thread_id=str(obj.thread_id),
            role=obj.role,
            content=obj.content,
            created_at=obj.created_at
        )

class ThreadResponse(BaseModel):
    id: str
    title: str
    model: ModelType
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            title=obj.title,
            model=obj.model,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            messages=[MessageResponse.from_orm(m) for m in obj.messages]
        )

class ChatRequest(BaseModel):
    thread_id: str
    message: str = Field(..., min_length=1)
    model: Optional[ModelType] = None

class ChatResponse(BaseModel):
    content: Optional[str] = None
    done: Optional[bool] = None
    error: Optional[str] = None
