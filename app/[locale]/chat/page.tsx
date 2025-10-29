'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ChatArea from '@/components/ChatArea';
import ChatInput from '@/components/ChatInput';
import ConversationSidebar from '@/components/ConversationSidebar';
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
  // Using only n8n model - no model selection UI
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { data: session } = useSession();
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    streamingMessage,
    sources,
    error,
    setConversationId,
    resetChat
  } = useChat();
  
  // When selected conversation changes, update the useChat hook
  useEffect(() => {
    setConversationId(selectedConversationId);
  }, [selectedConversationId, setConversationId]);

  useEffect(() => {
    if (!session) {
      setSelectedConversationId(null);
      resetChat();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedConversationId');
      }
    }
  }, [session, resetChat]);
  
  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <ConversationSidebar onConversationSelect={setSelectedConversationId} />
      </div>
      
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatArea 
            messages={messages}
            streamingMessage={streamingMessage}
            sources={sources}
            isLoading={isLoading}
            error={error}
          />
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <ChatInput
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}