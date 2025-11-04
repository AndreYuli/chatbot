'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useConversations } from '@/hooks/useConversations';

interface ChatHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'SAGES Chat';
  const { data: session, status } = useSession();
  const { conversations } = useConversations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'es-ES';
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Determinar si el usuario está activamente usando el chat
  const isActivelyUsing = conversations.length > 0;
  const isGuest = !session?.user?.id;

  const handleSignIn = () => {
    router.push(`/${locale}/auth/signin`);
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    
    // Limpiar localStorage antes de cerrar sesión
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedConversationId');
      localStorage.removeItem('guest_conversations');
      // Limpiar todos los mensajes de invitado
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('guest_messages_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Cerrar sesión y redirigir a la página de inicio de sesión
    await signOut({ 
      callbackUrl: `/${locale}/auth/signin`,
      redirect: true
    });
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-3 lg:px-4 lg:py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
        {/* Botón hamburguesa para móviles */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation min-h-touch"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M4 8l16 0" />
            <path d="M4 16l16 0" />
          </svg>
        </button>
        
        <h1 className="hidden lg:block text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
          {appName}
        </h1>
      </div>
      
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        {/* Loading spinner */}
        {status === 'loading' && (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        )}
        
        {/* Usuario autenticado */}
        {session && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 lg:px-3 lg:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors touch-manipulation"
              aria-label="Menú de usuario"
            >
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user?.name || 'Usuario'}
                  width={32}
                  height={32}
                  className="w-7 h-7 lg:w-8 lg:h-8 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 lg:w-8 lg:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:inline">
                {session?.user?.name || 'Usuario'}
              </span>
              <svg className="w-4 h-4 text-gray-500 hidden md:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                {/* Overlay para cerrar el menú */}
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                
                <div className="absolute right-0 mt-2 w-64 lg:w-56 bg-white dark:bg-gray-800 rounded-xl lg:rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{session?.user?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{session?.user?.email}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Botón "Iniciar sesión" - Siempre visible cuando NO está autenticado */}
        {!session && status !== 'loading' && (
          <button
            onClick={handleSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg lg:rounded-md transition-all text-xs lg:text-sm font-medium shadow-sm hover:shadow touch-manipulation"
          >
            <svg className="w-4 h-4 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Iniciar sesión</span>
            <span className="sm:hidden">Entrar</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;