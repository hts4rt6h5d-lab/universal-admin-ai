import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

// A minimal request logger (rather than pulling in pino-http) — logs
// method/path/status/duration only, nothing from headers or body, so
// there's no risk of accidentally logging cookies or auth tokens.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info({ method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(durationMs) }, 'request');
  });
  next();
}
