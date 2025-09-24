import axios from 'axios';
import Cookies from 'js-cookie';
import { Thread, Message, AuthResponse, ModelType } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      Cookies.remove('access_token');
      Cookies.remove('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  googleLogin: async (token: string): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/google', { token });
    const data = response.data;
    
    // Store auth data
    Cookies.set('access_token', data.access_token, { expires: 7 });
    Cookies.set('user', JSON.stringify({
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    }), { expires: 7 });
    
    return data;
  },
  
  logout: () => {
    Cookies.remove('access_token');
    Cookies.remove('user');
    window.location.href = '/';
  },
  
  getCurrentUser: () => {
    const userStr = Cookies.get('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },
};

export const threadsApi = {
  getThreads: async (): Promise<Thread[]> => {
    const response = await api.get('/api/threads');
    return response.data;
  },
  
  createThread: async (title: string, model: ModelType): Promise<Thread> => {
    const response = await api.post('/api/threads', { title, model });
    return response.data;
  },
  
  getThread: async (threadId: string): Promise<Thread> => {
    const response = await api.get(`/api/threads/${threadId}`);
    return response.data;
  },
  
  deleteThread: async (threadId: string): Promise<void> => {
    await api.delete(`/api/threads/${threadId}`);
  },
  
  addMessage: async (threadId: string, content: string): Promise<Message> => {
    const response = await api.post(`/api/threads/${threadId}/messages`, {
      role: 'user',
      content,
    });
    return response.data;
  },
};

export const chatApi = {
  streamChat: async (
    threadId: string,
    message: string,
    model?: ModelType,
    onMessage: (content: string) => void,
    onError?: (error: string) => void,
    onDone?: () => void
  ) => {
    const token = Cookies.get('access_token');
    
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        thread_id: threadId,
        message,
        model,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body');
    }
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr.trim()) {
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                onMessage(data.content);
              } else if (data.error && onError) {
                onError(data.error);
              } else if (data.done && onDone) {
                onDone();
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    }
  },
};
