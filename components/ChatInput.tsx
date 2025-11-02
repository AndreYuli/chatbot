'use client';

import React, { useState, useEffect } from 'react';
import ModelSelector, { AIModel } from './ModelSelector';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent, model: AIModel) => void;
  isLoading: boolean;
  disabled?: boolean;
  currentModel: AIModel;
  onModelChange: (model: AIModel) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  disabled = false,
  currentModel,
  onModelChange
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'active' | 'inactive'>('checking');
  
  // Verificar y activar webhook automáticamente
  useEffect(() => {
    const checkAndActivateWebhook = async () => {
      try {
        // Verificar estado actual
        const keepAliveResponse = await fetch('/api/keep-alive');
        const keepAliveResult = await keepAliveResponse.json();
        
        if (!keepAliveResult.active) {
          console.log('⚠️ Webhook inactivo, intentando activación automática...');
          
          // Intentar activación forzada
          const forceResponse = await fetch('/api/force-activate', { method: 'POST' });
          const forceResult = await forceResponse.json();
          
          if (forceResult.success) {
            console.log('✅ Webhook activado automáticamente');
            setWebhookStatus('active');
          } else {
            console.log('❌ No se pudo activar automáticamente');
            setWebhookStatus('inactive');
          }
        } else {
          setWebhookStatus('active');
        }
      } catch (error) {
        console.error('❌ Error verificando webhook:', error);
        setWebhookStatus('inactive');
      }
    };

    // Verificar al cargar el componente
    checkAndActivateWebhook();
    
    // Verificar cada 2 minutos
    const interval = setInterval(checkAndActivateWebhook, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const onSubmit = (e: React.FormEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    handleSubmit(e, currentModel);
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const allowedTypes = ['.pdf', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      alert(`❌ Tipo de archivo no permitido. Solo se aceptan: ${allowedTypes.join(', ')}`);
      return;
    }
    
    console.log('📤 Subiendo archivo:', {
      nombre: file.name,
      tamaño: file.size,
      tipo: file.type,
      modelo: currentModel
    });
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', currentModel); // Pasar el modelo seleccionado
      
      // Usar nuestro proxy que enrutará según el modelo
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      console.log('📥 Respuesta del proxy:', {
        status: response.status,
        data: result
      });
      
      if (response.ok && result.success) {
        console.log('✅ Archivo subido exitosamente');
        alert('✅ Archivo subido exitosamente');
      } else {
        console.error('❌ Error:', result);
        alert(`❌ ${result.error || 'Error al subir archivo'}`);
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`❌ Error de conexión: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };
  
  return (
    <div className="p-4">
      <form onSubmit={onSubmit} className="flex flex-col space-y-3">
        {/* Selector de modelo */}
        <ModelSelector
          currentModel={currentModel}
          onModelChange={onModelChange}
          disabled={isLoading || disabled}
        />
        
        <div className="flex space-x-2">
          <input
            data-testid="chat-input"
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={disabled ? "Crea una nueva conversación para empezar a chatear" : "Escribe tu mensaje aquí..."}
            className="flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || disabled}
          />
          
          {/* Botón de subir archivos */}
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isLoading || disabled || isUploading}
              accept=".pdf,.csv"
            />
            <label
              htmlFor="file-upload"
              className={`px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                (isLoading || disabled || isUploading) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <svg 
                  className="animate-spin h-5 w-5 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg 
                  className="h-5 w-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              )}
            </label>
          </div>
          
          {/* Botón enviar */}
          <button
            data-testid="send-button"
            type="submit"
            disabled={isLoading || !input.trim() || disabled}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <svg 
                className="animate-spin h-5 w-5 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                ></circle>
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;