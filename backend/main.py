"""
Main FastAPI application for LLM Council.
"""

import json
import asyncio
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import COUNCIL_MODELS, CHAIRMAN_MODEL, MAX_CONCURRENT_MODELS
from backend.ollama_client import OllamaClient

app = FastAPI(title="LLM Council")

# CORS middleware to allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create data directory if it doesn't exist
DATA_DIR = Path("data/conversations")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Initialize Ollama client
ollama_client = OllamaClient()


class QueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None


class Response(BaseModel):
    conversation_id: str
    stage1_responses: Dict[str, str]
    stage2_reviews: Dict[str, Dict[str, Any]]
    stage3_final_response: str
    stage3_most_valuable_models: Optional[str] = None
    duration_seconds: Optional[float] = None
    timestamp: str


@app.on_event("startup")
async def startup():
    """Check that required models are available."""
    print("Checking Ollama models...")
    available_models = await ollama_client.list_available_models()
    if available_models:
        print(f"Available models: {', '.join(available_models)}")
    
    for model in COUNCIL_MODELS + [CHAIRMAN_MODEL]:
        available = await ollama_client.check_model_available(model)
        if not available:
            # Try to find similar model names
            similar = [m for m in available_models if model.lower() in m.lower() or m.lower().startswith(model.lower())]
            if similar:
                print(f"Warning: Model '{model}' not found, but similar models available: {', '.join(similar)}")
            else:
                print(f"Warning: Model '{model}' may not be available. Make sure it's installed with: ollama pull {model}")
    print("Startup complete.")


@app.on_event("shutdown")
async def shutdown():
    """Clean up resources."""
    await ollama_client.close()


async def generate_stage1_responses(query: str) -> Dict[str, str]:
    """Stage 1: Get initial responses from all council models."""
    print(f"Stage 1: Getting responses from {len(COUNCIL_MODELS)} models...")
    
    system_prompt = "You are a helpful assistant. Provide thoughtful, accurate, and insightful responses."
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_MODELS)
    
    async def fetch_response(model):
        async with semaphore:
            try:
                response = await ollama_client.generate(
                    model=model,
                    prompt=query,
                    system=system_prompt
                )
                print(f"  ✓ {model} completed")
                return model, response
            except Exception as e:
                print(f"  ✗ {model} failed: {e}")
                return model, f"Error: {str(e)}"

    tasks = [fetch_response(model) for model in COUNCIL_MODELS]
    results = await asyncio.gather(*tasks)
    
    return dict(results)


async def generate_stage2_reviews(
    query: str,
    stage1_responses: Dict[str, str]
) -> Dict[str, Dict[str, Any]]:
    """Stage 2: Each model reviews and ranks other models' responses."""
    print(f"Stage 2: Getting reviews from {len(COUNCIL_MODELS)} models...")
    
    # Anonymize responses by assigning them letters
    anonymized = {}
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for i, (model, response) in enumerate(stage1_responses.items()):
        anonymized[letters[i]] = response
    
    # Create a prompt for reviewing
    responses_text = "\n\n".join([
        f"Response {letter}:\n{response}"
        for letter, response in anonymized.items()
    ])
    
    review_prompt = f"""You are evaluating multiple responses to the following question:

Question: {query}

Here are the responses (anonymized):

{responses_text}

Please:
1. Rank these responses from best to worst (1 = best)
2. Provide a brief explanation for your ranking
3. Note any strengths or weaknesses in each response

Format your response as:
Ranking: [Letter] (1st), [Letter] (2nd), [Letter] (3rd), etc.
Explanation: [Your explanation]"""

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_MODELS)

    async def fetch_review(model):
        async with semaphore:
            try:
                review_text = await ollama_client.generate(
                    model=model,
                    prompt=review_prompt,
                    system="You are an expert evaluator of AI responses."
                )
                print(f"  ✓ {model} review completed")
                return model, {
                    "review_text": review_text,
                    "raw": review_text
                }
            except Exception as e:
                print(f"  ✗ {model} review failed: {e}")
                return model, {
                    "review_text": f"Error: {str(e)}",
                    "raw": ""
                }

    tasks = [fetch_review(model) for model in COUNCIL_MODELS]
    results = await asyncio.gather(*tasks)
    
    return dict(results)


