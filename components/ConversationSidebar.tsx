'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useSession } from 'next-auth/react';

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
}> = ({ onConversationSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Espera 300ms después de dejar de escribir
  const { data: session } = useSession();
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
      const newConversation = await createConversation('Nueva conversación');
      // Notify parent component to switch to the new conversation
      if (onConversationSelect) {
        onConversationSelect(newConversation.id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error al crear la conversación. Por favor, intenta de nuevo.');
    }
  }, [createConversation, onConversationSelect]);

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
      <div className="p-4 space-y-3">
        <button
          data-testid="new-conversation"
          onClick={handleNewConversation}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center font-medium"
        >
          <span className="text-lg mr-2">+</span>
          Nueva Conversación
        </button>
        
        <button
          onClick={handleClearAllConversations}
          className={`w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center justify-center text-sm font-medium ${
            hasConversations ? 'opacity-100 h-auto visible' : 'opacity-0 h-0 invisible overflow-hidden'
          }`}
          disabled={!hasConversations}
          aria-hidden={!hasConversations}
        >
          <span className="mr-2">🗑️</span>
          {isLoggedIn 
            ? 'Vaciar Chat' 
            : 'Limpiar Sesión'
          }
        </button>
      </div>
      
      {/* Barra de búsqueda */}
      <div className="px-4 pb-4">
        <div className="relative">
          <input
            data-testid="sidebar-search"
            type="text"
            placeholder="Buscar conversaciones..."
            className="w-full p-2 pl-10 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg 
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
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
        <div className="px-4 pb-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isLoggedIn ? 'Conversaciones' : 'Conversaciones (Sesión)'}
          </h3>
        </div>
        
        {/* Loading state */}
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
        <div className={`space-y-2 px-2 transition-opacity duration-200 ${
          !loading && !error ? 'opacity-100' : 'opacity-0 h-0 invisible overflow-hidden'
        }`}>
          {filteredConversations.map((conversation) => {
            const aiModel = conversation.settings?.aiModel;
            return (
            <div 
              key={conversation.id}
              data-testid="conversation-item"
              className="flex items-center group"
            >
              <button
                onClick={() => onConversationSelect && onConversationSelect(conversation.id)}
                className="flex-1 text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors truncate"
              >
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="truncate text-sm">{conversation.title || 'Conversación sin título'}</span>
                  {aiModel && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                      aiModel === 'python' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {aiModel === 'python' ? 'PY' : 'N8N'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                  {new Date(conversation.updatedAt ?? conversation.createdAt).toLocaleDateString()}
                  {!isLoggedIn && (
                    <span className="text-orange-600 dark:text-orange-400">• Sesión</span>
                  )}
                </div>
              </button>
              <button
                data-testid={`delete-conversation-${conversation.id}`}
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                className="opacity-0 group-hover:opacity-100 p-2 ml-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200 flex-shrink-0"
                title="Eliminar conversación"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            );
          })}
          
          <div className={`p-6 text-center text-gray-500 dark:text-gray-400 transition-opacity duration-200 ${
            filteredConversations.length === 0 && !loading ? 'opacity-100' : 'opacity-0 h-0 invisible overflow-hidden'
          }`}>
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">
              {isLoggedIn 
                ? 'No hay conversaciones aún' 
                : 'No hay conversaciones en esta sesión'
              }
            </p>
          </div>
        </div>
      </div>
      
      {/* Aviso de sesión temporal */}
      <div className={`p-4 border-t border-gray-200 dark:border-gray-700 transition-all duration-200 ${
        !isLoggedIn && conversations.length > 0 ? 'opacity-100 h-auto visible' : 'opacity-0 h-0 invisible overflow-hidden'
      }`}>
        <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-md p-3">
          <div className="text-xs text-center text-orange-800 dark:text-orange-200 flex items-center justify-center gap-2">
            <span>💡</span>
            <span>Inicia sesión para guardar permanentemente</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationSidebar;
