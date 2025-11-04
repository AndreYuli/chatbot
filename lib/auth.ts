import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

// Soft env reader: in development, don't crash the whole app if Google creds are missing
const readEnvSoft = (key: string, { requiredInProd = true }: { requiredInProd?: boolean } = {}) => {
  const val = process.env[key];
  if (!val) {
    if (process.env.NODE_ENV === 'production' && requiredInProd) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    // Return a placeholder to allow the dev server to boot; login will fail until configured
    console.warn(`[auth] Env var ${key} missing. Using placeholder for development.`);
    return `missing_${key}`;
  }
  return val;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      // Do not hard-fail during Docker build when GOOGLE_* are not provided yet.
      // In runtime (container), these envs will be present via docker-compose.
      // Setting requiredInProd: false lets the build complete; Google login will be disabled until envs are set.
      clientId: readEnvSoft('GOOGLE_CLIENT_ID', { requiredInProd: false }),
      clientSecret: readEnvSoft('GOOGLE_CLIENT_SECRET', { requiredInProd: false }),
    }),
  ],
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        // Expose user.id on the session for API authorization
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/es-ES/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug in production to avoid conflicts
};
