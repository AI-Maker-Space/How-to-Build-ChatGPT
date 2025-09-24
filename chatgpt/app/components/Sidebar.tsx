'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Plus, MessageSquare, Trash2, LogOut, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { ModelType } from '@/types';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    user,
    threads,
    currentThread,
    loadingThreads,
    selectedModel,
    setSelectedModel,
    loadThreads,
    createThread,
    selectThread,
    deleteThread,
    logout,
  } = useStore();

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  const handleNewChat = async () => {
    try {
      const title = 'New Chat';
      const thread = await createThread(title, selectedModel);
      toast.success('New chat created');
    } catch (error) {
      toast.error('Failed to create new chat');
    }
  };

  const handleSelectThread = async (threadId: string) => {
    await selectThread(threadId);
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteThread(threadId);
        toast.success('Chat deleted');
      } catch (error) {
        toast.error('Failed to delete chat');
      }
    }
  };

  return (
    <div
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-gray-900 text-white h-screen flex flex-col transition-all duration-300`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-0 top-4 transform translate-x-full bg-gray-800 p-2 rounded-r-lg hover:bg-gray-700"
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={handleNewChat}
          className="w-full bg-white text-black rounded-lg p-3 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          {!isCollapsed && <span>New Chat</span>}
        </button>
        
        {!isCollapsed && (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ModelType)}
            className="w-full mt-2 bg-gray-800 text-white rounded-lg p-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="gpt-5">GPT-5</option>
            <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
            <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
          </select>
        )}
      </div>

      {/* Threads list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loadingThreads ? (
          <div className="text-center py-4 text-gray-400">
            {!isCollapsed && 'Loading...'}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            {!isCollapsed && 'No chats yet'}
          </div>
        ) : (
          <div className="space-y-1">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread.id)}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  currentThread?.id === thread.id
                    ? 'bg-gray-800'
                    : 'hover:bg-gray-800'
                }`}
              >
                <MessageSquare size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate text-sm">{thread.title}</span>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User section */}
      {user && (
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User size={20} className="flex-shrink-0" />
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{user.name || user.email}</div>
                <button
                  onClick={logout}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
