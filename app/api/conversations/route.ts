import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/conversations - Get all conversations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      // User is logged in - get their conversations from database
      const conversations = await prisma.conversation.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      return new Response(JSON.stringify(conversations), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Guest user - return empty array (they use localStorage)
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch conversations' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { title, settings } = body || {};

    if (session?.user?.id) {
      // User is logged in - create conversation in database
      const conversation = await prisma.conversation.create({
        data: {
          title: title || 'Nueva conversación',
          userId: session.user.id,
          settings: settings ? JSON.stringify(settings) : undefined,
        },
      });

      return new Response(JSON.stringify(conversation), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Guest user - return a temporary conversation object
      const tempConversation = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title || 'Nueva conversación',
        userId: 'guest',
        settings: settings ? JSON.stringify(settings) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return new Response(JSON.stringify(tempConversation), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    
    // Check if it's a Prisma error
    if (error.code === 'P2003') {
      return new Response(
        JSON.stringify({ 
          error: 'Database constraint error',
          details: 'Foreign key constraint failed - user may not exist'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to create conversation' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// DELETE /api/conversations - Delete all conversations
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Delete only conversations belonging to the current user
    await prisma.conversation.deleteMany({
      where: {
        userId: session.user.id,
      },
    });
    
    return new Response(JSON.stringify({ message: 'All conversations deleted successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error deleting all conversations:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to delete all conversations' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}