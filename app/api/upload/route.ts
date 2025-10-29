import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    // Single path: n8n only (Python backend removed)
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('📤 Archivo a subir (n8n):', {
      nombre: file.name,
      tamaño: file.size
    });
    
    // Unico manejador: n8n
    return await handleN8nUpload(file);
    
  } catch (error) {
    console.error('❌ Error en el proxy de upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar la carga de archivo', 
        details: errorMessage
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Manejador para n8n
async function handleN8nUpload(file: File) {
  try {
    // Buscar si existe una URL de webhook para upload en n8n
    const n8nUploadWebhook = process.env.N8N_UPLOAD_WEBHOOK_PATH;
    const n8nBaseUrl = process.env.N8N_BASE_URL;
    
    if (!n8nUploadWebhook || !n8nBaseUrl) {
      console.warn('⚠️  No hay webhook de upload configurado para n8n');
      return new Response(
        JSON.stringify({ 
          error: 'Upload para n8n no está configurado',
          message: 'Configura N8N_BASE_URL y N8N_UPLOAD_WEBHOOK_PATH en el .env'
        }), 
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const uploadUrl = n8nBaseUrl + n8nUploadWebhook;
    
    console.log('🔄 Enviando archivo a n8n:', {
      fileName: file.name,
      fileSize: file.size,
      url: uploadUrl
    });
    
    // Crear FormData para enviar a n8n
    const n8nFormData = new FormData();
    n8nFormData.append('file', file);
    
    // Hacer el request a n8n
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: n8nFormData,
    });
    
    console.log('📥 Respuesta de n8n:', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Archivo subido exitosamente a n8n');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Archivo subido exitosamente al workflow n8n',
          ...result
        }), 
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    } else {
      const errorText = await response.text();
      console.error('❌ Error de n8n:', response.status, errorText);
      
      let errorMessage = `Error del servicio n8n: ${response.status}`;
      if (response.status === 404) {
        errorMessage = 'El webhook de upload no se encuentra en n8n. Verifica que el workflow esté activo.';
      } else if (response.status === 400) {
        errorMessage = 'Archivo inválido. Verifica el formato esperado por n8n.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorText
        }), 
        { 
          status: response.status, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('❌ Error conectando con n8n:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return new Response(
      JSON.stringify({ 
        error: 'No se pudo conectar al servicio n8n',
        details: errorMessage
      }), 
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}