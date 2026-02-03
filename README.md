# LLM Council - Open Weight Models

A web application that queries multiple LLMs simultaneously and synthesizes their responses into a unified consensus. Uses the Groq API for fast inference on open-weight models.

## How It Works

When you submit a query, the system goes through three stages:

1. **Stage 1: First Opinions** - Your query is sent to multiple LLMs individually, and their responses are collected. You can view each response in a tabbed interface.

2. **Stage 2: Review** - Each LLM reviews and ranks the responses from the other LLMs (anonymized so they can't play favorites). This provides cross-evaluation of the responses.

3. **Stage 3: Final Response** - A designated "Chairman" LLM synthesizes all the individual responses and reviews into a single, comprehensive final answer.

## Prerequisites

- **Groq API Key** - Get one free at [console.groq.com/keys](https://console.groq.com/keys)
- **Python 3.10+**
- **Node.js 18+** and npm
- **uv** (optional, recommended) - install with: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - If you don't have `uv`, you can use standard Python `pip` and `venv` instead

## Setup

### 1. Configure API Key

Create a `.env` file in the project root (or copy from `.env.example` if available):

```bash
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Configure Models (Optional)

Edit `backend/config.py` to customize which models are in your council:

```python
COUNCIL_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    # Add or remove models as needed
]

CHAIRMAN_MODEL = "llama-3.3-70b-versatile"  # Model that synthesizes final response
```

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

1. Start the application using one of the methods above
2. Enter your question in the text area
3. Click "Submit to Council" (or press Enter)
4. Watch as the system processes through all three stages
5. View individual responses, reviews, and the final synthesized answer using the tabs

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), async httpx, Groq API
- **Frontend:** React + Vite, react-markdown for rendering
- **Storage:** JSON files in `data/conversations/`
- **Package Management:** uv or pip/venv for Python, npm for JavaScript

## Customization

- **Models:** Edit `backend/config.py` to change which models are used
- **API Configuration:** Update `GROQ_BASE_URL` in `backend/config.py` if using a different OpenAI-compatible endpoint
- **UI:** Modify `frontend/src/App.jsx` and `frontend/src/index.css` to customize the interface

## Troubleshooting

### "GROQ_API_KEY not found" Warning

Make sure your `.env` file exists in the project root with your API key:
```bash
GROQ_API_KEY=gsk_your_key_here
```

### "Not Found" Error

If you're getting a `{"detail": "Not Found"}` error:

1. **Check if backend is running:**
   ```bash
   curl http://localhost:8000/api/health
   ```
   Should return: `{"status":"ok",...}`

2. **Check backend logs:**
   If using the start script, check `backend.log`:
   ```bash
   tail -f backend.log
   ```

3. **Start backend manually to see errors:**
   ```bash
   python -m backend.main
   ```

4. **Verify you're accessing the correct URL:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api/health
   - Backend docs: http://localhost:8000/docs

### Other Issues

- **API errors:** Verify your Groq API key is valid and has credits
- **Port conflicts:** Change ports in `backend/main.py` (uvicorn) and `frontend/vite.config.js`
- **Import errors:** Make sure you're running from the project root directory and dependencies are installed

## Notes

This implementation uses the Groq API for fast inference on open-weight models. All API calls are made to Groq's servers, so you'll need an internet connection and a valid API key.

Enjoy exploring multiple LLM perspectives on your questions!
