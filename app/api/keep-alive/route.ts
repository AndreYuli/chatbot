import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_FILE_UPLOAD_URL;
    
    if (!webhookUrl) {
      return NextResponse.json({
        status: 503,
        active: false,
        message: 'Webhook URL no configurada. Configura NEXT_PUBLIC_N8N_FILE_UPLOAD_URL para habilitar el keep-alive.',
        timestamp: new Date().toISOString(),
      });
    }

    console.log('🔄 Keep-alive: Verificando estado del webhook...');

    // Hacer un GET simple para verificar el webhook
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SAGES-Chat-KeepAlive/1.0'
      }
    });

    const responseText = await response.text();
    const isActive = response.status !== 404 && !responseText.includes("Form Trigger isn't listening yet");
    
    console.log(`📡 Keep-alive resultado: ${response.status} - ${isActive ? 'ACTIVO' : 'INACTIVO'}`);
    
    if (!isActive) {
      console.log('⚠️ Webhook inactivo, enviando request de activación...');
      
      // Intentar "despertar" el webhook con un POST
      try {
        const wakeUpResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SAGES-Chat-KeepAlive/1.0'
          },
          body: JSON.stringify({
            keepAlive: true,
            timestamp: new Date().toISOString(),
            source: 'auto-activation'
          })
        });
        
        const wakeUpText = await wakeUpResponse.text();
        const isNowActive = wakeUpResponse.status !== 404 && !wakeUpText.includes("Form Trigger isn't listening yet");
        
        console.log(`🔄 Intento de activación: ${wakeUpResponse.status} - ${isNowActive ? 'ÉXITO' : 'FALLO'}`);
        
        return NextResponse.json({
          status: response.status,
          active: isNowActive,
          message: isNowActive ? 'Webhook activado automáticamente' : 'Webhook necesita Execute step manual en n8n',
          wakeUpAttempt: {
            status: wakeUpResponse.status,
            success: isNowActive
          },
          timestamp: new Date().toISOString()
        });
      } catch (wakeUpError) {
        console.error('❌ Error en intento de activación:', wakeUpError);
      }
    }

    return NextResponse.json({
      status: response.status,
      active: isActive,
      message: isActive ? 'Webhook está activo' : 'Webhook necesita Execute step en n8n',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en keep-alive:', error);
    return NextResponse.json({ 
      status: 500,
      active: false,
      message: 'Error verificando el webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}