#!/bin/bash

# Setup script for ChatGPT with Deep Research using uv
echo "🚀 Setting up ChatGPT with Deep Research using uv..."
echo "=================================================="

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
    echo "✅ uv installed successfully"
else
    echo "✅ uv is already installed"
fi

# Backend setup
echo ""
echo "🔧 Setting up backend..."
cd api

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating Python 3.9 virtual environment..."
    uv venv --python 3.9
    echo "✅ Virtual environment created with Python 3.9"
fi

# Install Python dependencies
echo "Installing backend dependencies..."
uv pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Install optional Agents SDK
echo "Installing Agents SDK for research features..."
uv pip install agents || echo "⚠️ Agents SDK installation failed (optional)"

cd ..

# Frontend setup
echo ""
echo "🎨 Setting up frontend..."
cd frontend

# Install Node dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "✅ Frontend dependencies already installed"
fi

cd ..

echo ""
echo "=================================================="
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  ./start.sh"
echo ""
echo "Or manually:"
echo "  Backend:  cd api && uv run python app.py"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Access the application at http://localhost:3000"
echo "==================================================
