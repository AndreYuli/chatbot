'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestStoragePage() {
  const { data: session } = useSession();
  const [storageData, setStorageData] = useState<any>({});
  const [testMessage, setTestMessage] = useState('');
  const isGuest = !session?.user?.id;

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = () => {
    const data: any = {};
    
    // Cargar conversaciones de invitado
    const convos = localStorage.getItem('guest_conversations');
    if (convos) {
      data.conversations = JSON.parse(convos);
    }

    // Cargar todos los mensajes
    data.messages = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('guest_messages_')) {
        const value = localStorage.getItem(key);
        if (value) {
          data.messages[key] = JSON.parse(value);
        }
      }
    }

    setStorageData(data);
  };

  const testSave = () => {
    const testConvId = `temp_test_${Date.now()}`;
    const testMessages = [
      {
        id: '1',
        content: testMessage || 'Mensaje de prueba',
        role: 'user',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        content: 'Respuesta de prueba',
        role: 'assistant',
        timestamp: new Date().toISOString()
      }
    ];

    // Guardar conversación
    const convos = localStorage.getItem('guest_conversations');
    const parsed = convos ? JSON.parse(convos) : [];
    parsed.unshift({
      id: testConvId,
      title: 'Conversación de prueba',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'guest',
      settings: JSON.stringify({ aiModel: 'n8n' })
    });
    localStorage.setItem('guest_conversations', JSON.stringify(parsed));

    // Guardar mensajes
    localStorage.setItem(`guest_messages_${testConvId}`, JSON.stringify(testMessages));

    alert('✅ Conversación de prueba guardada: ' + testConvId);
    loadStorageData();
  };

  const clearAll = () => {
    if (confirm('¿Borrar todos los datos de invitado?')) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('guest_')) {
          keys.push(key);
        }
      }
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('selectedConversationId');
      alert(`Borrados ${keys.length} items`);
      loadStorageData();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test de localStorage</h1>

      <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
        <h2 className="font-bold mb-2">Estado de sesión:</h2>
        <p>✓ Session: {session ? 'Autenticado' : 'No autenticado'}</p>
        <p>✓ User ID: {session?.user?.id || 'N/A'}</p>
        <p>✓ Es invitado: {isGuest ? 'SÍ ✅' : 'NO ❌'}</p>
        <p>✓ Email: {session?.user?.email || 'N/A'}</p>
      </div>

      <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-6">
        <h2 className="font-bold mb-2">Prueba de guardado:</h2>
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="Escribe un mensaje de prueba"
          className="border p-2 rounded w-full mb-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <button
          onClick={testSave}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2 hover:bg-blue-700"
        >
          💾 Guardar conversación de prueba
        </button>
        <button
          onClick={loadStorageData}
          className="bg-green-600 text-white px-4 py-2 rounded mr-2 hover:bg-green-700"
        >
          🔄 Recargar datos
        </button>
        <button
          onClick={clearAll}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          🗑️ Borrar todo
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <h2 className="font-bold mb-4">📋 Conversaciones guardadas:</h2>
        {storageData.conversations?.length > 0 ? (
          <div className="space-y-2">
            {storageData.conversations.map((conv: any) => {
              const msgCount = storageData.messages[`guest_messages_${conv.id}`]?.length || 0;
              return (
                <div key={conv.id} className="border p-3 rounded dark:border-gray-600">
                  <p className="font-semibold">{conv.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">ID: {conv.id}</p>
                  <p className="text-sm">
                    <span className={msgCount > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                      {msgCount} mensajes guardados
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No hay conversaciones guardadas</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="font-bold mb-4">💬 Mensajes guardados:</h2>
        {Object.keys(storageData.messages || {}).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(storageData.messages || {}).map(([key, messages]: [string, any]) => (
              <div key={key} className="border p-3 rounded dark:border-gray-600">
                <p className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">{key}</p>
                <p className="font-semibold mb-2">
                  {messages.length} mensaje{messages.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {messages.map((msg: any, idx: number) => (
                    <div key={idx} className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <strong className={msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}>
                        {msg.role}:
                      </strong>{' '}
                      {msg.content.substring(0, 100)}
                      {msg.content.length > 100 ? '...' : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay mensajes guardados</p>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
        <h3 className="font-bold mb-2">🔍 Instrucciones:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Verifica que &quot;Es invitado&quot; diga &quot;SÍ ✅&quot;</li>
          <li>Haz clic en &quot;Guardar conversación de prueba&quot;</li>
          <li>Deberías ver 1 conversación con 2 mensajes</li>
          <li>Si funciona aquí pero no en el chat, el problema es en useChat</li>
          <li>Abre la consola (F12) para ver logs adicionales</li>
        </ol>
      </div>
    </div>
  );
}
