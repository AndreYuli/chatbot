import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    const n8nApiKey = process.env.N8N_API_KEY;
    const n8nBaseUrl = process.env.N8N_BASE_URL;
    
    if (!n8nApiKey || !n8nBaseUrl) {
      return NextResponse.json({ 
        error: 'N8N_API_KEY o N8N_BASE_URL no configurados' 
      }, { status: 500 });
    }

    // Este endpoint necesitaría el ID del workflow
    // Para obtenerlo, primero necesitarías hacer GET /api/v1/workflows
    const workflowId = 'TU_WORKFLOW_ID'; // Reemplazar con el ID real
    
    console.log('🔄 Intentando activar webhook automáticamente...');

    // Activar el workflow
    const activateResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (activateResponse.ok) {
      console.log('✅ Webhook activado automáticamente');
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook activado automáticamente' 
      });
    } else {
      const error = await activateResponse.text();
      console.error('❌ Error activando webhook:', error);
      return NextResponse.json({ 
        error: 'Error activando webhook',
        details: error 
      }, { status: activateResponse.status });
    }

  } catch (error) {
    console.error('❌ Error en auto-activate:', error);
    return NextResponse.json({ 
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}