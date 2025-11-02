'use client';

import React from 'react';

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
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div 
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          message.role === 'user' 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
        }`}
      >
        <div className="whitespace-pre-wrap">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse"></span>
          )}
        </div>
        <div 
          className={`text-xs mt-1 ${
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
