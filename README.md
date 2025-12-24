# LLM Council - Open Weight Models

A local implementation of the [LLM Council](https://github.com/karpathy/llm-council) concept using open-weight models via Ollama. Instead of using commercial LLM APIs, this version runs entirely locally using models you can download and run with Ollama.

## How It Works

When you submit a query, the system goes through three stages:

1. **Stage 1: First Opinions** - Your query is sent to multiple LLMs individually, and their responses are collected. You can view each response in a tabbed interface.

2. **Stage 2: Review** - Each LLM reviews and ranks the responses from the other LLMs (anonymized so they can't play favorites). This provides cross-evaluation of the responses.

3. **Stage 3: Final Response** - A designated "Chairman" LLM synthesizes all the individual responses and reviews into a single, comprehensive final answer.

## Prerequisites

- **Ollama** installed and running locally ([download here](https://ollama.ai))
- **Python 3.10+**
- **Node.js 18+** and npm
- **uv** (optional, recommended) - install with: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - If you don't have `uv`, you can use standard Python `pip` and `venv` instead

## Setup

### 1. Install Ollama Models

Make sure you have Ollama installed and running. Then pull the models you want to use:

```bash
# Example models (adjust based on what you want to use)
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
ollama pull phi3
```

You can check available models with:
```bash
ollama list
```

### 2. Configure Models

Edit `backend/config.py` to specify which models you want in your council:

```python
COUNCIL_MODELS = [
    "llama3.2",
    "mistral",
    "qwen2.5",
    "phi3",
]

CHAIRMAN_MODEL = "llama3.2"  # Model that synthesizes final response
```

Make sure all models listed are installed in Ollama.

### 3. Install Dependencies

**Backend (Option A - using uv):**
```bash
uv sync
```

**Backend (Option B - using pip and venv):**
```bash
# Create a virtual environment (recommended)
python -m venv venv

# Activate it (macOS/Linux)
source venv/bin/activate

# Or on Windows
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

## Running the Application

### Option 1: Use the Start Script (Recommended)

```bash
chmod +x start.sh
./start.sh
```

This will start both the backend and frontend servers.

### Option 2: Run Manually

**Terminal 1 (Backend):**

If using `uv`:
```bash
uv run python -m backend.main
```

If using `pip`/`venv`:
```bash
# Make sure your virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m backend.main
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. Make sure Ollama is running: `ollama serve` (if not already running)
2. Start the application using one of the methods above
3. Enter your question in the text area
4. Click "Submit to Council"
5. Watch as the system processes through all three stages
6. View individual responses, reviews, and the final synthesized answer using the tabs

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), async httpx, Ollama API
- **Frontend:** React + Vite, react-markdown for rendering
- **Storage:** JSON files in `data/conversations/`
- **Package Management:** uv or pip/venv for Python, npm for JavaScript

## Customization

- **Models:** Edit `backend/config.py` to change which models are used
- **Ollama URL:** If Ollama is running on a different host/port, update `OLLAMA_BASE_URL` in `backend/config.py`
- **UI:** Modify `frontend/src/App.jsx` and `frontend/src/App.css` to customize the interface

## Troubleshooting

### "Not Found" Error

If you're getting a `{"detail": "Not Found"}` error:

1. **Check if backend is running:**
   ```bash
   curl http://localhost:8000/api/health
   ```
   Should return: `{"status":"ok","ollama_url":"http://localhost:11434"}`

2. **Check backend logs:**
   If using the start script, check `backend.log`:
   ```bash
   tail -f backend.log
   ```

3. **Test backend setup:**
   ```bash
   python test_backend.py
   ```

4. **Start backend manually to see errors:**
   ```bash
   # Make sure you're in the project root
   python -m backend.main
   ```
   Or if using venv:
   ```bash
   source venv/bin/activate
   python -m backend.main
   ```

5. **Verify you're accessing the correct URL:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api/health
   - Backend docs: http://localhost:8000/docs

### Other Issues

- **"Model not found" errors:** Make sure you've pulled the models with `ollama pull <model-name>`
- **Connection errors:** Verify Ollama is running with `curl http://localhost:11434/api/tags`
- **Port conflicts:** Change ports in `backend/main.py` (uvicorn) and `frontend/vite.config.js`
- **Import errors:** Make sure you're running from the project root directory and dependencies are installed

## Notes

This is a local implementation that runs entirely on your machine. All processing happens locally, so:
- No API keys needed
- No data sent to external services
- Works offline (once models are downloaded)
- Performance depends on your hardware

Enjoy exploring multiple LLM perspectives on your questions!

