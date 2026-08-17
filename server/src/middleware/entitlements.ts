import type { NextFunction, Request, Response } from 'express';
import { Errors } from '../lib/errors.js';
import { getActivePlan, planHasFeature, type Feature } from '../services/entitlements.js';
import { writeSecurityEvent } from '../lib/audit.js';

// Blocks the request server-side if the caller's real (backend-verified)
// plan doesn't include `feature` — this is the enforcement the frontend's
// hidden buttons can't provide on their own (spec section 11/23).
export function requireFeature(feature: Feature) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    const plan = await getActivePlan(req.user.id);
    if (!plan) return next(Errors.forbidden());
    if (!planHasFeature(plan, feature)) {
      await writeSecurityEvent({
        userId: req.user.id,
        type: 'entitlement_denied',
        severity: 'INFO',
        metadata: { feature, plan },
        ipAddress: req.ip,
      });
      return next(Errors.forbidden());
    }
    next();
  };
}

// Baseline gate for the app itself: no free tier (spec section 7/8).
export async function requireActiveSubscription(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(Errors.unauthorized());
  const plan = await getActivePlan(req.user.id);
  if (!plan) return next(Errors.forbidden());
  next();
}
