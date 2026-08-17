import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

// Strict input validation on every write endpoint (spec section 23) —
// unknown/malformed bodies never reach a route handler.
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
