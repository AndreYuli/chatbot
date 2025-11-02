"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Source {
  title: string;
  url: string;
  snippet: string;
}

export function useChat() {
  const { data: session } = useSession();
  const isGuest = !session?.user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const saveGuestMessages = useCallback(
    (targetId: string, entries: Message[]) => {
      if (!isGuest || !targetId?.startsWith('temp_')) {
        return;
      }

      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.setItem(`guest_messages_${targetId}`, JSON.stringify(entries));
    },
    [isGuest]
  );

  const loadGuestMessages = useCallback(
    (targetId: string): Message[] => {
      if (!isGuest || !targetId?.startsWith('temp_')) {
        return [];
      }

      if (typeof window === 'undefined') {
        return [];
      }

      const raw = window.localStorage.getItem(`guest_messages_${targetId}`);
      if (!raw) {
        return [];
      }

      try {
        const parsed = JSON.parse(raw);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      } catch (error) {
        console.error('Error parsing guest messages:', error);
        return [];
      }
    },
    [isGuest]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      // No limpiar inmediatamente para evitar flickering
      // Los mensajes se limpiarán cuando se carguen los de la nueva conversación
      return;
    }

    if (conversationId.startsWith('temp_')) {
      const guestMessages = loadGuestMessages(conversationId);
      setMessages(guestMessages);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        if (response.ok) {
          const conversationMessages = await response.json();
          const messagesWithDates = conversationMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch conversation messages:', errorText);
          setError(`Failed to load conversation: ${errorText}`);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching conversation messages:', error);
        setError('Failed to load conversation messages. Please try again.');
        setMessages([]);
      }
    };

    fetchMessages();
  }, [conversationId, loadGuestMessages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const ensureConversation = useCallback(
    async (userMessage: string, aiModel?: 'n8n' | 'python'): Promise<string> => {
      if (conversationId) {
        return conversationId;
      }

      const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');

      if (session?.user?.id) {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title,
            settings: aiModel ? { aiModel } : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('No se pudo crear la conversación');
        }

        const created = await response.json();
        setConversationId(created.id);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('conversation:created', {
            detail: {
              ...created,
              createdAt: created.createdAt ?? new Date().toISOString(),
            },
          }));
        }

        return created.id as string;
      }

      // Guest users keep conversations in localStorage
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const guestConversation = {
        id: tempId,
        title: title || 'Nueva conversación',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'guest',
        settings: aiModel ? JSON.stringify({ aiModel }) : null,
      };

      setConversationId(tempId);

      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('guest_conversations');
        const parsed = stored ? JSON.parse(stored) : [];
        const updated = [guestConversation, ...parsed.filter((conv: any) => conv.id !== tempId)];
        window.localStorage.setItem('guest_conversations', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('conversation:created', { detail: guestConversation }));
        saveGuestMessages(tempId, []);
      }

      return tempId;
    },
    [conversationId, session?.user?.id, saveGuestMessages]
  );

  const handleSubmit = async (e: React.FormEvent, model: 'n8n' | 'python' = 'n8n') => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setStreamingMessage('');
      setSources([]);
      const userInput = input;
      setInput('');
      
      // Create a new AbortController for this request
      const abortController = new AbortController();

      const ensuredConversationId = await ensureConversation(userInput, model);

      const userMessage: Message = {
        id: Date.now().toString(),
        content: userInput,
        role: 'user',
        timestamp: new Date()
      };

      setMessages(prev => {
        const next = [...prev, userMessage];
        saveGuestMessages(ensuredConversationId, next);
        return next;
      });

      // Route to the appropriate endpoint based on model
      const endpoint = model === 'python' ? '/api/chat/python' : '/api/chat/send';

      // Call our API endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          conversationId: ensuredConversationId,
          settings: {
            topK: 5,
            temperature: 0.7,
            model: model // Pass the selected model
          }
        }),
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedContent = '';
      
      setMessages(prev => {
        const next: Message[] = [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: '',
            role: 'assistant' as const,
            timestamp: new Date()
          }
        ];
        saveGuestMessages(ensuredConversationId, next);
        return next;
      });
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              
              switch (data.type) {
                case 'message':
                  accumulatedContent += data.data.content;
                  setStreamingMessage(accumulatedContent);
                  break;
                  
                case 'sources':
                  setSources(data.data.sources || []);
                  break;
                  
                case 'usage':
                  // We could store usage data if needed
                  break;
                  
                case 'complete':
                  // Finalize the message
                  if (data.data?.conversationId && !conversationId) {
                    setConversationId(data.data.conversationId);
                  }

                  if (typeof window !== 'undefined' && data.data?.conversationId) {
                    window.dispatchEvent(new CustomEvent('conversation:updated', {
                      detail: {
                        id: data.data.conversationId,
                        lastMessageAt: new Date().toISOString(),
                      },
                    }));
                  }

                  setMessages(prev => {
                    const updatedMessages = [...prev];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = accumulatedContent;
                    }
                    const targetId = (data.data?.conversationId as string) ?? ensuredConversationId;
                    saveGuestMessages(targetId, updatedMessages);
                    return updatedMessages;
                  });
                  setStreamingMessage('');
                  break;
                  
                case 'error':
                  setError(data.data.message || 'An error occurred');
                  break;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setStreamingMessage('');
    setSources([]);
    setError(null);
    setInput('');
  }, []);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    streamingMessage,
    sources,
    error,
    messagesEndRef,
    setConversationId,
    conversationId,
    resetChat,
  };
}