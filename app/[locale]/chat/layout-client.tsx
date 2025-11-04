'use client';

import { createContext, useContext, useState } from 'react';
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

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="flex h-screen h-[100dvh] bg-gray-50 dark:bg-gray-900 overflow-hidden">
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