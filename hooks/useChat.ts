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

  // Debug log
  useEffect(() => {
    console.log('[useChat] Session state:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      isGuest 
    });
  }, [session, isGuest]);

  const saveGuestMessages = useCallback(
    (targetId: string, entries: Message[]) => {
      console.log('[saveGuestMessages] Called with:', { 
        targetId, 
        isGuest, 
        messageCount: entries.length,
        isTemp: targetId?.startsWith('temp_')
      });
      
      if (!isGuest || !targetId?.startsWith('temp_')) {
        console.log('[saveGuestMessages] Skipping save - not guest or not temp');
        return;
      }

      if (typeof window === 'undefined') {
        console.log('[saveGuestMessages] Skipping save - window undefined');
        return;
      }

      const storageKey = `guest_messages_${targetId}`;
      const serialized = JSON.stringify(entries);
      console.log('[saveGuestMessages] Saving to localStorage:', storageKey, entries);
      window.localStorage.setItem(storageKey, serialized);
      console.log('[saveGuestMessages] ✅ Saved successfully!');
    },
    [isGuest]
  );

  const updateGuestConversationMetadata = useCallback(
    (conversationId: string, updates: { title?: string; aiModel?: 'n8n' | 'python'; updatedAt?: string }) => {
      if (!isGuest || typeof window === 'undefined' || !conversationId.startsWith('temp_')) {
        return;
      }

      const stored = window.localStorage.getItem('guest_conversations');
      if (!stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        let changed = false;
        const updatedConversations = parsed.map((conv: any) => {
          if (conv.id !== conversationId) {
            return conv;
          }
          changed = true;
          return {
            ...conv,
            title: updates.title ?? conv.title,
            updatedAt: updates.updatedAt ?? conv.updatedAt ?? new Date().toISOString(),
            settings: updates.aiModel
              ? JSON.stringify({ aiModel: updates.aiModel })
              : conv.settings,
          };
        });

        if (changed) {
          window.localStorage.setItem('guest_conversations', JSON.stringify(updatedConversations));
        }
      } catch (error) {
        console.error('Error updating guest conversation metadata:', error);
      }
    },
    [isGuest]
  );

  const generateConversationTitle = useCallback((message: string): string => {
    const cleanMessage = message.trim();

    if (cleanMessage.length <= 10) {
      return cleanMessage || 'Nueva conversación';
    }

    if (cleanMessage.includes('?')) {
      const questionPart = cleanMessage.split('?')[0] + '?';
      if (questionPart.length <= 60) {
        return questionPart;
      }
    }

    const lowerMessage = cleanMessage.toLowerCase();

    if (lowerMessage.match(/lecci[oó]n\s*\d+/)) {
      const match = cleanMessage.match(/lecci[oó]n\s*\d+/i);
      if (match) {
        return `Pregunta sobre ${match[0]}`;
      }
    }

    if (lowerMessage.includes('escuela sab')) {
      return 'Consulta sobre Escuela Sabática';
    }

    const starters = ['qué', 'que', 'cómo', 'como', 'cuál', 'cual', 'cuándo', 'cuando', 'dónde', 'donde', 'por qué', 'por que'];
    if (starters.some((start) => lowerMessage.startsWith(start))) {
      return cleanMessage.substring(0, 50) + (cleanMessage.length > 50 ? '...' : '');
    }

    const words = cleanMessage.split(/\s+/);
    if (words.length <= 8) {
      return cleanMessage;
    }

    return words.slice(0, 8).join(' ') + '...';
  }, []);

  const loadGuestMessages = useCallback(
    (targetId: string): Message[] => {
      if (!isGuest || !targetId?.startsWith('temp_')) {
        console.log('[loadGuestMessages] Skipping - not guest or not temp ID:', { isGuest, targetId });
        return [];
      }

      if (typeof window === 'undefined') {
        console.log('[loadGuestMessages] Skipping - window undefined');
        return [];
      }

      const storageKey = `guest_messages_${targetId}`;
      const raw = window.localStorage.getItem(storageKey);
      console.log('[loadGuestMessages] Reading from localStorage:', storageKey);
      console.log('[loadGuestMessages] Raw data:', raw);
      
      if (!raw) {
        console.log('[loadGuestMessages] No messages found in localStorage');
        return [];
      }

      try {
        const parsed = JSON.parse(raw);
        const messages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        console.log('[loadGuestMessages] Parsed messages:', messages);
        return messages;
      } catch (error) {
        console.error('[loadGuestMessages] Error parsing guest messages:', error);
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

  // Persist guest messages whenever they change
  useEffect(() => {
    console.log('[useChat] Persist effect triggered:', { 
      conversationId, 
      messageCount: messages.length,
      isTemp: conversationId?.startsWith('temp_')
    });
    
    if (!conversationId || !conversationId.startsWith('temp_')) {
      console.log('[useChat] Skipping persist - not temp conversation');
      return;
    }

    console.log('[useChat] Persisting messages to localStorage...');
    saveGuestMessages(conversationId, messages);
  }, [conversationId, messages, saveGuestMessages]);

  // Load messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      // Limpiar mensajes cuando no hay conversación
      console.log('[useChat] No conversation ID, clearing messages');
      setMessages([]);
      setError(null);
      return;
    }

    if (conversationId.startsWith('temp_')) {
      console.log('[useChat] Loading guest messages for:', conversationId);
      const guestMessages = loadGuestMessages(conversationId);
      console.log('[useChat] Loaded guest messages:', guestMessages.length, guestMessages);
      setMessages(guestMessages);
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for conversation:', conversationId);
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        if (response.ok) {
          const conversationMessages = await response.json();
          console.log('Loaded messages:', conversationMessages);
          const messagesWithDates = conversationMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
          setError(null); // Limpiar errores previos
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch conversation messages:', errorText);
          setError(`Error al cargar la conversación: ${errorText}`);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching conversation messages:', error);
        setError('Error al cargar los mensajes. Por favor, intenta de nuevo.');
        setMessages([]);
      }
    };

    fetchMessages();
  }, [conversationId, loadGuestMessages]);

  // Mantener metadatos actualizados para invitados cuando haya mensajes nuevos
  useEffect(() => {
    if (!conversationId || !conversationId.startsWith('temp_') || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const updatedAtIso = lastMessage.timestamp instanceof Date
      ? lastMessage.timestamp.toISOString()
      : new Date(lastMessage.timestamp).toISOString();

    updateGuestConversationMetadata(conversationId, {
      updatedAt: updatedAtIso,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('conversation:updated', {
        detail: {
          id: conversationId,
          lastMessageAt: updatedAtIso,
        },
      }));
    }
  }, [conversationId, messages, updateGuestConversationMetadata]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const ensureConversation = useCallback(
    async (userMessage: string, aiModel?: 'n8n' | 'python'): Promise<string> => {
      if (conversationId) {
        if (conversationId.startsWith('temp_')) {
          const titleForGuest = generateConversationTitle(userMessage);
          updateGuestConversationMetadata(conversationId, {
            title: titleForGuest,
            aiModel: aiModel ?? 'n8n',
            updatedAt: new Date().toISOString(),
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('conversation:updated', {
                detail: {
                  id: conversationId,
                  title: titleForGuest,
                  settings: { aiModel: aiModel ?? 'n8n' },
                  lastMessageAt: new Date().toISOString(),
                },
              })
            );
          }
        }
        return conversationId;
      }

      const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');

      if (session?.user?.id) {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: generateConversationTitle(userMessage),
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

      // Guest users: create conversation in server (DB) tied to a session cookie
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generateConversationTitle(userMessage),
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
    },
    [
      conversationId,
      session?.user?.id,
      generateConversationTitle,
      updateGuestConversationMetadata,
    ]
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

      // Create a new AbortController for this request
      const abortController = new AbortController();

      // Route to the appropriate endpoint based on model
      const endpoint = model === 'python' ? '/api/chat/python' : '/api/chat/send';

      // Prepare conversation history for Python (last 10 messages for better context)
      // Incluir el mensaje de usuario recién creado en el historial para asegurar
      // que el backend reciba el contexto correcto incluso antes de que el estado se
      // actualice de forma asíncrona.
      const latestHistoryArray = [...messages, userMessage];
      const conversationHistory = latestHistoryArray.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call our API endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          conversationId: ensuredConversationId,
          history: conversationHistory, // Send conversation history
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
                        // Proveer un título significativo basado en el primer mensaje enviado
                        title: generateConversationTitle(userInput),
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

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    // Auto-submit después de un pequeño delay para que el usuario vea la pregunta
    setTimeout(() => {
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      handleSubmit(syntheticEvent, 'python'); // Usar Python por defecto
    }, 100);
  };

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
    handleSuggestedQuestion,
  };
}