# OpenAI Responses API Backend

A FastAPI service that provides ChatGPT-like functionality using the OpenAI Responses API, with support for file uploads, research capabilities, and streaming responses.

## 🚀 Features

- **OpenAI Responses API** - Leverages the latest API for improved reasoning
- **File Upload Support** - Handle text, images, and documents
- **Research Integration** - Optional OpenAI Agents SDK for enhanced responses
- **Streaming Responses** - Real-time response generation
- **Fallback Support** - Gracefully falls back to Chat Completions API if needed
- **CORS Enabled** - Ready for frontend integration

## 📋 Prerequisites

- Python 3.9+
- OpenAI API key
- Optional: OpenAI Agents SDK for research features

## 🛠️ Installation

### Basic Setup with UV
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh  # Linux/Mac
# Or on Windows: irm https://astral.sh/uv/install.ps1 | iex

# Create virtual environment and install dependencies
uv venv
uv pip install -r requirements.txt
```

### With Research Features (Optional)
```bash
# Install the Agents SDK for enhanced research
uv pip install agents
```

## 🏃 Running the API

### Start the server
```bash
uv run python app.py
```

The server will start on `http://localhost:8000`

### With hot reload (development)
```bash
uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation
Once running, interactive documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 📚 API Endpoints

### Core Chat Endpoint

#### `POST /api/chat`
Main chat endpoint using the Responses API with file and research support.

**Request Body:**
```json
{
  "user_message": "Your message here",
  "model": "gpt-5",              // Optional, defaults to gpt-5
  "api_key": "sk-...",          // Required
  "file_ids": ["file_123"],     // Optional, array of uploaded file IDs
  "use_research": false,         // Optional, enable research mode
  "reasoning_effort": "medium"   // Optional: low, medium, high
}
```

**Response:** Streaming text response

### Research Endpoint

#### `POST /api/research`
Dedicated research endpoint for in-depth information gathering.

**Request Body:**
```json
{
  "query": "Research topic",
  "api_key": "sk-...",
  "depth": "medium"  // Optional: light, medium, deep
}
```

**Response:**
```json
{
  "query": "Research topic",
  "findings": ["Finding 1", "Finding 2"],
  "sources": ["Source 1", "Source 2"],
  "summary": "Brief summary of findings"
}
```

### File Management

#### `POST /api/upload-file`
Upload files for use in chat conversations.

**Form Data:**
- `file`: File to upload (multipart/form-data)
- `api_key`: OpenAI API key

**Response:**
```json
{
  "message": "File uploaded successfully",
  "file_id": "file_abc123",
  "filename": "document.pdf",
  "file_type": "text",
  "size": 1024
}
```

#### `GET /api/files`
List all uploaded files.

**Response:**
```json
{
  "files": [
    {
      "id": "file_abc123",
      "name": "document.pdf",
      "type": "text",
      "size": 1024
    }
  ]
}
```

#### `DELETE /api/files/{file_id}`
Delete an uploaded file.

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

### Health Check

#### `GET /health`
Lightweight ping endpoint for uptime monitors and load balancers.

**Response:**
```json
{
  "status": "ok"
}
```

#### `GET /api/health`
Check API status and available features.

**Response:**
```json
{
  "status": "ok",
  "responses_api": "enabled",
  "research": "enabled",
  "deep_research": "enabled",
  "file_upload": "enabled",
  "vector_stores": "enabled",
  "active_vector_stores": 0,
  "uploaded_files": 0,
  "active_deep_research": 0
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root (optional):
```bash
# OpenAI API Key (can also be provided per request)
OPENAI_API_KEY=sk-...

# For Google Calendar integration (optional)
GOOGLE_CALENDAR_AUTHORIZATION=ya29...
```

### Model Configuration

The API uses the following models:
- **Primary**: `gpt-5` (Responses API)
- **Fallback**: `gpt-4o-mini` (Chat Completions API)
- **Research**: `gpt-5` with Agents SDK

### Reasoning Effort Levels

Control the reasoning depth:
- `low` - Quick, straightforward responses
- `medium` - Balanced reasoning (default)
- `high` - Deep, thorough analysis

## 📦 File Type Support

Supported file types:
- **Text**: `.txt`, `.md`, `.csv`
- **Images**: `.jpg`, `.png`, `.gif`, `.webp`
- **Documents**: `.pdf` (basic text extraction)
- **Code**: Various programming language files

## 🧪 Testing

Run the included test suite:
```bash
python test_api.py
```

This will test:
- Health endpoint
- Basic chat functionality
- File upload and processing
- Chat with file context
- Research capabilities

## 🚀 Deployment

### Vercel Deployment

The API is configured for Vercel deployment:

1. Ensure `vercel.json` is properly configured
2. Install Vercel CLI: `npm i -g vercel`
3. Deploy: `vercel --prod`

### Docker Deployment (Alternative)

Create a `Dockerfile`:
```dockerfile
FROM python:3.8-slim
WORKDIR /app
COPY requirements.txt .
# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

# Install dependencies with uv
RUN uv venv && uv pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t responses-api .
docker run -p 8000:8000 responses-api
```

## ⚠️ Important Notes

### API Key Management
- Never commit API keys to version control
- Use environment variables in production
- Consider implementing rate limiting

### Model Availability
- `gpt-5` model requires access to the Responses API
- Falls back to `gpt-4o-mini` if Responses API is unavailable
- Research features degrade gracefully without Agents SDK

### Storage
- Files are stored in memory (not persistent)
- For production, implement persistent storage (S3, database, etc.)
- Consider file size limits and cleanup policies

## 🐛 Troubleshooting

### Common Issues

1. **"Model gpt-5 not found"**
   - The Responses API may not be available in your account
   - The API will automatically fall back to Chat Completions

2. **Research not working**
   - Install the Agents SDK: `uv pip install agents`
   - Verify your API key has access to required features

3. **File upload errors**
   - Check file size (default memory storage has limits)
   - Verify file type is supported
   - Ensure proper multipart/form-data encoding

4. **CORS errors**
   - Verify frontend URL in CORS configuration
   - Check that backend URL is correctly set in frontend

## 📝 API Response Format

All endpoints follow consistent error handling:

**Success Response:**
- Status: 200 OK
- Body: JSON or streaming text

**Error Response:**
- Status: 400/404/500
- Body:
```json
{
  "detail": "Error description"
}
```

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows PEP 8 style guidelines
- Add tests for new features
- Update documentation
- Handle errors gracefully

## 📄 License

Part of the AI Makerspace educational series.