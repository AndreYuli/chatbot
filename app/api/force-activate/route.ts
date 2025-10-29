import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    const n8nApiKey = process.env.N8N_API_KEY;
    const n8nBaseUrl = process.env.N8N_BASE_URL;
    const workflowId = process.env.N8N_WORKFLOW_ID;
    
    if (!n8nApiKey || !n8nBaseUrl || !workflowId) {
      return NextResponse.json({ 
        success: false,
        message: 'Configuración de n8n incompleta. Define N8N_API_KEY, N8N_BASE_URL y N8N_WORKFLOW_ID para habilitar la activación automática.'
      });
    }

    console.log('🔄 Forzando ejecución del Form Trigger...');

    // Intentar forzar la ejecución del nodo específico
    const executeResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startNodes: [], // Ejecutar desde el trigger
        destinationNode: null
      })
    });

    if (executeResponse.ok) {
      const result = await executeResponse.json();
      console.log('✅ Ejecución forzada exitosa');
      
      return NextResponse.json({
        success: true,
        message: 'Form Trigger activado mediante ejecución forzada',
        executionId: result.id,
        result
      });
    } else {
      const error = await executeResponse.text();
      console.error('❌ Error en ejecución forzada:', error);
      
      // Fallback: intentar reactivar el workflow
      console.log('🔄 Intentando reactivar workflow...');
      
      const reactivateResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${workflowId}/activate`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': n8nApiKey,
          'Content-Type': 'application/json'
        }
      });

      const reactivateResult = await reactivateResponse.json();
      
      return NextResponse.json({
        success: reactivateResponse.ok,
        message: reactivateResponse.ok ? 'Workflow reactivado' : 'Error reactivando workflow',
        fallbackUsed: true,
        result: reactivateResult
      });
    }

  } catch (error) {
    console.error('❌ Error en force-activate:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Error interno al activar el webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}