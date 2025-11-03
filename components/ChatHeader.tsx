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
        {/* Loading spinner - oculto con CSS en lugar de renderizado condicional */}
        <div className={`transition-opacity duration-200 ${
          status === 'loading' ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden invisible'
        }`}>
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        
        {/* Usuario autenticado - oculto con CSS */}
        <div className={`relative transition-opacity duration-200 ${
          session ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden invisible'
        }`}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors duration-200 touch-manipulation min-h-touch"
            aria-label="Menú de usuario"
          >
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user?.name || 'Usuario'}
                width={32}
                height={32}
                className="w-8 h-8 lg:w-6 lg:h-6 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 lg:w-6 lg:h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm lg:text-xs font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:block">
              {session?.user?.name || 'Usuario'}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 lg:w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 lg:py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <div className="font-medium text-base lg:text-sm">{session?.user?.name}</div>
                <div className="text-sm lg:text-xs text-gray-500 dark:text-gray-400 truncate">{session?.user?.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-3 lg:py-2 text-base lg:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
        
        {/* Botón de invitado clickeable para iniciar sesión */}
        <div className={`transition-opacity duration-200 ${
          isGuest && isActivelyUsing ? 'opacity-100 flex items-center' : 'opacity-0 w-0 h-0 overflow-hidden invisible'
        }`}>
          <button
            onClick={handleSignIn}
            className="flex items-center gap-1 lg:gap-2 px-2 py-1 lg:px-3 lg:py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-lg text-xs lg:text-sm transition-colors duration-200 touch-manipulation min-h-touch"
            title="Iniciar sesión para guardar conversaciones"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
              <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
            </svg>
            <span className="font-medium hidden sm:inline">Invitado</span>
            <svg className="w-3 h-3 opacity-60 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Botón iniciar sesión - solo mostrar si NO está usando el chat */}
        <button
          onClick={handleSignIn}
          disabled={status === 'loading' || !!session}
          aria-hidden={status === 'loading' || !!session || isActivelyUsing}
          className={`px-3 py-2 lg:px-4 lg:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-all duration-200 text-sm lg:text-sm font-medium shadow-sm hover:shadow-md touch-manipulation min-h-touch ${
            !session && status !== 'loading' && !isActivelyUsing ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden invisible'
          }`}
        >
          Iniciar sesión
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;