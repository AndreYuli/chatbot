'use client';

import React, { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useSession } from 'next-auth/react';

const ConversationSidebar: React.FC<{
  onConversationSelect?: (conversationId: string) => void;
}> = ({ onConversationSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
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

  // Create a new conversation
  const handleNewConversation = async () => {
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
  };

  // Delete a specific conversation
  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
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
  };

  // Clear all conversations
  const handleClearAllConversations = async () => {
    if (conversations.length === 0) return;
    
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
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation => {
    if (!searchTerm) return true;
    return conversation.title?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <button
          data-testid="new-conversation"
          onClick={handleNewConversation}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 flex items-center justify-center mb-2"
        >
          <span>+ </span>
          Nueva Conversación
        </button>
        
        {conversations.length > 0 && (
          <button
            onClick={handleClearAllConversations}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200 flex items-center justify-center text-sm"
          >
            <span>🗑️ </span>
            {isLoggedIn 
              ? 'Vaciar Chat' 
              : 'Limpiar Sesión'
            }
          </button>
        )}
      </div>
      
      <div className="px-4 pb-4">
        <div className="relative">
          <input
            data-testid="sidebar-search"
            type="text"
            placeholder="Buscar conversaciones"
            className="w-full p-2 pl-10 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-2">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isLoggedIn ? 'Conversaciones' : 'Conversaciones (Sesión)'}
          </h3>
        </div>
        
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Cargando...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500 dark:text-red-400">
            {error}
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {filteredConversations.map((conversation) => (
              <div 
                key={conversation.id} 
                className="flex items-center group"
              >
                <button
                  onClick={() => onConversationSelect && onConversationSelect(conversation.id)}
                  className="flex-1 text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 truncate"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {conversation.title || 'Conversación sin título'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    {new Date(conversation.createdAt).toLocaleDateString()}
                    {!isLoggedIn && (
                      <span className="text-orange-500">• Sesión</span>
                    )}
                  </div>
                </button>
                <button
                  data-testid={`delete-conversation-${conversation.id}`}
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  className="opacity-30 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200 flex-shrink-0"
                  title="Eliminar conversación"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            
            {filteredConversations.length === 0 && !loading && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {isLoggedIn 
                  ? 'No hay conversaciones aún' 
                  : 'No hay conversaciones en esta sesión'
                }
              </div>
            )}
          </div>
        )}
      </div>
      
      {!isLoggedIn && conversations.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-center text-orange-600 dark:text-orange-400">
            💡 Inicia sesión para guardar tus conversaciones permanentemente
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationSidebar;
