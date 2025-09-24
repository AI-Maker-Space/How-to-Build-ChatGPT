import { create } from 'zustand';
import { Thread, User, ModelType, Message } from '@/types';
import { threadsApi, authApi } from './api';

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Threads state
  threads: Thread[];
  currentThread: Thread | null;
  loadingThreads: boolean;
  
  // Messages state
  isStreaming: boolean;
  streamingContent: string;
  
  // Model state
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
  
  // Actions
  loadThreads: () => Promise<void>;
  createThread: (title: string, model: ModelType) => Promise<Thread>;
  selectThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  addMessage: (content: string, role: 'user' | 'assistant') => void;
  clearStreamingContent: () => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamingContent: (content: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  threads: [],
  currentThread: null,
  loadingThreads: false,
  isStreaming: false,
  streamingContent: '',
  selectedModel: 'gpt-4.1-mini',
  
  // User actions
  setUser: (user) => set({ user }),
  
  // Model actions
  setSelectedModel: (model) => set({ selectedModel: model }),
  
  // Thread actions
  loadThreads: async () => {
    set({ loadingThreads: true });
    try {
      const threads = await threadsApi.getThreads();
      set({ threads, loadingThreads: false });
    } catch (error) {
      console.error('Failed to load threads:', error);
      set({ loadingThreads: false });
    }
  },
  
  createThread: async (title, model) => {
    const thread = await threadsApi.createThread(title, model);
    set((state) => ({
      threads: [thread, ...state.threads],
      currentThread: thread,
    }));
    return thread;
  },
  
  selectThread: async (threadId) => {
    try {
      const thread = await threadsApi.getThread(threadId);
      set({ currentThread: thread });
    } catch (error) {
      console.error('Failed to load thread:', error);
    }
  },
  
  deleteThread: async (threadId) => {
    await threadsApi.deleteThread(threadId);
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== threadId),
      currentThread: state.currentThread?.id === threadId ? null : state.currentThread,
    }));
  },
  
  // Message actions
  addMessage: (content, role) => {
    set((state) => {
      if (!state.currentThread) return state;
      
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        thread_id: state.currentThread.id,
        role,
        content,
        created_at: new Date().toISOString(),
      };
      
      const updatedThread = {
        ...state.currentThread,
        messages: [...state.currentThread.messages, newMessage],
        updated_at: new Date().toISOString(),
      };
      
      return {
        currentThread: updatedThread,
        threads: state.threads.map((t) =>
          t.id === updatedThread.id ? updatedThread : t
        ),
      };
    });
  },
  
  clearStreamingContent: () => set({ streamingContent: '' }),
  
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  
  appendStreamingContent: (content) => {
    set((state) => ({
      streamingContent: state.streamingContent + content,
    }));
  },
  
  logout: () => {
    authApi.logout();
    set({
      user: null,
      threads: [],
      currentThread: null,
    });
  },
}));
