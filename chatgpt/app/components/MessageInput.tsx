'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto p-4">
        <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <button
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={disabled}
          >
            <Paperclip size={20} />
          </button>
          
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={disabled}
            className="flex-1 resize-none bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 min-h-[24px] max-h-[200px] py-1"
            rows={1}
          />
          
          <button
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={disabled}
          >
            <Mic size={20} />
          </button>
          
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className={`p-2 rounded-lg transition-colors ${
              message.trim() && !disabled
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
        
        <p className="text-xs text-center text-gray-400 mt-2">
          ChatGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
