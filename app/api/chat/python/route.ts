import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// URL del backend Python (ajusta según tu configuración)
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

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
    const body = await req.json();
    const { message, conversationId, settings, history } = body;

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Crear o actualizar conversación en la base de datos
    let dbConversationId = conversationId;
    const cookieHeader = req.headers.get('cookie') || '';
    const guestMatch = /guest_token=([^;]+)/.exec(cookieHeader);
    const guestToken = guestMatch?.[1];

    if (session?.user?.id) {
      if (!conversationId || conversationId.startsWith('temp_')) {
        // Crear nueva conversación
        const conversation = await prisma.conversation.create({
          data: {
            userId: session.user.id,
            title: generateConversationTitle(message),
            settings: JSON.stringify({
              aiModel: 'python',
              ...(settings || {})
            })
          },
        });
        dbConversationId = conversation.id;
      } else {
        const existingConversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!existingConversation || existingConversation.userId !== session.user.id) {
          return new Response(
            JSON.stringify({
              error: 'Conversation not found or not owned by user',
            }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const shouldUpdateTitle =
          !existingConversation.title || existingConversation.title === 'Nueva conversación';

        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            settings: JSON.stringify({
              aiModel: 'python',
              ...(settings || {})
            }),
            ...(shouldUpdateTitle
              ? { title: generateConversationTitle(message) }
              : {}),
          },
        });
      }

      // Guardar mensaje del usuario
      await prisma.message.create({
        data: {
          conversationId: dbConversationId,
          content: message,
          role: 'user',
        },
      });
    } else {
      // Invitado: crear/verificar conversación asociada al guest_token
      let token = guestToken;
      if (!token) {
        token = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 8));
      }

      if (!conversationId || conversationId.startsWith('temp_')) {
        const conversation = await prisma.conversation.create({
          data: {
            guestSessionId: token,
            title: generateConversationTitle(message),
            settings: JSON.stringify({
              aiModel: 'python',
              ...(settings || {})
            })
          },
        });
        dbConversationId = conversation.id;
      } else {
        const existingConversation = await prisma.conversation.findFirst({
          where: { id: conversationId, guestSessionId: token },
        });
        if (!existingConversation) {
          return new Response(
            JSON.stringify({ error: 'Conversation not found for this guest session' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        const shouldUpdateTitle = !existingConversation.title || existingConversation.title === 'Nueva conversación';
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            settings: JSON.stringify({
              aiModel: 'python',
              ...(settings || {})
            }),
            ...(shouldUpdateTitle ? { title: generateConversationTitle(message) } : {}),
          },
        });
      }

      // Guardar mensaje del usuario
      await prisma.message.create({
        data: {
          conversationId: dbConversationId,
          content: message,
          role: 'user',
        },
      });
    }

    // Crear stream para la respuesta
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Llamar al backend Python
          const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              conversation_id: dbConversationId,
              history: history || [], // Send conversation history
              settings: {
                top_k: settings?.topK || 5,
                temperature: settings?.temperature || 0.7,
              }
            }),
          });

          if (!pythonResponse.ok) {
            throw new Error(`Python backend error: ${pythonResponse.status}`);
          }

          // Si el backend Python soporta streaming
          if (pythonResponse.body) {
            const reader = pythonResponse.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              
              // Si el backend Python envía JSON con formato específico
              try {
                const data = JSON.parse(chunk);
                
                if (data.content) {
                  accumulatedContent += data.content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'message',
                      data: { content: data.content }
                    })}\n\n`)
                  );
                }

                if (data.sources) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'sources',
                      data: { sources: data.sources }
                    })}\n\n`)
                  );
                }
              } catch {
                // Si no es JSON, enviar el chunk directamente
                accumulatedContent += chunk;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'message',
                    data: { content: chunk }
                  })}\n\n`)
                );
              }
            }

            // Guardar respuesta del asistente
            if (accumulatedContent) {
              await prisma.message.create({
                data: {
                  conversationId: dbConversationId,
                  content: accumulatedContent,
                  role: 'assistant',
                },
              });
              
              // Actualizar timestamp de la conversación después de guardar el mensaje
              await prisma.conversation.update({
                where: { id: dbConversationId },
                data: { updatedAt: new Date() }
              });
            }

            // Enviar evento de completado
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                data: { conversationId: dbConversationId }
              })}\n\n`)
            );
          } else {
            // Si el backend no soporta streaming, obtener respuesta completa
            const data = await pythonResponse.json();
            const content = data.response || data.message || data.content || '';

            // Enviar contenido
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'message',
                data: { content }
              })}\n\n`)
            );

            // Enviar fuentes si existen
            if (data.sources) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'sources',
                  data: { sources: data.sources }
                })}\n\n`)
              );
            }

            // Guardar respuesta del asistente
            if (content) {
              await prisma.message.create({
                data: {
                  conversationId: dbConversationId,
                  content,
                  role: 'assistant',
                },
              });
              
              // Actualizar timestamp de la conversación después de guardar el mensaje
              await prisma.conversation.update({
                where: { id: dbConversationId },
                data: { updatedAt: new Date() }
              });
            }

            // Enviar evento de completado
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                data: { conversationId: dbConversationId }
              })}\n\n`)
            );
          }

          controller.close();
        } catch (error) {
          console.error('Error in Python backend stream:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              data: { 
                message: error instanceof Error ? error.message : 'Error en el backend Python'
              }
            })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in Python chat route:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
