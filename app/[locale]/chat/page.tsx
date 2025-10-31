'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ChatArea from '@/components/ChatArea';
import ChatInput from '@/components/ChatInput';
import ConversationSidebar from '@/components/ConversationSidebar';
import { useChat } from '@/hooks/useChat';

// Disable static generation for this dynamic page
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  // Using only n8n model - no model selection UI
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const [previousSessionState, setPreviousSessionState] = useState<boolean | null>(null);
  
  // Usar ref para evitar ciclo de useEffects
  const isInitialMount = useRef(true);
  const isSyncingRef = useRef(false);
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    streamingMessage,
    sources,
    error,
    setConversationId,
    conversationId,
    resetChat
  } = useChat();
  
  // Memoizar el callback para evitar re-renders del sidebar
  const handleConversationSelect = useCallback((convId: string) => {
    if (isSyncingRef.current) return; // Prevenir ciclos
    isSyncingRef.current = true;
    setSelectedConversationId(convId);
    setConversationId(convId);
    // Reset flag después de que React procese el estado
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [setConversationId]);
  
  // ELIMINADO: Los dos useEffects que causaban la cascada circular
  // Ahora la sincronización es directa en handleConversationSelect

  // Cargar conversación inicial desde localStorage (solo en mount)
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialMount.current) return;
    
    isInitialMount.current = false;
    const storedId = window.localStorage.getItem('selectedConversationId');
    if (storedId) {
      isSyncingRef.current = true;
      setSelectedConversationId(storedId);
      setConversationId(storedId);
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez en mount - setConversationId es estable

  // Guardar conversación seleccionada en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (selectedConversationId) {
      window.localStorage.setItem('selectedConversationId', selectedConversationId);
    } else {
      window.localStorage.removeItem('selectedConversationId');
    }
  }, [selectedConversationId]);
  
  // Sincronizar cuando useChat crea una conversación automáticamente
  useEffect(() => {
    if (!conversationId || isSyncingRef.current) return;
    if (conversationId !== selectedConversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [conversationId, selectedConversationId]);

  // Solo limpiar cuando el usuario CIERRA sesión (no en la carga inicial)
  useEffect(() => {
    // Si status es loading, no hacer nada
    if (status === 'loading') return;
    
    // Si session cambió de autenticado a no autenticado (logout)
    if (previousSessionState === true && !session) {
      setSelectedConversationId(null);
      resetChat();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedConversationId');
      }
    }
    
    // Actualizar el estado anterior
    setPreviousSessionState(!!session);
  }, [session, status, previousSessionState, resetChat]);
  
  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <ConversationSidebar onConversationSelect={handleConversationSelect} />
      </div>
      
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatArea 
            messages={messages}
            streamingMessage={streamingMessage}
            sources={sources}
            isLoading={isLoading}
            error={error}
          />
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <ChatInput
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}