
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
    <div className="h-full overflow-y-auto relative">
      {/* Model change warning removed - using only n8n */}
      
      {/* Mensaje de bienvenida - optimizado con transform en lugar de opacity */}
      <div 
        className={`flex items-center justify-center h-full transition-all duration-200 ${
          showWelcome 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-2 absolute top-0 left-0 w-full pointer-events-none'
        }`}
        aria-hidden={!showWelcome}
      >
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg 
              className="w-10 h-10 text-blue-600 dark:text-blue-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            SAGES Chat
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Escribe tu mensaje para comenzar
          </p>
        </div>
      </div>
      
      {/* Lista de mensajes - optimizado con transform */}
      <div 
        className={`space-y-6 p-4 transition-all duration-200 ${
          showMessages 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-2 absolute top-0 left-0 w-full pointer-events-none'
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
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900 dark:to-orange-900 border-2 border-red-300 dark:border-red-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                  <svg 
                    className="h-6 w-6 text-red-600 dark:text-red-300" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  ⚠️ Ocurrió un error
                </h3>
                <p className="text-base text-red-800 dark:text-red-200 mb-3">
                  {error}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Si el problema persiste, intenta recargar la página o contactar al administrador.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {isLoading && !streamingMessage && (
          <div className="flex items-center gap-3 py-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-gray-600 dark:text-gray-400 text-sm italic">
              Escribiendo...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
