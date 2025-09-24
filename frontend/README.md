# 🎨 ChatGPT-Style Frontend

A modern ChatGPT-like interface built with **Next.js** and designed for the OpenAI Responses API.

## ✨ Features

- **ChatGPT-inspired UI** - Clean, minimal design that users will find familiar
- **File Upload Support** - Drag & drop or click to upload files for analysis
- **Research Toggle** - Enable AI-powered web research for enhanced responses
- **Real-time Streaming** - Responses stream in as they're generated
- **Responsive Design** - Works beautifully on desktop and mobile
- **API Key Management** - Secure local storage of OpenAI API keys

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment (optional)**
   
   Create a `.env.local` file for local development:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```
   
   For production/Vercel deployment, leave this empty to use relative URLs.

3. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Visit `http://localhost:3000` to see your ChatGPT clone!
   
   Make sure the FastAPI backend is running:
   ```bash
   cd ../api
   python app.py
   ```

## 🎯 UI Components

### Chat Interface
- Message bubbles with user/AI avatars
- Markdown rendering support
- Code syntax highlighting
- File attachment indicators

### Input Area
- Multi-line text input with auto-resize
- Integrated action buttons:
  - 🔍 **Research Toggle** - Enable/disable web research
  - 📎 **File Upload** - Attach files to messages
  - ➤ **Send Button** - Submit message

### API Key Modal
- First-time setup prompt
- Secure local storage
- Easy key management

## 🎨 Styling

The interface uses:
- System fonts for optimal performance
- Tailwind-inspired utility classes
- Smooth animations and transitions
- Light theme matching ChatGPT's design
- Responsive breakpoints for mobile support

## 📁 Project Structure

```
frontend/
├── pages/
│   ├── _app.js       # Next.js app wrapper
│   └── index.js      # Main chat interface
├── styles/
│   └── globals.css   # Global styles (if needed)
├── package.json      # Dependencies
└── next.config.js    # Next.js configuration
```

## 🔧 Configuration

### Environment Variables
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (default: relative URLs in production)

### Supported File Types
- Text files (.txt, .md, .csv)
- Images (.jpg, .png, .gif, .webp)
- Documents (.pdf)
- Code files (various extensions)

## 🚢 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "ChatGPT-like frontend"
   git push
   ```

2. **Connect to Vercel**
   - Import your GitHub repository
   - Vercel will auto-detect Next.js
   - Deploy with one click!

3. **Environment Setup**
   - No frontend env vars needed for production
   - Backend URL uses relative paths automatically

### Manual Deployment

Build for production:
```bash
npm run build
npm start
```

Or deploy with Vercel CLI:
```bash
vercel --prod
```

## 🛠️ Customization

### Changing the Theme
Edit the color scheme in `index.js`:
- Background colors
- Text colors
- Button styles
- Avatar colors

### Adding Features
The modular structure makes it easy to add:
- Conversation history
- Export functionality
- Voice input
- Theme switcher
- User preferences

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Verify backend is running on port 8000
   - Check CORS settings in backend
   - Ensure API key is valid

2. **File Upload Not Working**
   - Check file size (limit: 10MB default)
   - Verify file type is supported
   - Ensure backend has write permissions

3. **Streaming Not Working**
   - Check browser console for errors
   - Verify WebSocket support
   - Try refreshing the page

## 📚 Tech Stack

- **Next.js 14.2** - React framework
- **React 18.2** - UI library
- **CSS-in-JS** - Styled JSX for component styles
- **Fetch API** - HTTP requests with streaming

## 🎉 Happy Coding!

Enjoy building with this ChatGPT-style interface! The clean design and powerful features make it perfect for AI-powered applications.