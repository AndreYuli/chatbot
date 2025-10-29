import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './navigation';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // If the path is exactly "/", redirect to default locale signin page
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/es-ES/auth/signin', request.url));
  }
  
  // Otherwise, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  // Skip all paths that should not be internationalized
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};