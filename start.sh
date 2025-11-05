#!/bin/bash

# Deep Research ChatGPT Application Startup Script
echo "🚀 Starting ChatGPT with Deep Research..."
echo "============================================"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

# Function to start the backend
start_backend() {
    echo "🔧 Starting backend server..."
    cd api
    
    # Check if virtual environment exists
    if [ ! -d ".venv" ]; then
        echo "Creating Python 3.9 virtual environment with uv..."
        uv venv --python 3.9
    fi
    
    # Install dependencies with uv
    echo "Installing backend dependencies with uv..."
    uv pip install -r requirements.txt
    
    # Start the backend with uv
    uv run python app.py &
    BACKEND_PID=$!
    echo "✅ Backend started (PID: $BACKEND_PID)"
    cd ..
}

# Function to start the frontend
start_frontend() {
    echo "🎨 Starting frontend..."
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    # Start the frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend started (PID: $FRONTEND_PID)"
    cd ..
}

# Function to stop all services
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "Backend stopped"
    fi
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "Frontend stopped"
    fi
    
    # Kill any remaining processes on ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    
    echo "✅ All services stopped"
    exit 0
}

# Trap exit signals
trap cleanup EXIT INT TERM

# Start services
start_backend
sleep 3  # Wait for backend to initialize
start_frontend

echo ""
echo "============================================"
echo "✨ ChatGPT with Deep Research is running!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend API: http://localhost:8000"
echo "📍 API Health: http://localhost:8000/api/health"
echo ""
echo "🔑 Remember to add your OpenAI API key in the UI"
echo ""
echo "📚 Deep Research Features:"
echo "  - Click '🧪 Deep Research' button to access advanced research"
echo "  - Choose between O3 (deep) and O4-mini (quick) models"
echo "  - Enable web search, code interpreter, and more"
echo ""
echo "Press Ctrl+C to stop all services"
echo "============================================"

# Keep the script running
while true; do
    sleep 1
done
