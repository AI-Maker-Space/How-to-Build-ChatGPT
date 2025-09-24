'use client';

import { useStore } from '@/lib/store';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { chatApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ChatArea() {
  const {
    currentThread,
    isStreaming,
    streamingContent,
    selectedModel,
    setStreaming,
    clearStreamingContent,
    appendStreamingContent,
    addMessage,
    createThread,
  } = useStore();

  const handleSendMessage = async (content: string) => {
    try {
      let threadId = currentThread?.id;
      
      // Create a new thread if none exists
      if (!threadId) {
        const thread = await createThread('New Chat', selectedModel);
        threadId = thread.id;
      }
      
      // Add user message to UI
      addMessage(content, 'user');
      
      // Start streaming
      setStreaming(true);
      clearStreamingContent();
      
      // Send message and stream response
      await chatApi.streamChat(
        threadId,
        content,
        selectedModel,
        (chunk) => {
          appendStreamingContent(chunk);
        },
        (error) => {
          toast.error(error);
          setStreaming(false);
        },
        () => {
          // On completion, add the full message to the thread
          const fullContent = useStore.getState().streamingContent;
          addMessage(fullContent, 'assistant');
          clearStreamingContent();
          setStreaming(false);
        }
      );
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
      setStreaming(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen relative">
      <MessageList
        messages={currentThread?.messages || []}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
      />
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isStreaming}
      />
    </div>
  );
}
