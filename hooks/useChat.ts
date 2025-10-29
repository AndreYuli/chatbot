import { useState, useRef, useEffect, useCallback } from 'react';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      // Fetch messages for this conversation
      const fetchMessages = async () => {
        try {
          const response = await fetch(`/api/conversations/${conversationId}/messages`);
          if (response.ok) {
            const conversationMessages = await response.json();
            // Convert timestamp strings back to Date objects
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
    } else {
      // No conversation selected, clear messages
      setMessages([]);
    }
  }, [conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent, model: string) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setStreamingMessage('');
      setSources([]);
      
      // Add user message to chat
      const userMessage: Message = {
        id: Date.now().toString(),
        content: input,
        role: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      const userInput = input;
      setInput('');
      
      // Create a new AbortController for this request
      const abortController = new AbortController();
      
      // Call our API endpoint
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          conversationId: conversationId, // Pass the current conversation ID
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
      
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: '',
          role: 'assistant',
          timestamp: new Date()
        }
      ]);
      
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
                  setMessages(prev => {
                    const updatedMessages = [...prev];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = accumulatedContent;
                    }
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
    resetChat
  };
}