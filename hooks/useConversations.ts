'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
  userId?: string;
}

export function useConversations() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setError(null);
        
        if (session?.user?.id) {
          // User is logged in - fetch from API
          const response = await fetch('/api/conversations');
          if (response.ok) {
            const data = await response.json();
            setConversations(data);
          } else {
            throw new Error('Failed to fetch conversations');
          }
        } else {
          // Guest user - load from localStorage
          const savedConversations = localStorage.getItem('guest_conversations');
          if (savedConversations) {
            try {
              const parsed = JSON.parse(savedConversations);
              setConversations(parsed.map((conv: any) => ({
                ...conv,
                createdAt: new Date(conv.createdAt)
              })));
            } catch (e) {
              console.error('Error parsing saved conversations:', e);
              localStorage.removeItem('guest_conversations');
              setConversations([]);
            }
          } else {
            setConversations([]);
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        setError('Error al cargar conversaciones');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [session]);

  // Save guest conversations to localStorage
  const saveGuestConversations = (convs: Conversation[]) => {
    if (!session?.user?.id) {
      localStorage.setItem('guest_conversations', JSON.stringify(convs));
    }
  };

  // Create new conversation
  const createConversation = async (title?: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Nueva conversación',
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        const updatedConversations = [newConversation, ...conversations];
        setConversations(updatedConversations);
        
        // Save to localStorage for guests
        if (!session?.user?.id) {
          saveGuestConversations(updatedConversations);
        }
        
        return newConversation;
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      if (session?.user?.id && !conversationId.startsWith('temp_')) {
        // Logged in user - delete from database
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to delete conversation');
        }
      }

      // Update local state
      const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
      setConversations(updatedConversations);
      
      // Save to localStorage for guests
      if (!session?.user?.id) {
        saveGuestConversations(updatedConversations);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  };

  // Clear all conversations
  const clearAllConversations = async () => {
    try {
      if (session?.user?.id) {
        // Logged in user - clear from database
        const response = await fetch('/api/conversations', {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to clear conversations');
        }
      } else {
        // Guest user - clear localStorage
        localStorage.removeItem('guest_conversations');
      }

      setConversations([]);
    } catch (error) {
      console.error('Error clearing conversations:', error);
      throw error;
    }
  };

  return {
    conversations,
    loading,
    error,
    createConversation,
    deleteConversation,
    clearAllConversations,
    isLoggedIn: !!session?.user?.id,
  };
}