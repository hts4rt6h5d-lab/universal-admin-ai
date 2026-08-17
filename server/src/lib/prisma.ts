import { PrismaClient } from '@prisma/client';

// A single shared client (Prisma's recommended pattern) so connection
// pooling works correctly under concurrent requests.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
