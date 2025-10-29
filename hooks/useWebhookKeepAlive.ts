import { useEffect, useState } from 'react';

interface WebhookStatus {
  active: boolean;
  lastCheck: string;
  error?: string;
}

export function useWebhookKeepAlive(intervalMinutes: number = 5) {
  const [status, setStatus] = useState<WebhookStatus>({
    active: false,
    lastCheck: ''
  });

  const checkWebhook = async () => {
    try {
      const response = await fetch('/api/keep-alive');
      const data = await response.json();
      
      setStatus({
        active: data.active,
        lastCheck: new Date().toLocaleTimeString(),
        error: data.active ? undefined : 'Webhook inactivo - necesita Execute step'
      });

      // Si no está activo, mostrar notificación
      if (!data.active) {
        console.warn('⚠️ Webhook de n8n no está activo. Ve a n8n y haz clic en Execute step.');
      }

    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: 'Error verificando webhook',
        lastCheck: new Date().toLocaleTimeString()
      }));
    }
  };

  useEffect(() => {
    // Verificar inmediatamente
    checkWebhook();

    // Verificar cada X minutos
    const interval = setInterval(checkWebhook, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes]);

  return { status, checkWebhook };
}