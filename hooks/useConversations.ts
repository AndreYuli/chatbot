'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt?: Date;
  userId?: string;
  settings?: {
    aiModel?: 'n8n' | 'python';
  } | null;
}

export function useConversations() {
  const { data: session } = useSession();
  const isGuest = !session?.user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setError(null);

        // Always try API first (works for logged-in and guests with guest_token)
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = await response.json();
          setConversations(
            data.map((conv: any) => ({
              ...conv,
              createdAt: new Date(conv.createdAt),
              updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : undefined,
              settings: conv.settings ? (typeof conv.settings === 'string' ? JSON.parse(conv.settings) : conv.settings) : null,
            }))
          );
        } else {
          throw new Error('Failed to fetch conversations');
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        // Fallback for guests: localStorage
        if (typeof window !== 'undefined') {
          const savedConversations = window.localStorage.getItem('guest_conversations');
          if (savedConversations) {
            try {
              const parsed = JSON.parse(savedConversations);
              setConversations(parsed.map((conv: any) => ({
                ...conv,
                createdAt: new Date(conv.createdAt),
                updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : undefined,
              })));
            } catch (e) {
              console.error('Error parsing saved conversations:', e);
              window.localStorage.removeItem('guest_conversations');
              setConversations([]);
            }
          } else {
            setConversations([]);
          }
        } else {
          setConversations([]);
        }
        setError('Error al cargar conversaciones');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [session]);

  // Save guest conversations to localStorage (usando useCallback para evitar recreación)
  const saveGuestConversations = useCallback((convs: Conversation[]) => {
    if (!isGuest || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('guest_conversations', JSON.stringify(convs));
  }, [isGuest]);

  const removeGuestMessages = useCallback((conversationIdentifier: string) => {
    if (!isGuest || typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(`guest_messages_${conversationIdentifier}`);
  }, [isGuest]);

  // Create new conversation - usando useCallback para memoización
  const createConversation = useCallback(async (title?: string, aiModel?: 'n8n' | 'python') => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Nueva conversación',
          settings: aiModel ? { aiModel } : undefined,
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        const normalizedConversation = {
          ...newConversation,
          createdAt: new Date(newConversation.createdAt),
          updatedAt: newConversation.updatedAt ? new Date(newConversation.updatedAt) : undefined,
          settings: newConversation.settings ? (typeof newConversation.settings === 'string' ? JSON.parse(newConversation.settings) : newConversation.settings) : null,
        };
        
        // Actualizar estado usando callback para obtener el valor más reciente
        // Esto evita problemas con el closure y asegura que no haya doble renderizado
        setConversations(prev => {
          const updatedConversations = [normalizedConversation, ...prev];
          return updatedConversations;
        });

        // Save to localStorage for guests - hacerlo fuera del callback para evitar problemas
        if (!session?.user?.id) {
          // Usar setTimeout para asegurar que el estado se actualice primero
          setTimeout(() => {
            setConversations(current => {
              saveGuestConversations(current);
              return current;
            });
          }, 0);
        }

        return normalizedConversation;
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [session?.user?.id, saveGuestConversations]);

  // Delete conversation - usando useCallback
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      if (!conversationId.startsWith('temp_')) {
        // Delete from API for both logged-in and guests
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to delete conversation');
        }
      }

      // Update local state usando callback
      setConversations(prev => {
        const updatedConversations = prev.filter(conv => conv.id !== conversationId);
        
        // Save to localStorage for guests
        if (!session?.user?.id) {
          saveGuestConversations(updatedConversations);
        }
        
        return updatedConversations;
      });
      
      removeGuestMessages(conversationId);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }, [session?.user?.id, saveGuestConversations, removeGuestMessages]);

  // Clear all conversations - usando useCallback
  const clearAllConversations = useCallback(async () => {
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
        if (typeof window !== 'undefined') {
          // Usar un snapshot del estado actual
          setConversations(prev => {
            prev.forEach(conv => {
              removeGuestMessages(conv.id);
            });
            return [];
          });
          window.localStorage.removeItem('guest_conversations');
          return; // Early return para evitar el setConversations de abajo
        }
      }

      setConversations([]);
    } catch (error) {
      console.error('Error clearing conversations:', error);
      throw error;
    }
  }, [session?.user?.id, removeGuestMessages]);

  // Listener para nuevas conversaciones creadas desde useChat
  useEffect(() => {
    const handleConversationCreated = async (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const detail = customEvent.detail;
      if (!detail || !detail.id) return;

      // Para invitados o usuarios logueados, actualizar la lista
      setConversations(prev => {
        const exists = prev.find(c => c.id === detail.id);
        if (exists) {
          return prev;
        }

        const newConversation = {
          id: detail.id,
          title: detail.title || 'Nueva conversación',
          createdAt: detail.createdAt ? new Date(detail.createdAt) : new Date(),
          updatedAt: detail.updatedAt ? new Date(detail.updatedAt) : new Date(),
          userId: detail.userId,
          settings: detail.settings ? (typeof detail.settings === 'string' ? JSON.parse(detail.settings) : detail.settings) : null,
        };

        return [newConversation, ...prev];
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('conversation:created', handleConversationCreated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('conversation:created', handleConversationCreated);
      }
    };
  }, []);

  // Listener para actualizaciones de conversaciones (new/updated messages)
  useEffect(() => {
    const handleConversationUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const detail = customEvent.detail;
      if (!detail || !detail.id) return;

      // Actualizar en memoria para ambos (logueado e invitado) para que el título cambie al instante
      setConversations(prev => {
        let changed = false;
        const next = prev.map(conv => {
          if (conv.id !== detail.id) return conv;
          changed = true;
          return {
            ...conv,
            updatedAt: detail.lastMessageAt ? new Date(detail.lastMessageAt) : new Date(),
            title: detail.title ?? conv.title,
            settings: detail.settings
              ? (typeof detail.settings === 'string' ? JSON.parse(detail.settings) : detail.settings)
              : conv.settings,
          };
        });

        // Persistir sólo para invitados
        if (!session?.user?.id && changed) {
          saveGuestConversations(next);
        }

        return changed ? next : prev;
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('conversation:updated', handleConversationUpdated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('conversation:updated', handleConversationUpdated);
      }
    };
  }, [session?.user?.id, saveGuestConversations]);

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