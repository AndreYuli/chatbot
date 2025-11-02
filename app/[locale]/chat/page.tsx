'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ChatArea from '@/components/ChatArea';
import ChatInput from '@/components/ChatInput';
import ConversationSidebar from '@/components/ConversationSidebar';
import ModelChangeModal from '@/components/ModelChangeModal';
import { useChat } from '@/hooks/useChat';
import { useConversations } from '@/hooks/useConversations';
import { AIModel } from '@/components/ModelSelector';

// Disable static generation for this dynamic page
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<AIModel>('n8n'); // Default: n8n
  const [pendingModel, setPendingModel] = useState<AIModel | null>(null);
  const [showModelChangeModal, setShowModelChangeModal] = useState(false);
  const { data: session, status } = useSession();
  const [previousSessionState, setPreviousSessionState] = useState<boolean | null>(null);
  const { conversations } = useConversations();
  
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
    
    // Cargar el modelo de la conversación seleccionada
    const conversation = conversations.find(c => c.id === convId);
    if (conversation?.settings?.aiModel) {
      setCurrentModel(conversation.settings.aiModel);
    }
    
    // Reset flag después de que React procese el estado
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [setConversationId, conversations]);
  
  // ELIMINADO: Los dos useEffects que causaban la cascada circular
  // Ahora la sincronización es directa en handleConversationSelect

  // NO cargar conversación anterior - siempre iniciar con chat vacío
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialMount.current) return;
    
    isInitialMount.current = false;
    // Ya no cargar la última conversación - iniciar siempre vacío
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez en mount

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

  // Manejar cambio de modelo
  const handleModelChange = (newModel: AIModel) => {
    if (newModel === currentModel) return;

    // Si hay mensajes en la conversación actual, mostrar modal
    if (messages.length > 0 || conversationId) {
      setPendingModel(newModel);
      setShowModelChangeModal(true);
    } else {
      // Si no hay conversación activa, cambiar directamente
      setCurrentModel(newModel);
    }
  };

  // Confirmar cambio de modelo y crear nueva conversación
  const handleConfirmModelChange = async () => {
    if (!pendingModel) return;

    // Si hay una conversación activa con mensajes, asegurarse de que se dispare el evento de actualización
    if (conversationId && messages.length > 0) {
      // Disparar evento para que el sidebar actualice la conversación
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('conversation:updated', {
          detail: {
            id: conversationId,
            lastMessageAt: new Date().toISOString(),
          },
        }));
      }
      
      // Pequeña pausa para asegurar que el evento se procese
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setCurrentModel(pendingModel);
    setPendingModel(null);
    setShowModelChangeModal(false);
    
    // Resetear chat para crear nueva conversación
    resetChat();
    setSelectedConversationId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedConversationId');
    }
  };

  // Cancelar cambio de modelo
  const handleCancelModelChange = () => {
    setPendingModel(null);
    setShowModelChangeModal(false);
  };
  
  return (
    <div className="flex h-full">
      {/* Modal de cambio de modelo */}
      <ModelChangeModal
        isOpen={showModelChangeModal}
        fromModel={currentModel}
        toModel={pendingModel || currentModel}
        onConfirm={handleConfirmModelChange}
        onCancel={handleCancelModelChange}
      />
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
            currentModel={currentModel}
            onModelChange={handleModelChange}
          />
        </div>
      </div>
    </div>
  );
}