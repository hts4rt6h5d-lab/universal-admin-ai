import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { stripeConfigured } from '../config/env.js';
import { PLAN_PRICES_CENTS, computeCheckoutPricing, createCheckoutSession, createBillingPortalSession, cancelSubscription } from '../services/stripe/index.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const plans = [
      {
        code: 'STANDARD',
        priceCents: PLAN_PRICES_CENTS.STANDARD,
        currency: 'EUR',
        chatbot: false,
      },
      {
        code: 'PREMIUM',
        priceCents: PLAN_PRICES_CENTS.PREMIUM,
        currency: 'EUR',
        chatbot: true,
        recommended: true,
      },
    ];

    let promo: { eligible: boolean; amountOffCents: number; firstChargeCents: number } | null = null;
    if (req.user) {
      const pricing = await computeCheckoutPricing(req.user.id, 'PREMIUM');
      promo = {
        eligible: pricing.promoEligible,
        amountOffCents: PLAN_PRICES_CENTS.PREMIUM - pricing.firstChargeCents,
        firstChargeCents: pricing.firstChargeCents,
      };
    }

    res.json({ plans, promo, paymentsConfigured: stripeConfigured });
  })
);

subscriptionsRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ subscription, payments, paymentsConfigured: stripeConfigured });
  })
);

const checkoutSchema = z.object({ planCode: z.enum(['STANDARD', 'PREMIUM']) });

subscriptionsRouter.post(
  '/checkout',
  requireAuth,
  validateBody(checkoutSchema),
  asyncHandler(async (req, res) => {
    const { planCode } = req.body as z.infer<typeof checkoutSchema>;
    const result = await createCheckoutSession(req.user!.id, planCode);
    res.json(result);
  })
);

subscriptionsRouter.post(
  '/billing-portal',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await createBillingPortalSession(req.user!.id);
    res.json(result);
  })
);

subscriptionsRouter.post(
  '/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    await cancelSubscription(req.user!.id);
    res.status(204).end();
  })
);
