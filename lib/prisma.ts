// Import runtime value safely and types separately to satisfy both TS and Next.js build
import * as Prisma from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

const { PrismaClient } = Prisma;

// Prevent multiple instances of Prisma Client in development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientType | undefined;
}

export const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma as PrismaClientType;
}

export default prisma;
