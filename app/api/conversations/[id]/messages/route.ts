import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/conversations/[id]/messages - Get all messages for a conversation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conversationId = params.id;
    
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get messages for the conversation, ordered by creation time
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transform messages to match the frontend Message interface
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      role: message.role as 'user' | 'assistant',
      timestamp: message.createdAt.toISOString(), // Serialize as ISO string
      // Handle Json fields properly
      sources: message.sources ? JSON.parse(JSON.stringify(message.sources)) : null,
      usage: message.usage ? JSON.parse(JSON.stringify(message.usage)) : null,
      metadata: message.metadata ? JSON.parse(JSON.stringify(message.metadata)) : null
    }));

    return new Response(JSON.stringify(formattedMessages), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch conversation messages' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
      },
      }
    );
  }
}