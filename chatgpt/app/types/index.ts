export type ModelType = 'gpt-5' | 'gpt-4.1-mini' | 'gpt-4.1-nano';

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface Thread {
  id: string;
  title: string;
  model: ModelType;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  access_token: string;
}
