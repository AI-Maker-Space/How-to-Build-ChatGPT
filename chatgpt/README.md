# ChatGPT Clone

A performant ChatGPT-like application with thread persistence, Google authentication, and model selection capabilities.

## Features

- 🤖 **Multiple AI Models**: Choose between GPT-5, GPT-4.1 Mini, and GPT-4.1 Nano
- 💬 **Thread Persistence**: All conversations are saved and can be resumed
- 🔐 **Google Authentication**: Secure login with Google OAuth
- ⚡ **Real-time Streaming**: See AI responses as they're generated
- 🎨 **Beautiful UI**: Clean, modern interface similar to ChatGPT
- 🚀 **Vercel Ready**: Optimized for deployment on Vercel
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile

## Tech Stack

### Frontend
- **Next.js 15** with TypeScript
- **React 19** with Hooks
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Markdown** for message rendering
- **Google OAuth** for authentication

### Backend
- **FastAPI** for high-performance API
- **SQLAlchemy** with async support
- **PostgreSQL** for data persistence
- **OpenAI API** with new Responses API
- **Server-Sent Events** for streaming

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL database
- OpenAI API key
- Google OAuth credentials (optional)

### Environment Configuration

1. Copy the environment template:
```bash
cp env.template .env
```

2. Configure the following environment variables:

#### Backend (.env in /backend)
```env
# Required
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/chatgpt
SECRET_KEY=generate-a-secure-secret-key

# Optional (for production)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
FRONTEND_URL=https://your-frontend-url.vercel.app
```

#### Frontend (.env.local)
```env
# Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional (for Google Auth)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Local Development

#### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database (ensure PostgreSQL is running)
createdb chatgpt

# Run backend server
uvicorn app:app --reload --port 8000
```

#### 2. Setup Frontend

```bash
cd ..  # Return to chatgpt directory

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000 to use the application.

### Database Setup

The application uses PostgreSQL for data persistence. Tables are automatically created on first run.

For production, use a managed PostgreSQL service like:
- Vercel Postgres
- Supabase
- Neon
- Railway

## Deployment

### Deploy to Vercel

#### Frontend Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID

#### Backend Deployment

The backend can be deployed separately to:

1. **Vercel Functions** (serverless)
2. **Railway** (recommended for WebSocket support)
3. **Render**
4. **DigitalOcean App Platform**

Example for Railway:
```bash
cd backend
railway login
railway init
railway add
railway up
```

### Production Considerations

1. **Database**: Use a production PostgreSQL instance
2. **Secrets**: Store sensitive keys in environment variables
3. **CORS**: Update allowed origins in backend
4. **SSL**: Ensure HTTPS is enabled
5. **Rate Limiting**: Consider adding rate limits
6. **Monitoring**: Add error tracking (Sentry, etc.)

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login

### Threads
- `GET /api/threads` - Get all user threads
- `POST /api/threads` - Create new thread
- `GET /api/threads/{id}` - Get thread with messages
- `DELETE /api/threads/{id}` - Delete thread

### Messages
- `POST /api/threads/{id}/messages` - Add message to thread
- `POST /api/chat` - Stream chat response (SSE)

## Models Configuration

The application supports three AI models:

- **GPT-5**: Most capable model (mapped to gpt-4-turbo-preview)
- **GPT-4.1 Mini**: Balanced performance (mapped to gpt-4o-mini)
- **GPT-4.1 Nano**: Fast and efficient (mapped to gpt-3.5-turbo)

Models use the OpenAI Responses API when available, with automatic fallback to standard completions.

## Development Tips

### Hot Reload
Both frontend and backend support hot reload in development mode.

### Database Migrations
For production, consider using Alembic for database migrations:
```bash
cd backend
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Testing
```bash
# Frontend tests
npm test

# Backend tests
cd backend
pytest
```

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure PostgreSQL is running and DATABASE_URL is correct
2. **CORS errors**: Check FRONTEND_URL in backend environment
3. **Auth issues**: Verify Google Client ID matches in frontend and backend
4. **OpenAI errors**: Check API key and rate limits

### Debug Mode

Enable debug logging:
```bash
# Backend
DEBUG=true uvicorn app:app --reload

# Frontend
npm run dev -- --debug
```

## License

MIT

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Support

For issues and questions, please open a GitHub issue or contact support.

---

Built with ❤️ using the OpenAI Responses API