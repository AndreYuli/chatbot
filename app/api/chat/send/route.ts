import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

type ConversationRecord = Awaited<ReturnType<typeof prisma.conversation.findUnique>>;

export const runtime = 'nodejs'; // SSE estable

// Función helper para generar un título conversacional
function generateConversationTitle(message: string): string {
  // Limpiar el mensaje
  const cleanMessage = message.trim();
  
  // Si el mensaje es muy corto (menos de 10 caracteres), usarlo completo
  if (cleanMessage.length <= 10) {
    return cleanMessage;
  }
  
  // Si el mensaje es una pregunta, usar hasta el signo de interrogación
  if (cleanMessage.includes('?')) {
    const questionPart = cleanMessage.split('?')[0] + '?';
    if (questionPart.length <= 60) {
      return questionPart;
    }
  }
  
  // Buscar patrones comunes y generar títulos descriptivos
  const lowerMessage = cleanMessage.toLowerCase();
  
  // Patrones de preguntas sobre lecciones
  if (lowerMessage.match(/lecci[oó]n\s*\d+/)) {
    const match = cleanMessage.match(/lecci[oó]n\s*\d+/i);
    if (match) {
      return `Pregunta sobre ${match[0]}`;
    }
  }
  
  // Patrones de temas de Escuela Sabática
  if (lowerMessage.includes('escuela sab')) {
    return 'Consulta sobre Escuela Sabática';
  }
  
  // Patrones generales de preguntas
  if (lowerMessage.startsWith('qué') || lowerMessage.startsWith('que')) {
    return cleanMessage.substring(0, 50) + (cleanMessage.length > 50 ? '...' : '');
  }
  
  if (lowerMessage.startsWith('cómo') || lowerMessage.startsWith('como')) {
    return cleanMessage.substring(0, 50) + (cleanMessage.length > 50 ? '...' : '');
  }
  
  if (lowerMessage.startsWith('cuál') || lowerMessage.startsWith('cual')) {
    return cleanMessage.substring(0, 50) + (cleanMessage.length > 50 ? '...' : '');
  }
  
  if (lowerMessage.startsWith('cuándo') || lowerMessage.startsWith('cuando')) {
    return cleanMessage.substring(0, 50) + (cleanMessage.length > 50 ? '...' : '');
  }
  
  if (lowerMessage.startsWith('dónde') || lowerMessage.startsWith('donde')) {
    return cleanMessage.substring(0, 50) + (cleanMessage.length > 50 ? '...' : '');
  }
  
  if (lowerMessage.startsWith('por qué') || lowerMessage.startsWith('por que')) {
    return cleanMessage.substring(0, 50) + (cleanMessage.length > 50 ? '...' : '');
  }
  
  // Para otros casos, usar las primeras palabras significativas
  const words = cleanMessage.split(/\s+/);
  if (words.length <= 8) {
    return cleanMessage;
  }
  
  // Tomar las primeras 8 palabras
  return words.slice(0, 8).join(' ') + '...';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Parse the request body properly - clone first to avoid body lock issues
    const body = await req.clone().json();
    const { message, conversationId, settings } = body;
    const normalizedConversationId: string | null = conversationId ?? null;

    const userId = session?.user?.id ?? null;
    const isGuest = !userId;
    const isGuestConversation =
      isGuest || !normalizedConversationId || normalizedConversationId.startsWith('temp_');
    
    // Get environment variables
    const n8nBaseUrl = process.env.N8N_BASE_URL;
    const n8nWebhookPath = process.env.N8N_WEBHOOK_PATH;
    const n8nApiKey = process.env.N8N_API_KEY;
    
    // Only using n8n - remove model selection
    const selectedModel = 'n8n';
    
    let conversationIdToUse = normalizedConversationId;
    let conversation: ConversationRecord | null = null;

    if (!isGuest) {
      if (!conversationIdToUse) {
        const created = await prisma.conversation.create({
          data: {
            title: generateConversationTitle(message),
            userId,
            settings: JSON.stringify({ model: selectedModel }),
          },
        });
        conversation = created;
        conversationIdToUse = created.id;
      } else {
        conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationIdToUse,
            userId,
          },
        });

        if (!conversation) {
          return new Response(
            `data: ${JSON.stringify({
              type: 'error',
              data: {
                message: 'No encontramos esta conversación. Por favor, crea una nueva.',
                code: 'CONVERSATION_NOT_FOUND'
              }
            })}\n\n`,
            {
              status: 404,
              headers: { 'Content-Type': 'text/event-stream' }
            }
          );
        }

        if (!conversation.title || conversation.title === 'Nueva conversación') {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              title: generateConversationTitle(message),
            },
          });

          const refreshed = await prisma.conversation.findUnique({
            where: { id: conversation.id },
          });

          conversation = refreshed ?? conversation;
        }
      }
    } else if (!conversationIdToUse) {
      // Guest users keep everything en memoria; generamos un id temporal consistente mientras dure la sesión.
      conversationIdToUse = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    if (conversation) {
      await prisma.message.create({
        data: {
          content: message,
          role: 'user',
          conversationId: conversation.id,
        },
      });
    }
    
    // Validate n8n configuration
    if (!n8nBaseUrl || !n8nWebhookPath) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          data: {
            message: 'n8n configuration is missing',
            code: 'N8N_CONFIG_ERROR'
          }
        })}\n\n`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/event-stream' }
        }
      );
    }
    
    // Prepare the request to n8n
    const n8nRequest = {
      chatInput: message,
      topK: settings?.topK ?? 5,
      temperature: settings?.temperature ?? 0.7,
      model: selectedModel,
      history: [],
      metadata: { source: 'webapp', appVersion: process.env.APP_VERSION || '1.0.0' }
    };
    
    // Make the request to n8n
    const res = await fetch(n8nBaseUrl + n8nWebhookPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(n8nApiKey ? { Authorization: `Bearer ${n8nApiKey}` } : {})
      },
      body: JSON.stringify(n8nRequest)
    });
    
    if (!res.ok) {
      const text = await res.text();
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          data: {
            message: text,
            code: 'N8N_SERVICE_ERROR'
          }
        })}\n\n`,
        {
          status: res.status,
          headers: { 'Content-Type': 'text/event-stream' }
        }
      );
    }
    
    const rawData = await res.json(); // bloque: [{ output, sources?, usage? }]
    
    // Handle array response from n8n
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    
    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const push = (obj: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        
        try {
          // Check if data has the expected structure
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid response from n8n');
          }
          
          // Send the message content in chunks
          // Handle different possible response formats
          const output = data.output || data.answer || data.text || 'No response from AI';
          
          // Ensure output is a string before trying to match
          if (typeof output !== 'string') {
            throw new Error('Invalid output format from n8n');
          }
          
          const chunks = output.match(/[\s\S]{1,750}/g) ?? [];
          for (const chunk of chunks) {
            push({ type: 'message', data: { content: chunk } });
            // Add a small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          // Send sources if available
          if (data.sources && Array.isArray(data.sources)) {
            push({ type: 'sources', data: { sources: data.sources } });
          }
          
          // Send usage if available
          if (data.usage && typeof data.usage === 'object') {
            push({ type: 'usage', data: { usage: data.usage } });
          }
          
          // Save assistant message to database
          const completePayload: any = {
            type: 'complete',
            data: {
              ok: true,
              conversationId: conversationIdToUse,
            },
          };

          if (conversation) {
            const assistantMessage = await prisma.message.create({
              data: {
                content: output,
                role: 'assistant',
                conversationId: conversation.id,
                // Handle Json fields properly - use undefined instead of null
                sources: data.sources ? JSON.stringify(data.sources) : undefined,
                usage: data.usage ? JSON.stringify(data.usage) : undefined,
                metadata: JSON.stringify({ source: 'webapp', appVersion: process.env.APP_VERSION || '1.0.0' })
              },
            });

            completePayload.data.messageId = assistantMessage.id;
          }

          push(completePayload);
        } catch (error) {
          push({
            type: 'error',
            data: {
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'STREAM_ERROR'
            }
          });
        } finally {
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    
    return new Response(
      `data: ${JSON.stringify({
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'API_ERROR'
        }
      })}\n\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream' }
      }
    );
  }
}