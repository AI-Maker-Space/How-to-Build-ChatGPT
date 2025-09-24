# Deployment Guide

## Overview
This application features a ChatGPT-like interface powered by the OpenAI Responses API with file upload and research capabilities.

## Features
- **OpenAI Responses API** integration for improved reasoning and response generation
- **ChatGPT-style UI** with modern, clean design
- **File Upload** support with multimodal capabilities
- **Research Toggle** for enhanced responses using OpenAI Agents SDK
- **Real-time Streaming** responses

## Local Development

### Backend Setup
1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Optional: Install OpenAI Agents SDK for enhanced research:
```bash
pip install agents
```

3. Run the backend server:
```bash
cd api
python app.py
```
The backend will be available at `http://localhost:8000`

### Frontend Setup
1. Install Node dependencies:
```bash
cd frontend
npm install
```

2. Create `.env.local` file:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

3. Run the development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Environment Variables
Set the following in your Vercel project settings:

For Frontend:
- `NEXT_PUBLIC_BACKEND_URL` - Leave empty for production (uses relative URLs)

### Deployment Steps
1. Push code to GitHub:
```bash
git add .
git commit -m "Deploy ChatGPT-like interface with Responses API"
git push origin main
```

2. Vercel will automatically deploy from your GitHub repository

3. The application will be available at your Vercel URL

## API Endpoints

### Main Endpoints
- `POST /api/chat` - Main chat endpoint using Responses API
  - Supports file attachments
  - Research toggle
  - Reasoning effort control

- `POST /api/research` - Dedicated research endpoint
  - Light, medium, or deep research depth
  - Web search capabilities

- `POST /api/upload-file` - File upload endpoint
  - Supports text and image files
  - Returns file ID for chat integration

- `GET /api/files` - List uploaded files
- `DELETE /api/files/{file_id}` - Delete uploaded file
- `GET /api/health` - Health check endpoint

## Usage

### API Key Setup
1. On first visit, you'll be prompted to enter your OpenAI API key
2. The key is stored locally in browser localStorage
3. Never sent to our servers

### Chat Features
1. **Basic Chat**: Simply type your message and press Enter
2. **Research Mode**: Click the search icon to enable research for enhanced responses
3. **File Upload**: Click the paperclip icon to attach files
   - Supports multiple files
   - Files are considered in the response context
4. **Streaming Responses**: Responses stream in real-time

## Architecture

### Backend (FastAPI)
- Uses OpenAI Responses API for improved reasoning
- Fallback to Chat Completions API if needed
- Optional Agents SDK integration for research
- In-memory file storage (use persistent storage in production)

### Frontend (Next.js)
- React-based ChatGPT-like interface
- Real-time streaming response handling
- Local API key storage
- Responsive design

## Model Configuration
- Default model: `gpt-5` (Responses API)
- Fallback model: `gpt-4o-mini` (Chat Completions)
- Reasoning effort: Configurable (low/medium/high)

## Security Notes
- API keys are stored in browser localStorage
- Use HTTPS in production
- Consider implementing rate limiting
- Add authentication for production use

## Troubleshooting

### Common Issues
1. **"gpt-5 not found"**: The Responses API may not be available in your region/account. The app will fallback to standard chat completions.

2. **Research not working**: Install the `agents` package:
```bash
pip install agents
```

3. **CORS errors**: Ensure the backend URL is correctly configured in the frontend environment

4. **File upload issues**: Check file size limits and supported formats

## Future Enhancements
- Persistent file storage (S3, etc.)
- User authentication
- Conversation history
- Export conversations
- Advanced file processing (PDFs, documents)
- Voice input/output
- Code syntax highlighting
