'use client';

import ChatHeader from '@/components/ChatHeader';

export default function ChatLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col">
        <ChatHeader 
          sidebarOpen={true} 
          setSidebarOpen={() => {}} 
        />
        
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}