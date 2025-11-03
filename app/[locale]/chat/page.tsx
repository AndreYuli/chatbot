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
import { useSidebar } from './layout-client';

// Disable static generation for this dynamic page
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<AIModel>('n8n'); // Default: n8n
  const [pendingModel, setPendingModel] = useState<AIModel | null>(null);
  const [showModelChangeModal, setShowModelChangeModal] = useState(false);
  const { sidebarOpen, setSidebarOpen } = useSidebar(); // Usar el contexto del sidebar
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
    
    // Si es una conversación nueva (vacía), resetear el chat
    if (!convId || convId === '') {
      resetChat();
      setSelectedConversationId('');
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
      return;
    }
    
    console.log('Selecting conversation:', convId);
    setSelectedConversationId(convId);
    setConversationId(convId);
    
    // Cargar el modelo de la conversación seleccionada
    const conversation = conversations.find(c => c.id === convId);
    if (conversation?.settings?.aiModel) {
      console.log('Setting model from conversation:', conversation.settings.aiModel);
      setCurrentModel(conversation.settings.aiModel);
    }
    
    // Reset flag después de que React procese el estado
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [setConversationId, conversations, resetChat]);
  
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
    // Si hay una conversación activa con mensajes, asegurarse de que cualquier streaming
    // en curso termine y que la conversación se persista antes de resetear el chat.
    if (conversationId && messages.length > 0) {
      // Si hay una respuesta en curso (isLoading), esperar hasta que termine (con timeout)
      const waitForFinish = async (timeout = 10000) => {
        const start = Date.now();
        // Esperar a que isLoading sea false
        // Polling ligero para evitar bloquear el hilo
        // eslint-disable-next-line no-unmodified-loop-condition
        while (isLoading && Date.now() - start < timeout) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, 150));
        }
      };

      if (isLoading) {
        // Esperar hasta 10s para que termine la respuesta automática
        await waitForFinish(10000);
      }

      // Disparar evento para que el sidebar actualice la conversación con la marca de tiempo más reciente
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('conversation:updated', {
          detail: {
            id: conversationId,
            lastMessageAt: new Date().toISOString(),
          },
        }));
      }

      // Breve pausa para dar tiempo a los listeners a procesar la actualización
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // Aplicar el nuevo modelo y resetear el chat para crear una nueva conversación
    setCurrentModel(pendingModel);
    setPendingModel(null);
    setShowModelChangeModal(false);

    // Resetear el chat sólo después de asegurar que la conversación anterior se persistió
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
    <div className="flex h-full relative">
      {/* Modal de cambio de modelo */}
      <ModelChangeModal
        isOpen={showModelChangeModal}
        fromModel={currentModel}
        toModel={pendingModel || currentModel}
        onConfirm={handleConfirmModelChange}
        onCancel={handleCancelModelChange}
      />
      
      {/* Overlay para móviles cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - responsive */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
        fixed lg:static inset-y-0 left-0 z-30 w-80 lg:w-64
        flex flex-col
        bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out
      `} style={{
        boxShadow: '6px 0px 18px -4px rgba(0,0,0,0.05)',
        filter: 'drop-shadow(6px 0px 18px rgba(0,0,0,0.03))'
      }}>
        <ConversationSidebar 
          onConversationSelect={handleConversationSelect}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      
      {/* Área principal del chat */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatArea 
            messages={messages}
            streamingMessage={streamingMessage}
            sources={sources}
            isLoading={isLoading}
            error={error}

          />
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 lg:p-4">
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