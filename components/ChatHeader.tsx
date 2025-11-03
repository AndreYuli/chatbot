'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

interface ChatHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Qoder Chat';
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'es-ES';
  const [showUserMenu, setShowUserMenu] = useState(false);

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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 lg:p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Botón hamburguesa solo en móvil */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Abrir menú"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        
        <h1 className="text-base lg:text-2xl font-bold text-gray-900 dark:text-white">
          {appName}
        </h1>
      </div>
      
      <div className="flex items-center space-x-2 lg:space-x-4">
        {/* Loading spinner - oculto con CSS en lugar de renderizado condicional */}
        <div className={`transition-opacity duration-200 ${
          status === 'loading' ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden invisible'
        }`}>
          <div className="w-5 h-5 lg:w-6 lg:h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        
        {/* Usuario autenticado - oculto con CSS */}
        <div className={`relative transition-opacity duration-200 ${
          session ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden invisible'
        }`}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 lg:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user?.name || 'Usuario'}
                width={24}
                height={24}
                className="w-6 h-6 lg:w-7 lg:h-7 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 lg:w-7 lg:h-7 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
              {session?.user?.name || 'Usuario'}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <div className="font-medium">{session?.user?.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
        
        {/* Botón iniciar sesión - oculto con CSS - responsive */}
        <button
          onClick={handleSignIn}
          disabled={status === 'loading' || !!session}
          aria-hidden={status === 'loading' || !!session}
          className={`px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 text-xs lg:text-sm font-medium ${
            !session && status !== 'loading' ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden invisible'
          }`}
        >
          Iniciar sesión
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;