#!/bin/bash

# ChatGPT Clone Setup Script
echo "🚀 Setting up ChatGPT Clone..."

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed. Aborting." >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "PostgreSQL is required but not installed. Aborting." >&2; exit 1; }

# Setup frontend
echo "📦 Installing frontend dependencies..."
npm install

# Setup backend
echo "🐍 Setting up backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
echo "📦 Installing backend dependencies..."
pip install -r requirements.txt

# Create database if it doesn't exist
echo "🗄️ Setting up database..."
createdb chatgpt 2>/dev/null || echo "Database 'chatgpt' already exists"

# Copy environment template if .env doesn't exist
cd ..
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from template..."
    cp env.template .env
    echo "⚠️  Please edit .env file and add your API keys"
fi

if [ ! -f ".env.local" ]; then
    echo "📋 Creating .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
    echo "# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id" >> .env.local
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your OpenAI API key and other credentials"
echo "2. Run 'npm run dev:all' to start both frontend and backend"
echo "3. Visit http://localhost:3000"