async def generate_stage3_final_response(
    query: str,
    stage1_responses: Dict[str, str],
    stage2_reviews: Dict[str, Dict[str, Any]]
) -> Tuple[str, str]:
    """
    Stage 3: Chairman compiles all responses into a final answer.
    Returns: (final_response, most_valuable_models)
    """
    print(f"Stage 3: Chairman ({CHAIRMAN_MODEL}) compiling final response...")
    
    # Compile all responses and reviews
    responses_text = "\n\n".join([
        f"Response from {model}:\n{response}"
        for model, response in stage1_responses.items()
    ])
    
    reviews_text = "\n\n".join([
        f"Review from {model}:\n{review['review_text']}"
        for model, review in stage2_reviews.items()
    ])
    
    model_list = ", ".join(stage1_responses.keys())
    
    chairman_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a question, and other models have reviewed those responses.

Original Question: {query}

Individual Responses:
{responses_text}

Reviews and Rankings:
{reviews_text}

Your task is to:
1. Synthesize all of this information into a single, comprehensive, and well-reasoned final answer
2. Explicitly identify which model(s) you found most valuable and why

Consider:
- The insights from all individual responses
- The evaluations and rankings from the reviews
- Any consensus or disagreements among the models
- The most accurate and helpful information

IMPORTANT: You MUST format your response EXACTLY as follows:

[Your synthesized final answer here - this should be comprehensive and incorporate the best insights from all models]

---

**Most Valuable Models:**

[Identify 1-3 models from this list: {model_list}]
[Explain which model(s) provided the most valuable insights and why. Be specific about what made their contributions stand out.]

Provide a final response that represents the best synthesis of the council's collective wisdom, while being transparent about which models contributed most. Make sure to include the "Most Valuable Models" section at the end with the exact heading shown above."""

    try:
        full_response = await ollama_client.generate(
            model=CHAIRMAN_MODEL,
            prompt=chairman_prompt,
            system="You are the Chairman of an LLM Council, responsible for synthesizing multiple AI responses into a final, comprehensive answer while identifying the most valuable contributions."
        )
        print(f"  ✓ Chairman completed")
        
        # Parse the response to extract most valuable models and separate from main response
        most_valuable = None
        final_response_text = full_response
        
        # Try multiple patterns to find the "Most Valuable Models" section
        patterns = [
            "**Most Valuable Models:**",
            "Most Valuable Models:",
            "**Most Valuable Model:**",
            "Most Valuable Model:",
            "**Valuable Models:**",
            "Valuable Models:",
        ]
        
        for pattern in patterns:
            if pattern in full_response:
                parts = full_response.split(pattern, 1)
                if len(parts) > 1:
                    # Extract the most valuable section
                    most_valuable = parts[1].strip()
                    # The main response is everything before the pattern
                    final_response_text = parts[0].strip()
                    
                    # Clean up the most valuable section
                    # Remove any leading separator lines
                    if most_valuable.startswith("---"):
                        lines = most_valuable.split("\n")
                        most_valuable = "\n".join(lines[1:]).strip()
                    # Remove trailing separators
                    most_valuable = most_valuable.split("---")[0].strip()
                    most_valuable = most_valuable.split("***")[0].strip()
                    
                    # If it's too short, might not be valid
                    if len(most_valuable) < 10:
                        most_valuable = None
                        final_response_text = full_response
                    break
        
        # If we found and extracted the section, use the separated response
        if most_valuable:
            # Clean up the final response - remove trailing separators
            final_response_text = final_response_text.rstrip("---").rstrip("***").rstrip("===").strip()
        
        # If still not found, try to extract from common separators
        if not most_valuable:
            separators = ["---", "***", "==="]
            for sep in separators:
                if sep in full_response:
                    parts = full_response.split(sep)
                    if len(parts) >= 2:
                        # Check if the last part mentions models
                        last_part = parts[-1].strip()
                        if any(model in last_part for model in stage1_responses.keys()):
                            # Check if it looks like a "most valuable" section
                            if any(word in last_part.lower() for word in ["valuable", "best", "excellent", "insightful", "model"]):
                                most_valuable = last_part
                                final_response_text = sep.join(parts[:-1]).strip()
                                break
        
        # If still nothing, try to find model mentions in the response
        if not most_valuable:
            model_mentions = []
            for model in stage1_responses.keys():
                # Look for mentions of the model in context of being valuable/best
                model_lower = model.lower()
                if model_lower in full_response.lower():
                    # Check if it's in a positive context near keywords
                    model_idx = full_response.lower().find(model_lower)
                    if model_idx > 0:
                        context_start = max(0, model_idx - 150)
                        context_end = min(len(full_response), model_idx + 150)
                        context = full_response[context_start:context_end].lower()
                        valuable_keywords = ["valuable", "best", "excellent", "strong", "insightful", "helpful", "accurate", "comprehensive", "detailed"]
                        if any(keyword in context for keyword in valuable_keywords):
                            model_mentions.append(model)
            
            if model_mentions:
                most_valuable = f"The following models provided particularly valuable insights: **{', '.join(model_mentions)}**.\n\nPlease review the individual model responses and reviews above to see detailed analysis of their contributions."
        
        # Final fallback
        if not most_valuable:
            most_valuable = "The Chairman's analysis integrates insights from all models. Review the individual responses and reviews in the tabs above to see which models contributed most to different aspects of the answer."
        
        return final_response_text, most_valuable
    except Exception as e:
        print(f"  ✗ Chairman failed: {e}")
        return f"Error generating final response: {str(e)}", "Error"


