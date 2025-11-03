'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

// Debounce hook para optimizar búsqueda
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const ConversationSidebar: React.FC<{
  onConversationSelect?: (conversationId: string) => void;
  onClose?: () => void;
}> = ({ onConversationSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Espera 300ms después de dejar de escribir
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const {
    conversations,
    loading,
    error,
    createConversation,
    deleteConversation,
    clearAllConversations,
    isLoggedIn
  } = useConversations();

  // Create a new conversation - usando useCallback para evitar recreación
  const handleNewConversation = useCallback(async () => {
    try {
      // Primero, reseteamos la conversación actual (eso debe hacerlo el componente padre)
      if (onConversationSelect) {
        onConversationSelect(''); // Limpiar primero
      }
      
      // Pequeña pausa para asegurar que se limpie el estado
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const newConversation = await createConversation('Nueva conversación');
      
      // Luego notificamos con la nueva conversación
      if (onConversationSelect) {
        onConversationSelect(newConversation.id);
      }
      
      // Cerrar sidebar en móviles
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error al crear la conversación. Por favor, intenta de nuevo.');
    }
  }, [createConversation, onConversationSelect, onClose]);

  // Delete a specific conversation - usando useCallback
  const handleDeleteConversation = useCallback(async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the conversation select
    
    // Confirm deletion
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta conversación?')) {
      return;
    }
    
    try {
      await deleteConversation(conversationId);
      // If this was the currently selected conversation, notify parent to clear selection
      if (onConversationSelect) {
        onConversationSelect('');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Error al eliminar la conversación. Por favor, intenta de nuevo.');
    }
  }, [deleteConversation, onConversationSelect]);

  // Clear all conversations - usando useCallback
  const handleClearAllConversations = useCallback(async () => {
    const confirmMessage = isLoggedIn 
      ? '¿Estás seguro de que quieres eliminar todas las conversaciones? Esta acción no se puede deshacer.'
      : '¿Estás seguro de que quieres eliminar todas las conversaciones de invitado?';
    
    if (window.confirm(confirmMessage)) {
      try {
        await clearAllConversations();
        // Notify parent component to clear conversation selection
        if (onConversationSelect) {
          onConversationSelect('');
        }
      } catch (error) {
        console.error('Error clearing conversations:', error);
        alert('Error al limpiar las conversaciones. Por favor, intenta de nuevo.');
      }
    }
  }, [isLoggedIn, clearAllConversations, onConversationSelect]);

  // Función para manejar el inicio de sesión
  const handleGuestSignIn = useCallback(() => {
    const currentPath = window.location.pathname;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
  }, [router]);


  // Filter conversations - usando useMemo para evitar recalcular en cada render
  const filteredConversations = useMemo(() => {
    if (!debouncedSearchTerm) return conversations;
    return conversations.filter(conversation => 
      conversation.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [conversations, debouncedSearchTerm]);

  // Memoizar si hay conversaciones para evitar re-renders del botón
  const hasConversations = useMemo(() => conversations.length > 0, [conversations.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header con botón cerrar para móviles */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Conversaciones
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-3 lg:p-4 space-y-3">
        <button
          data-testid="new-conversation"
          onClick={handleNewConversation}
          className="w-full py-3 lg:py-2 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors flex items-center justify-center font-medium text-base lg:text-sm shadow-sm hover:shadow-md"
        >
          <span className="text-xl lg:text-lg mr-2">+</span>
          Nueva Conversación
        </button>
        
        <button
          onClick={handleClearAllConversations}
          className={`w-full py-3 lg:py-2 px-4 border border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center justify-center text-sm font-medium ${
            hasConversations ? 'opacity-100 h-auto visible' : 'opacity-0 h-0 invisible overflow-hidden'
          }`}
          disabled={!hasConversations}
          aria-hidden={!hasConversations}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 lg:w-4 lg:h-4">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M4 7l16 0" />
            <path d="M10 11l0 6" />
            <path d="M14 11l0 6" />
            <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
            <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
          </svg>
          {isLoggedIn 
            ? 'Borrar todas las conversaciones' 
            : 'Borrar todas las conversaciones'
          }
        </button>

        {/* (Sin exportar/importar para invitados) */}
      </div>
      
      {/* Barra de búsqueda */}  
      <div className="px-3 lg:px-4 pb-4">
        <div className="relative">
          <input
            data-testid="sidebar-search"
            type="text"
            placeholder="Buscar conversaciones..."
            className="w-full p-3 lg:p-2 pl-11 lg:pl-10 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base lg:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg 
            className="absolute left-3 lg:left-3 top-3.5 lg:top-2.5 h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
      
        {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 lg:px-4 pb-2 hidden lg:block">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Conversaciones
          </h3>
        </div>        {/* Loading state */}
        <div className={`p-4 text-center text-gray-500 dark:text-gray-400 transition-opacity duration-200 ${
          loading ? 'opacity-100' : 'opacity-0 h-0 invisible overflow-hidden'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
        
        {/* Error state */}
        <div className={`p-4 text-center transition-opacity duration-200 ${
          error ? 'opacity-100' : 'opacity-0 h-0 invisible overflow-hidden'
        }`}>
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-md p-3 text-red-700 dark:text-red-200 text-sm">
            {error}
          </div>
        </div>
        
        {/* Conversaciones */}
        <div className={`space-y-2 px-2 lg:px-2 transition-opacity duration-200 ${
          !loading && !error ? 'opacity-100' : 'opacity-0 h-0 invisible overflow-hidden'
        }`}>
          {filteredConversations.map((conversation) => {
            const aiModel = conversation.settings?.aiModel;
            const handleConversationClick = () => {
              if (onConversationSelect) {
                onConversationSelect(conversation.id);
              }
              // Cerrar sidebar en móviles
              if (onClose) {
                onClose();
              }
            };
            
            return (
            <div 
              key={conversation.id}
              data-testid="conversation-item"
              className="flex items-center group"
            >
              <button
                onClick={handleConversationClick}
                className="flex-1 text-left p-4 lg:p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors truncate"
              >
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="truncate text-base lg:text-sm">{conversation.title || 'Conversación sin título'}</span>
                  {aiModel && (
                    <span className={`text-xs lg:text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                      aiModel === 'python' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {aiModel === 'python' ? 'PY' : 'N8N'}
                    </span>
                  )}
                </div>
                <div className="text-sm lg:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                  {new Date(conversation.updatedAt ?? conversation.createdAt).toLocaleDateString()}
                </div>
              </button>
              <button
                data-testid={`delete-conversation-${conversation.id}`}
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                className="opacity-70 lg:opacity-0 group-hover:opacity-100 p-3 lg:p-2 ml-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg lg:rounded-md transition-all duration-200 flex-shrink-0 active:scale-95"
                title="Eliminar conversación"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="lg:w-4 lg:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M4 7l16 0" />
                  <path d="M10 11l0 6" />
                  <path d="M14 11l0 6" />
                  <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                  <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                </svg>
              </button>
            </div>
            );
          })}
          
          <div className={`p-6 lg:p-6 text-center text-gray-500 dark:text-gray-400 transition-opacity duration-200 ${
            filteredConversations.length === 0 && !loading ? 'opacity-100' : 'opacity-0 h-0 invisible overflow-hidden'
          }`}>
            <div className="text-4xl lg:text-4xl mb-2">💬</div>
            <p className="text-base lg:text-sm">
              {isLoggedIn 
                ? 'No hay conversaciones aún' 
                : 'No hay conversaciones'
              }
            </p>
          </div>
        </div>
      </div>
      
      {/* Aviso de sesión temporal */}
      <div className={`p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700 transition-all duration-200 ${
        !isLoggedIn && conversations.length > 0 ? 'opacity-100 h-auto visible' : 'opacity-0 h-0 invisible overflow-hidden'
      }`}>
        <button 
          onClick={handleGuestSignIn}
          className="w-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          aria-label="Iniciar sesión para guardar conversaciones permanentemente"
        >
          <div className="text-sm lg:text-xs text-center text-orange-800 dark:text-orange-200 flex items-center justify-center gap-2">
            <span>💡</span>
            <span>Inicia sesión para guardar permanentemente</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ConversationSidebar;
