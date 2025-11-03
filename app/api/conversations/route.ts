import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

function createSessionCookie(id: string) {
  // Session cookie (no Max-Age) so it clears on browser close
  const secure = process.env.NODE_ENV === 'production';
  return `guest_token=${id}; Path=/; SameSite=Lax; ${secure ? 'Secure; ' : ''}HttpOnly`;
}

async function getOrCreateGuestSession(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = /guest_token=([^;]+)/.exec(cookieHeader);
  let token = match?.[1];
  let setCookie: string | undefined;

  if (!token) {
    token = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + '';
    setCookie = createSessionCookie(token);
    // create GuestSession row
    try {
      await prisma.guestSession.create({
        data: {
          id: token,
        },
      });
    } catch {
      // ignore if already exists
    }
  }

  return { token, setCookie };
}

// GET /api/conversations - Get all conversations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieHeader = req.headers.get('cookie') || '';
    const guestMatch = /guest_token=([^;]+)/.exec(cookieHeader);
    const guestToken = guestMatch?.[1];
    const secure = process.env.NODE_ENV === 'production';
    
    if (session?.user?.id) {
      // If user just logged in and still has a guest_token, migrate conversations
      if (guestToken) {
        try {
          await prisma.$transaction([
            prisma.conversation.updateMany({
              where: { guestSessionId: guestToken, userId: null },
              data: { userId: session.user.id, guestSessionId: null, updatedAt: new Date() },
            }),
            prisma.guestSession.deleteMany({ where: { id: guestToken } }),
          ]);
        } catch (e) {
          console.error('Guest-to-user migration failed:', e);
        }

        // Expire the guest cookie
        const expireCookie = `guest_token=; Path=/; SameSite=Lax; ${secure ? 'Secure; ' : ''}HttpOnly; Max-Age=0`;

        const conversations = await prisma.conversation.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        return new Response(JSON.stringify(conversations), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': expireCookie,
          },
        });
      }
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
      // Guest user - fetch by guest session id
      const { token, setCookie } = await getOrCreateGuestSession(req);
      const conversations = await prisma.conversation.findMany({
        where: { guestSessionId: token },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return new Response(JSON.stringify(conversations), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(setCookie ? { 'Set-Cookie': setCookie } : {}),
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
      // Guest user - create conversation tied to guest session
      const { token, setCookie } = await getOrCreateGuestSession(req);
      const conversation = await prisma.conversation.create({
        data: {
          title: title || 'Nueva conversación',
          guestSessionId: token,
          settings: settings ? JSON.stringify(settings) : undefined,
        },
      });

      return new Response(JSON.stringify(conversation), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...(setCookie ? { 'Set-Cookie': setCookie } : {}),
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
    
    if (session?.user?.id) {
      await prisma.conversation.deleteMany({ where: { userId: session.user.id } });
    } else {
      const { token } = await getOrCreateGuestSession(req);
      await prisma.conversation.deleteMany({ where: { guestSessionId: token } });
    }

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