@app.post("/api/query", response_model=Response)
async def process_query(request: QueryRequest):
    """Process a query through all three stages."""
    conversation_id = request.conversation_id or datetime.now().strftime("%Y%m%d_%H%M%S")
    start_time = time.time()
    
    try:
        # Stage 1: Get initial responses
        stage1_responses = await generate_stage1_responses(request.query)
        
        # Stage 2: Get reviews
        stage2_reviews = await generate_stage2_reviews(request.query, stage1_responses)
        
        # Stage 3: Get final response from chairman
        stage3_final_response, stage3_most_valuable = await generate_stage3_final_response(
            request.query,
            stage1_responses,
            stage2_reviews
        )
        
        duration = time.time() - start_time
        
        # Create response object
        response_data = {
            "conversation_id": conversation_id,
            "stage1_responses": stage1_responses,
            "stage2_reviews": stage2_reviews,
            "stage3_final_response": stage3_final_response,
            "stage3_most_valuable_models": stage3_most_valuable,
            "duration_seconds": round(duration, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        # Save to file
        file_path = DATA_DIR / f"{conversation_id}.json"
        with open(file_path, "w") as f:
            json.dump({
                "query": request.query,
                **response_data
            }, f, indent=2)
        
        return Response(**response_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations")
async def list_conversations():
    """List all saved conversations."""
    conversations = []
    for file_path in DATA_DIR.glob("*.json"):
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                conversations.append({
                    "id": file_path.stem,
                    "query": data.get("query", ""),
                    "timestamp": data.get("timestamp", "")
                })
        except Exception:
            continue
    
    return sorted(conversations, key=lambda x: x["timestamp"], reverse=True)


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation."""
    file_path = DATA_DIR / f"{conversation_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    with open(file_path, "r") as f:
        return json.load(f)


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a specific conversation."""
    file_path = DATA_DIR / f"{conversation_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    try:
        file_path.unlink()
        return {"status": "success", "message": "Conversation deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "LLM Council API", "version": "0.1.0"}


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "ollama_url": ollama_client.base_url}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

