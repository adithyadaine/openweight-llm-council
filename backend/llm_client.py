"""
Client for interacting with Groq API (OpenAI compatible).
"""

import httpx
import os
from typing import Optional, Dict, Any, List
from backend.config import GROQ_BASE_URL, REQUEST_TIMEOUT, GROQ_API_KEY


class LLMClient:
    """Client for making requests to Groq/OpenAI-compatible APIs."""
    
    def __init__(self, base_url: str = GROQ_BASE_URL, api_key: str = GROQ_API_KEY):
        self.base_url = base_url
        self.api_key = api_key
        if not self.api_key:
            # We allow init without key, but generate will fail or we can log a warning
            print("WARNING: GROQ_API_KEY not found in environment variables.")
            
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=REQUEST_TIMEOUT
        )
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        stream: bool = False,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Generate a response and return content + usage metadata.
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        import time
        start_time = time.time()
        
        try:
            response = await self.client.post("/chat/completions", json=payload)
            response.raise_for_status()
            data = response.json()
            latency = time.time() - start_time
            
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            
            # Enrich usage with calculated stats if Groq provides x_groq key
            # Groq typically provides 'queue_time', 'prompt_time', 'completion_time' in usage or x_groq
            # We'll just pass the raw usage for now, plus our latency measurement.
            
            return {
                "content": content,
                "usage": usage,
                "latency": latency,
                "model": data.get("model", model) # Return actual model ID used
            }
            
        except httpx.HTTPStatusError as e:
            error_detail = f"HTTP {e.response.status_code}"
            try:
                error_body = e.response.json()
                if "error" in error_body:
                    error_detail += f": {error_body['error']}"
            except:
                error_detail += f": {e.response.text[:200]}"
            raise Exception(f"Error calling API: {error_detail}")
        except Exception as e:
            raise Exception(f"Error calling API: {str(e)}")
    
    async def check_model_available(self, model: str) -> bool:
        """Check if a model is available (via /models endpoint)."""
        # For cloud APIs, this is less critical to check strictly, but we can try.
        # DeepSeek/Groq usually have a /models endpoint.
        try:
            response = await self.client.get("/models")
            if response.status_code == 200:
                data = response.json()
                # data['data'] is usually the list for OpenAI style
                models = [m["id"] for m in data.get("data", [])]
                return model in models
            return True # Fallback to assume yes if endpoint fails or is different
        except:
            return True # optimistically assume yes
    
    async def list_available_models(self) -> List[str]:
        """List all available models."""
        try:
            response = await self.client.get("/models")
            if response.status_code == 200:
                data = response.json()
                return [m["id"] for m in data.get("data", [])]
        except:
            pass
        return []

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
