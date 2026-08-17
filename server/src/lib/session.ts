import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';

const SESSION_COOKIE = 'uaa_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// We never store the raw session token — only its hash. A stolen database
// backup then can't be replayed as a live session (same principle as
// password hashing, applied to bearer tokens).
function hashToken(token: string): string {
  return crypto.createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

export async function createSession(params: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}) {
  const token = crypto.randomBytes(32).toString('base64url');
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash: hashToken(token),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceId: params.deviceId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token, session };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export async function getSessionFromRequest(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.deletedAt) return null;
  return session;
}

export async function revokeSession(sessionId: string) {
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
