'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming: boolean;
}

export default function MessageList({ messages, streamingContent, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Combine messages with streaming content if active
  const displayMessages = [...messages];
  if (isStreaming && streamingContent) {
    displayMessages.push({
      id: 'streaming',
      thread_id: '',
      role: 'assistant',
      content: streamingContent,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      {displayMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
          <Bot size={48} className="mb-4 text-gray-400" />
          <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
          <p className="text-center max-w-md">
            Start a conversation by typing a message below. I can help with a wide range of topics.
          </p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-4">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 flex gap-4 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500'
                    : 'bg-gray-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User size={18} className="text-white" />
                ) : (
                  <Bot size={18} className="text-white" />
                )}
              </div>
              <div
                className={`flex-1 ${
                  message.role === 'user' ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                  {message.id === 'streaming' && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
