"""
Configuration for the LLM Council using Ollama models.
"""

# List of models to use in the council (must be available in your Ollama installation)
# Note: Gemma models require a tag (e.g., gemma:2b or gemma:7b)
COUNCIL_MODELS = [
    "llama3.2",
    "mistral",
    "qwen2.5",
    "phi3",
    "gemma:2b",  # Use gemma:7b for the 7B model
    "deepseek-r1",
]

# The model that will act as the Chairman and produce the final response
CHAIRMAN_MODEL = "llama3.2"

# Ollama API endpoint (default is localhost:11434)
OLLAMA_BASE_URL = "http://localhost:11434"

# Timeout for API requests (in seconds)
REQUEST_TIMEOUT = 300

# Maximum number of models to run concurrently to prevent memory issues
MAX_CONCURRENT_MODELS = 2