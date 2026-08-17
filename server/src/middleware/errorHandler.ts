import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Cette page ou cette ressource est introuvable.' } });
}

// Centralized so every route can `throw` domain errors and trust the shape
// of what reaches the client — no route hand-rolls its own error JSON.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, path: req.path }, 'request failed');
    res.status(err.status).json({ error: { code: err.code, message: err.userMessage } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation',
        message: 'Certaines informations fournies ne sont pas valides.',
        details: err.flatten(),
      },
    });
    return;
  }
  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({ error: { code: 'internal', message: "Une erreur inattendue s'est produite. Merci de réessayer." } });
}
