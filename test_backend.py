#!/usr/bin/env python3
"""
Quick test script to verify backend setup.
"""

import sys
import asyncio

async def test_imports():
    """Test if all imports work."""
    try:
        print("Testing imports...")
        from backend.config import COUNCIL_MODELS, CHAIRMAN_MODEL
        from backend.ollama_client import OllamaClient
        print(f"✓ Imports successful")
        print(f"  Council models: {COUNCIL_MODELS}")
        print(f"  Chairman model: {CHAIRMAN_MODEL}")
        return True
    except Exception as e:
        print(f"✗ Import error: {e}")
        return False

async def test_ollama_connection():
    """Test Ollama connection."""
    try:
        print("\nTesting Ollama connection...")
        from backend.ollama_client import OllamaClient
        client = OllamaClient()
        available = await client.check_model_available("llama3.2")
        print(f"✓ Ollama connection successful")
        print(f"  Model 'llama3.2' available: {available}")
        await client.close()
        return True
    except Exception as e:
        print(f"✗ Ollama connection error: {e}")
        print("  Make sure Ollama is running: ollama serve")
        return False

if __name__ == "__main__":
    print("LLM Council Backend Test\n")
    success = asyncio.run(test_imports())
    if success:
        asyncio.run(test_ollama_connection())
    sys.exit(0 if success else 1)

