import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

function getGuestTokenFromReq(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = /guest_token=([^;]+)/.exec(cookieHeader);
  return match?.[1];
}

// GET /api/conversations/[id]/messages - Get all messages for a conversation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conversationId = params.id;
    const session = await getServerSession(authOptions);
    
    console.log('[API] Fetching messages for conversation:', conversationId);
    
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

    // Authorization: ensure user owns it or guest token matches
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (session?.user?.id) {
      if (conversation.userId !== session.user.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      const guestToken = getGuestTokenFromReq(req);
      if (!guestToken || conversation.guestSessionId !== guestToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
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

    console.log('[API] Found messages:', messages.length);

    // Transform messages to match the frontend Message interface
    const formattedMessages = messages.map((message: any) => ({
      id: message.id,
      content: message.content,
      role: message.role as 'user' | 'assistant',
      timestamp: message.createdAt.toISOString(), // Serialize as ISO string
      // Handle Json fields properly
      sources: message.sources ? JSON.parse(JSON.stringify(message.sources)) : null,
      usage: message.usage ? JSON.parse(JSON.stringify(message.usage)) : null,
      metadata: message.metadata ? JSON.parse(JSON.stringify(message.metadata)) : null
    }));

    console.log('[API] Returning formatted messages:', formattedMessages.length);

    return new Response(JSON.stringify(formattedMessages), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching conversation messages:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch conversation messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
      },
      }
    );
  }
}