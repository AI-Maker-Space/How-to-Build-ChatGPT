"""
OpenAI service using the new Responses API
"""
import os
import json
from typing import List, Dict, AsyncGenerator
from openai import AsyncOpenAI
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4.1-mini"
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response using OpenAI's Responses API
        """
        try:
            # Format messages for the Responses API
            # Combine all messages into a conversation string
            conversation = "\n\n".join([
                f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
                for msg in messages
            ])
            
            # Use the Responses API with streaming
            response = await self.client.responses.create(
                model=model,
                input=conversation,
                reasoning={"effort": "medium"},  # Adjust reasoning effort based on model
                stream=True
            )
            
            # Stream the response chunks
            async for chunk in response:
                if hasattr(chunk, 'output_text_delta'):
                    yield chunk.output_text_delta
                elif hasattr(chunk, 'output_text'):
                    yield chunk.output_text
                    
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            # Fallback to traditional chat completions if Responses API fails
            try:
                response = await self.client.chat.completions.create(
                    model=self._map_model(model),
                    messages=[{"role": m["role"], "content": m["content"]} for m in messages],
                    stream=True
                )
                
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as fallback_error:
                logger.error(f"Fallback API error: {fallback_error}")
                yield f"Error: {str(fallback_error)}"
    
    def _map_model(self, model: str) -> str:
        """Map custom model names to actual OpenAI model names"""
        model_mapping = {
            "gpt-5": "gpt-4-turbo-preview",  # Using gpt-4-turbo as placeholder for gpt-5
            "gpt-4.1-mini": "gpt-4o-mini",
            "gpt-4.1-nano": "gpt-3.5-turbo"  # Using gpt-3.5-turbo as placeholder for nano
        }
        return model_mapping.get(model, model)
