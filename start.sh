#!/bin/bash

# Start script for LLM Council

echo "Starting LLM Council..."

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    set -a
    source .env
    set +a
fi



# Determine Python command
PYTHON_CMD=""
if command -v uv &> /dev/null; then
    echo "Using uv..."
    PYTHON_CMD="uv run python"
elif [ -d "venv" ]; then
    echo "Using virtual environment..."
    PYTHON_CMD="venv/bin/python"
else
    echo "Using system python (make sure dependencies are installed)..."
    PYTHON_CMD="python"
fi

# Test backend imports before starting
echo "Testing backend setup..."
if ! $PYTHON_CMD -c "from backend.config import COUNCIL_MODELS" 2>/dev/null; then
    echo "Error: Cannot import backend modules."
    echo "Make sure you're in the project root directory."
    echo "If using venv, make sure dependencies are installed: pip install -r requirements.txt"
    exit 1
fi

# Start backend in background
echo "Starting backend..."
$PYTHON_CMD -m backend.main > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Error: Backend failed to start. Check backend.log for details:"
    cat backend.log
    exit 1
fi

# Check if backend is responding
if ! curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "Warning: Backend started but not responding. Check backend.log"
    echo "You can check the log with: tail -f backend.log"
fi

# Start frontend
echo "Starting frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

cd ..

echo ""
echo "✓ Backend running on http://localhost:8000 (PID: $BACKEND_PID)"
echo "✓ Frontend running on http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "Logs:"
echo "  Backend: tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

