import type { NextFunction, Request, Response } from 'express';
import { getSessionFromRequest } from '../lib/session.js';
import { Errors } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; role: 'USER' | 'ADMIN'; countryCode: string; locale: string };
    sessionId?: string;
  }
}

// Attaches req.user when a valid session cookie is present; does not
// itself reject the request (some routes are optionally-authenticated).
export const attachUser = asyncHandler(async (req, _res, next) => {
  const session = await getSessionFromRequest(req);
  if (session) {
    req.user = {
      id: session.user.id,
      role: session.user.role,
      countryCode: session.user.countryCode,
      locale: session.user.locale,
    };
    req.sessionId = session.id;
  }
  next();
});

// The actual gate: every route that touches user data uses this, so
// "forgot to check auth" can't happen route-by-route.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(Errors.unauthorized());
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(Errors.unauthorized());
  if (req.user.role !== 'ADMIN') return next(Errors.forbidden());
  next();
}
