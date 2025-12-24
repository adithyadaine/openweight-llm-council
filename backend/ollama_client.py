"""
Client for interacting with Ollama API.
"""

import httpx
from typing import Optional, Dict, Any
from backend.config import OLLAMA_BASE_URL, REQUEST_TIMEOUT


class OllamaClient:
    """Client for making requests to Ollama API."""
    
    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        stream: bool = False
    ) -> str:
        """
        Generate a response from an Ollama model.
        
        Args:
            model: Name of the model to use
            prompt: The user prompt
            system: Optional system message
            stream: Whether to stream the response (not implemented for now)
        
        Returns:
            The generated response text
        """
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
        }
        
        if system:
            payload["system"] = system
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
        except httpx.HTTPStatusError as e:
            error_detail = f"HTTP {e.response.status_code}"
            try:
                error_body = e.response.json()
                if "error" in error_body:
                    error_detail += f": {error_body['error']}"
            except:
                error_detail += f": {e.response.text[:200]}"
            raise Exception(f"Error calling Ollama API: {error_detail}. Model '{model}' may not be installed. Try: ollama pull {model}")
        except httpx.HTTPError as e:
            raise Exception(f"Error calling Ollama API: {e}")
    
    async def check_model_available(self, model: str) -> bool:
        """Check if a model is available in Ollama."""
        try:
            url = f"{self.base_url}/api/tags"
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            # Ollama model names might have tags like "llama3.2:latest" or "gemma:2b"
            # Check if the model name matches (with or without tag)
            # Try exact match first, then prefix match
            if model in models:
                return True
            # Check if any model starts with the name (e.g., "gemma" matches "gemma:2b")
            return any(m.startswith(model + ":") or model == m.split(":")[0] for m in models)
        except Exception:
            return False
    
    async def list_available_models(self) -> list:
        """List all available models in Ollama."""
        try:
            url = f"{self.base_url}/api/tags"
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

