
'use client';

import React from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date | string;
}

interface Source {
  title: string;
  url: string;
  snippet: string;
}

interface ChatAreaProps {
  messages: Message[];
  streamingMessage: string;
  sources: Source[];
  isLoading: boolean;
  error: string | null;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  streamingMessage,
  sources,
  isLoading,
  error
}) => {
  const showWelcome = messages.length === 0 && !isLoading && !streamingMessage;
  const showMessages = messages.length > 0 || isLoading || streamingMessage;

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden relative chat-container scroll-smooth">
      
      {/* Mensaje de bienvenida */}
      <div 
        className={`flex items-start lg:items-center justify-center h-full pt-12 lg:pt-0 transition-all duration-300 ${
          showWelcome 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95 absolute top-0 left-0 w-full pointer-events-none'
        }`}
        aria-hidden={!showWelcome}
      >
        <div className="text-center max-w-md px-6 lg:px-4">
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8 shadow-lg">
            <svg 
              className="w-10 h-10 lg:w-12 lg:h-12 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
            SAGES Chat
          </h2>
          <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Escribe tu mensaje para comenzar una conversación
          </p>
        </div>
      </div>
      
      {/* Lista de mensajes */}
      <div 
        className={`transition-all duration-300 py-4 ${
          showMessages 
            ? 'opacity-100' 
            : 'opacity-0 absolute top-0 left-0 w-full pointer-events-none'
        }`}
        aria-hidden={!showMessages}
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={false}
          />
        ))}
        
        {streamingMessage && (
          <MessageBubble
            message={{
              id: 'streaming',
              content: streamingMessage,
              role: 'assistant',
              timestamp: new Date()
            }}
            isStreaming={true}
          />
        )}
        
        {error && (
          <div className="mx-2 lg:mx-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl lg:rounded-xl p-4 lg:p-5 shadow-sm mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <svg 
                    className="h-5 w-5 text-red-600 dark:text-red-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm lg:text-base font-semibold text-red-900 dark:text-red-100 mb-1">
                  Ocurrió un error
                </h3>
                <p className="text-xs lg:text-sm text-red-800 dark:text-red-200 mb-2 break-words">
                  {error}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Si el problema persiste, intenta recargar la página
                </p>
              </div>
            </div>
          </div>
        )}
        
        {isLoading && !streamingMessage && (
          <div className="flex items-center gap-2 py-4 px-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-gray-600 dark:text-gray-400 text-xs lg:text-sm">
              Escribiendo...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
