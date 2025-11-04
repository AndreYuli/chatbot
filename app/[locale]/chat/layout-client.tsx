'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import ChatHeader from '@/components/ChatHeader';

// Contexto para el sidebar
const SidebarContext = createContext<{
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
} | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default function ChatLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fix viewport height para móviles
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div 
        className="flex bg-gray-50 dark:bg-gray-900 overflow-hidden" 
        style={{ 
          height: 'calc(var(--vh, 1vh) * 100)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          <ChatHeader 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
          />
          
          <main className="flex-1 overflow-hidden min-h-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}