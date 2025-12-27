"""
Configuration for the LLM Council using Groq/OpenAI compatible models.
"""

import os

COUNCIL_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "moonshotai/kimi-k2-instruct",
    "qwen/qwen3-32b",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "openai/gpt-oss-120b",
]

# The model that will act as the Chairman and produce the final response
CHAIRMAN_MODEL = "llama-3.3-70b-versatile"

# Groq API Configuration
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# Timeout for API requests (in seconds)
REQUEST_TIMEOUT = 300

# Maximum number of models to run concurrently (Cloud handles this well, but let's keep it sane)
MAX_CONCURRENT_MODELS = 10