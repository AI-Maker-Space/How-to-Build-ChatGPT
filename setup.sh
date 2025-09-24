#!/bin/bash

# Setup script for ChatGPT Clone with OpenAI Responses API

echo "==========================================="
echo "ChatGPT Clone Setup Script"
echo "==========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Backend setup
echo "Setting up backend..."
echo "--------------------"

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Optional: Try to install agents SDK
echo ""
echo "Attempting to install OpenAI Agents SDK (optional)..."
pip install agents 2>/dev/null || echo "⚠️  Agents SDK not available - research features will be limited"

echo ""
echo "✅ Backend setup complete"
echo ""

# Frontend setup
echo "Setting up frontend..."
echo "---------------------"

cd frontend

# Install Node dependencies
echo "Installing Node dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > .env.local
    echo "✅ Created .env.local with default backend URL"
else
    echo "ℹ️  .env.local already exists"
fi

cd ..

echo ""
echo "✅ Frontend setup complete"
echo ""

# Create test file if it doesn't exist
if [ ! -f test_document.txt ]; then
    echo "Creating test document..."
    cat > test_document.txt << 'EOF'
This is a test document for the OpenAI Responses API.
It contains sample content to test file upload functionality.

Key Features:
- File upload support
- Multi-modal processing
- Research integration
- Real-time streaming

This document can be used to verify that file uploads are working correctly.
EOF
    echo "✅ Created test_document.txt"
fi

echo ""
echo "==========================================="
echo "Setup Complete!"
echo "==========================================="
echo ""
echo "To start the application:"
echo ""
echo "1. Start the backend (in one terminal):"
echo "   cd api && python app.py"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Open your browser to http://localhost:3000"
echo ""
echo "4. Enter your OpenAI API key when prompted"
echo ""
echo "For deployment instructions, see DEPLOYMENT.md"
echo ""
echo "Happy coding! 🚀"
