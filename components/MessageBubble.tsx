'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date | string;
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming = false }) => {
  // Convert timestamp to Date object if it's a string
  const timestamp = typeof message.timestamp === 'string' 
    ? new Date(message.timestamp) 
    : message.timestamp;
  
  return (
    <div 
      data-testid={message.role === 'user' ? 'message-user' : 'message-assistant'}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3 lg:mb-4 px-2 lg:px-0`}
    >
      <div 
        className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-2xl lg:rounded-xl px-3 py-2.5 lg:px-4 lg:py-3 shadow-sm ${
          message.role === 'user' 
            ? 'bg-blue-500 dark:bg-blue-600/90 text-white rounded-br-md' 
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700'
        } transform-gpu will-change-transform`}
      >
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {message.role === 'assistant' ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-sm lg:text-sm">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="space-y-1 my-2 pl-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-1 my-2 pl-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed text-sm">{children}</li>,
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h3>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto text-xs my-2 border border-gray-200 dark:border-gray-700">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-3 py-1 my-2 text-gray-700 dark:text-gray-300 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.content}</div>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm"></span>
          )}
        </div>
        <div 
          className={`text-[10px] lg:text-xs mt-1.5 font-medium ${
            message.role === 'user' 
              ? 'text-blue-50 dark:text-blue-100' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
