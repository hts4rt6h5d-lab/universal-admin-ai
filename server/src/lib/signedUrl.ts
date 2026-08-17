import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Local stand-in for S3-style signed URLs (spec section 24: "URLs signées
// temporaires, expiration des URLs"). In production, swap
// services/storage for an S3/R2-backed implementation and use its native
// presigned URLs instead — this HMAC token is the local-disk equivalent.
type Payload = { documentId: string; userId: string; exp: number };

export function signDocumentToken(documentId: string, userId: string, ttlSeconds = 300): string {
  const payload: Payload = { documentId, userId, exp: Date.now() + ttlSeconds * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyDocumentToken(token: string): Payload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', env.SESSION_SECRET).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Payload;
  if (payload.exp < Date.now()) return null;
  return payload;
}
