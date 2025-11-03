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
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 lg:mb-6`}
    >
      <div 
        className={`max-w-[90%] lg:max-w-[80%] rounded-2xl lg:rounded-lg px-4 py-3 lg:py-2 shadow-sm ${
          message.role === 'user' 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="prose prose-sm lg:prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-2">
          {message.role === 'assistant' ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-base lg:text-sm">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="space-y-1 mb-3 pl-4">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-1 mb-3 pl-4">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed text-base lg:text-sm">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl lg:text-lg font-bold mb-2 mt-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg lg:text-base font-bold mb-2 mt-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base lg:text-sm font-bold mb-2 mt-2">{children}</h3>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-gray-200 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto text-sm">
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <div className="whitespace-pre-wrap text-base lg:text-sm leading-relaxed">{message.content}</div>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse"></span>
          )}
        </div>
        <div 
          className={`text-xs lg:text-xs mt-2 lg:mt-1 ${
            message.role === 'user' 
              ? 'text-blue-100' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
