<p align = "center" draggable="false" ><img src="https://github.com/AI-Maker-Space/LLM-Dev-101/assets/37101144/d1343317-fa2f-41e1-8af1-1dbb18399719" 
     width="200px"
     height="auto"/>
</p>

# ChatGPT Clone with OpenAI Responses API

A modern ChatGPT-like interface powered by the OpenAI Responses API, featuring file uploads, research capabilities, and a clean UI design.

## 🚀 Features

- **Deep Research Integration** - Powered by OpenAI's o3-deep-research and o4-mini-deep-research models
- **OpenAI Responses API Integration** - Leverages the latest OpenAI API for improved reasoning and response generation
- **ChatGPT-Style Interface** - Clean, modern UI that mirrors the ChatGPT experience
- **File Upload Support** - Upload and analyze multiple files (text, images, PDFs)
- **Research Mode** - Toggle research capabilities powered by OpenAI Agents SDK
- **Advanced Research Tools** - Web search, code interpreter, and file search
- **Real-time Streaming** - Responses stream in real-time for better user experience
- **Background Processing** - Long-running research tasks with status tracking
- **Vercel-Ready** - Configured for easy deployment to Vercel

## 📸 UI Preview

The interface includes:
- Clean chat interface similar to ChatGPT
- Deep Research panel with advanced configuration
- Research toggle button for enhanced responses
- "Add photos & files" button for multimodal inputs
- Real-time streaming responses
- File attachment display in chat
- Research status tracking and source citations

## 🛠️ Tech Stack

- **Backend**: FastAPI + Python with OpenAI SDK
- **Package Manager**: uv (fast Python package installer)
- **Frontend**: Next.js + React with Tailwind-inspired styling
- **Deployment**: Vercel-compatible configuration
- **APIs**: OpenAI Responses API, OpenAI Agents SDK (optional)

## 📋 Prerequisites

- Python 3.9+ (managed via uv)
- Node.js 16+
- OpenAI API Key
- Vercel account (for deployment)

## 🏃‍♂️ Quick Start

### 0. Quick Setup (Recommended)
```bash
# Run the automated setup script
./setup_uv.sh    # Linux/Mac
# or
setup_uv.bat     # Windows

# Then start the application
./start.sh       # Linux/Mac
# or
start.bat        # Windows
```

### Manual Setup

#### 1. Clone the repository
```bash
git clone <your-repo-url>
cd "OpenAI Responses API"
```

#### 2. Backend Setup
```bash
# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh  # Linux/Mac
# Or on Windows: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Create virtual environment and install dependencies
cd api
uv venv
uv pip install -r requirements.txt

# Optional: Install Agents SDK for research features
uv pip install agents

# Run the backend
uv run python app.py
```

#### 3. Frontend Setup
```bash
# Install Node dependencies
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > .env.local

# Run the frontend
npm run dev
```

#### 4. Access the application
Open your browser and navigate to `http://localhost:3000`

## 🌐 Deployment to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Deploy with one click - Vercel will automatically detect the configuration

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔑 API Endpoints

- `POST /api/chat` - Main chat endpoint with Responses API
- `POST /api/research` - Research endpoint with Agents SDK
- `POST /api/deep-research` - Start deep research task
- `GET /api/deep-research/{id}/status` - Check research status
- `POST /api/deep-research/clarify` - Get clarification questions
- `POST /api/deep-research/enrich` - Enrich research prompts
- `POST /api/upload-file` - File upload endpoint
- `GET /api/files` - List uploaded files
- `DELETE /api/files/{id}` - Delete a file
- `GET /health` - Lightweight health check for load balancers
- `GET /api/health` - Health check

## 📚 How to Build ChatGPT Series

Welcome to the "How to Build ChatGPT" series! This project is part of a comprehensive learning journey covering:

1. **​Prompting / OpenAI Responses API** ✅ (This project)
2. ​**RAG / Connectors & Data Sources** ✅
3. ​**Agents / Search** ✅
4. ​**End-to-End Application** ✅
5. ​**Reasoning / Thinking** ✅
6. ​**Deep Research** ✅ (This project - IMPLEMENTED!)
7. ​**Agent Mode**

​Each session builds upon the previous, teaching you to create production-ready LLM applications.

## 🧪 Testing

Run the test suite to verify your setup:

```bash
# Test basic functionality
uv run python test_api.py

# Test deep research features
uv run python test_deep_research.py
```

This will test:
- Health endpoint
- Basic chat functionality
- Research capabilities
- Deep research with o3/o4-mini models
- Clarification and enrichment
- File upload and processing
- Chat with file context

## 📖 Documentation

- [Deep Research Guide](./DEEP_RESEARCH_GUIDE.md) - Complete guide to deep research features
- [UV Package Manager Guide](./UV_GUIDE.md) - Guide to using UV for Python package management
- [Deployment Guide](./DEPLOYMENT.md) - Detailed deployment instructions
- [API Documentation](./api/README.md) - Backend API details
- [Frontend Documentation](./frontend/README.md) - Frontend architecture

## 🔑 API Notes

- API keys are stored in browser localStorage (client-side only)
- Never commit API keys to version control
- Use environment variables for sensitive data
- Enable CORS protection in production
- Consider adding rate limiting for production use

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is part of the AI Makerspace educational series.

## 🛣️ Join the Journey

Nearly three years after ChatGPT's release as the fastest-growing app ever, it has evolved from a simple LLM with a frontend to a comprehensive AI assistant. With GPT-5's recent release, we're following OpenAI's product journey to teach aspiring AI Engineers how to build, ship, and share production LLM applications.

​Join us for the entire journey at [AI Makerspace](https://github.com/AI-Maker-Space)!