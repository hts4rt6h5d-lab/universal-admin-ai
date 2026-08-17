import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import Stripe from 'stripe';
import { prisma } from '../../src/lib/prisma.js';
import { env } from '../../src/config/env.js';
import { app, resetDb, createUser } from '../helpers.js';
import { PREMIUM_FIRST_MONTH_PROMO_CODE } from '../../src/services/stripe/index.js';

// This suite proves the webhook handler's logic — including the
// promotion anti-abuse rule — WITHOUT needing a live Stripe account.
// `constructEvent`/`generateTestHeaderString` are pure local HMAC
// operations (see services/stripe/index.ts's comment on
// verifyWebhookSignature), so signing a hand-built event here is a
// faithful simulation of what Stripe would actually send.
const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_dummy');

function signedRequest(eventPayload: object) {
  const payload = JSON.stringify(eventPayload);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
  return request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', header).send(payload);
}

function checkoutCompletedEvent(params: { userId: string; promotionApplied: boolean; promotionId?: string; subscriptionId: string; amountTotal: number }) {
  return {
    id: `evt_${crypto.randomUUID()}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_${crypto.randomUUID()}`,
        object: 'checkout.session',
        customer: 'cus_test_123',
        subscription: params.subscriptionId,
        payment_intent: `pi_${crypto.randomUUID()}`,
        amount_total: params.amountTotal,
        currency: 'eur',
        metadata: {
          userId: params.userId,
          planCode: 'PREMIUM',
          promotionApplied: params.promotionApplied ? 'true' : 'false',
          promotionId: params.promotionId ?? '',
        },
      },
    },
  };
}

describe('Stripe webhook handling', () => {
  beforeEach(resetDb);
  afterAll(async () => prisma.$disconnect());

  it('rejects a request with an invalid signature', async () => {
    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=deadbeef')
      .send(JSON.stringify({ type: 'checkout.session.completed' }));
    expect(res.status).toBe(400);
  });

  it('activates a subscription and grants the promotion on a valid checkout.session.completed event', async () => {
    const user = await createUser();
    const promotion = await prisma.promotion.findUniqueOrThrow({ where: { code: PREMIUM_FIRST_MONTH_PROMO_CODE } });
    const subscriptionId = `sub_${crypto.randomUUID()}`;

    const res = await signedRequest(checkoutCompletedEvent({ userId: user.id, promotionApplied: true, promotionId: promotion.id, subscriptionId, amountTotal: 18000 }));
    expect(res.status).toBe(200);

    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: subscriptionId } });
    expect(subscription.status).toBe('ACTIVE');
    expect(subscription.planCode).toBe('PREMIUM');

    const redemptions = await prisma.promotionRedemption.findMany({ where: { userId: user.id } });
    expect(redemptions).toHaveLength(1);
  });

  it('does not grant the promotion twice, even if the webhook is redelivered (idempotency)', async () => {
    const user = await createUser();
    const promotion = await prisma.promotion.findUniqueOrThrow({ where: { code: PREMIUM_FIRST_MONTH_PROMO_CODE } });
    const subscriptionId = `sub_${crypto.randomUUID()}`;
    const event = checkoutCompletedEvent({ userId: user.id, promotionApplied: true, promotionId: promotion.id, subscriptionId, amountTotal: 18000 });

    const first = await signedRequest(event);
    expect(first.status).toBe(200);
    const second = await signedRequest(event); // Stripe redelivers on timeout/retry — must be safe.
    expect(second.status).toBe(200);

    const redemptions = await prisma.promotionRedemption.findMany({ where: { userId: user.id } });
    expect(redemptions).toHaveLength(1);
  });

  it('does not grant the promotion again on resubscribe after a prior redemption (spec section 35 step 28)', async () => {
    const user = await createUser();
    const promotion = await prisma.promotion.findUniqueOrThrow({ where: { code: PREMIUM_FIRST_MONTH_PROMO_CODE } });

    // First subscription: redeems the promo.
    const firstSub = `sub_${crypto.randomUUID()}`;
    await signedRequest(checkoutCompletedEvent({ userId: user.id, promotionApplied: true, promotionId: promotion.id, subscriptionId: firstSub, amountTotal: 18000 }));

    // Cancel it.
    await signedRequest({
      id: `evt_${crypto.randomUUID()}`,
      object: 'event',
      type: 'customer.subscription.deleted',
      data: { object: { id: firstSub, object: 'subscription' } },
    });
    const canceled = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: firstSub } });
    expect(canceled.status).toBe('CANCELED');

    // Months later, resubscribes. Even if the client somehow still claims
    // promotionApplied=true (stale UI, tampered request, a bug upstream),
    // the webhook handler's DB-constraint-backed check must refuse a
    // second redemption.
    const secondSub = `sub_${crypto.randomUUID()}`;
    const res = await signedRequest(checkoutCompletedEvent({ userId: user.id, promotionApplied: true, promotionId: promotion.id, subscriptionId: secondSub, amountTotal: 18000 }));
    expect(res.status).toBe(200);

    const redemptions = await prisma.promotionRedemption.findMany({ where: { userId: user.id } });
    expect(redemptions).toHaveLength(1); // still just the one from the first subscription
    const secondSubscription = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: secondSub } });
    expect(secondSubscription.status).toBe('ACTIVE'); // the subscription itself still activates normally
  });

  it('marks a subscription PAST_DUE and creates a notification on invoice.payment_failed', async () => {
    const user = await createUser();
    const subscriptionId = `sub_${crypto.randomUUID()}`;
    await signedRequest(checkoutCompletedEvent({ userId: user.id, promotionApplied: false, subscriptionId, amountTotal: 20000 }));

    await signedRequest({
      id: `evt_${crypto.randomUUID()}`,
      object: 'event',
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_test', object: 'invoice', subscription: subscriptionId } },
    });

    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: subscriptionId } });
    expect(subscription.status).toBe('PAST_DUE');
    const notifications = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(notifications.length).toBeGreaterThan(0);
  });
});
