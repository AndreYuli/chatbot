'use client';

import { useState } from 'react';
import ChatHeader from '@/components/ChatHeader';
import ConversationSidebar from '@/components/ConversationSidebar';

export default function ChatLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar de conversaciones - móvil */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black opacity-50"
          onClick={() => setSidebarOpen(false)}
        ></div>
        
        {/* Sidebar */}
        <div className="relative w-64 h-full bg-white dark:bg-gray-800">
          <ConversationSidebar />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header único - responsive para móvil y desktop */}
        <ChatHeader 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />
        
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}