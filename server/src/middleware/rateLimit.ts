import rateLimit from 'express-rate-limit';
import { Errors } from '../lib/errors.js';

// Tight limits on auth endpoints specifically (brute-force / credential
// stuffing protection, spec section 23) — the rest of the API gets a
// looser general limit.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(Errors.rateLimited()),
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(Errors.rateLimited()),
});
