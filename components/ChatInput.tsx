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
    <div className="p-2 sm:p-3 lg:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <form onSubmit={onSubmit} className="flex flex-col space-y-2 sm:space-y-3">
        {/* Zona de composición unificada */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-sm">
          {/* Selector de modelo */}
          <ModelSelector
            currentModel={currentModel}
            onModelChange={onModelChange}
            disabled={isLoading || disabled}
          />
          
          {/* Separador */}
          <div className="border-b border-gray-200 dark:border-gray-600"></div>
          
          {/* Área de input */}
          <div className="flex gap-2 p-2 sm:p-3">
          <div className="flex-1 flex gap-1 sm:gap-2 items-center min-w-0">
            <input
              data-testid="chat-input"
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder={disabled ? "Nueva conversación para chatear" : "Escribe tu mensaje..."}
              className="flex-1 px-2 py-2 sm:px-3 sm:py-2 border-0 bg-transparent text-gray-900 dark:text-white focus:outline-none text-sm sm:text-base placeholder-gray-600 dark:placeholder-gray-300 min-w-0"
              disabled={isLoading || disabled}
              aria-label="Escribir mensaje"
              style={{ fontSize: '16px' }} // Previene zoom en iOS
            />
            
            {/* Botón de subir archivos - Solo móvil */}
            <div className="relative sm:hidden flex-shrink-0">
              <input
                type="file"
                id="file-upload-mobile"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isLoading || disabled || isUploading}
                accept=".pdf,.csv"
              />
              <label
                htmlFor="file-upload-mobile"
                className={`p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                  (isLoading || disabled || isUploading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="Adjuntar archivo"
                title="Adjuntar archivo"
              >
                {isUploading ? (
                  <svg 
                    className="animate-spin h-5 w-5" 
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
            
            {/* Botón enviar - Siempre visible en móvil */}
            <button
              data-testid="send-button"
              type="submit"
              disabled={isLoading || !input.trim() || disabled}
              className={`sm:hidden flex-shrink-0 p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center min-w-[44px] min-h-[44px] ${
                isLoading || !input.trim() || disabled
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                  : 'text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
              }`}
              aria-label="Enviar mensaje"
              title="Enviar mensaje"
            >
              {isLoading ? (
                <svg 
                  className="animate-spin h-5 w-5" 
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
                  strokeWidth="2" 
                  viewBox="0 0 24 24"
                >
                  <path d="M4.698 4.034l16.302 7.966l-16.302 7.966a.503 .503 0 0 1 -.546 -.124a.555 .555 0 0 1 -.12 -.568l2.468 -7.274l-2.468 -7.274a.555 .555 0 0 1 .12 -.568a.503 .503 0 0 1 .546 -.124z" />
                  <path d="M6.5 12h14.5" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Botones para desktop - separados */}
          <div className="hidden sm:flex gap-2">
            {/* Botón de subir archivos - desktop */}
            <div className="relative">
              <input
                type="file"
                id="file-upload-desktop"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isLoading || disabled || isUploading}
                accept=".pdf,.csv"
              />
              <label
                htmlFor="file-upload-desktop"
                className={`px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                  (isLoading || disabled || isUploading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="Adjuntar archivo"
                title="Adjuntar archivo"
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
            
            {/* Botón enviar - desktop */}
            <button
              data-testid="send-button send-button-desktop"
              type="submit"
              disabled={isLoading || !input.trim() || disabled}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                isLoading || !input.trim() || disabled
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                  : 'text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
              aria-label="Enviar mensaje"
              title="Enviar mensaje"
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
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M4.698 4.034l16.302 7.966l-16.302 7.966a.503 .503 0 0 1 -.546 -.124a.555 .555 0 0 1 -.12 -.568l2.468 -7.274l-2.468 -7.274a.555 .555 0 0 1 .12 -.568a.503 .503 0 0 1 .546 -.124z" />
                  <path d="M6.5 12h14.5" />
                </svg>
                )}
            </button>
          </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;