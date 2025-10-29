import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/conversations/[id] - Get a specific conversation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conversationId = params.id;
    const session = await getServerSession(authOptions);

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

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // If user is logged in, verify they own this conversation
    if (session?.user?.id && conversation.userId !== session.user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to access this conversation' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(JSON.stringify(conversation), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch conversation' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a specific conversation
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Get or create default user
    let user = await prisma.user.findFirst();
    
    if (!user) {
      // Create a default user if none exists
      user = await prisma.user.create({
        data: {
          email: 'default@example.com',
          name: 'Default User',
        },
      });
    }

    // First check if the conversation exists and belongs to the user
    const existingConversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!existingConversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (existingConversation.userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to delete this conversation' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Delete the conversation (messages will be deleted automatically due to cascade)
    await prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    return new Response(JSON.stringify({ message: 'Conversation deleted successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    
    // Check if conversation was not found
    if (error.code === 'P2025') {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to delete conversation' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}