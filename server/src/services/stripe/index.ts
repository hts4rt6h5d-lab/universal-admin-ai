import Stripe from 'stripe';
import type { PlanCode } from '@prisma/client';
import { env, stripeConfigured } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../lib/audit.js';
import { renderNotification } from '../../lib/notifications-i18n.js';

export const PREMIUM_FIRST_MONTH_PROMO_CODE = 'PREMIUM_FIRST_MONTH_20';

export const PLAN_PRICES_CENTS: Record<PlanCode, number> = {
  STANDARD: 10000, // 100 €/mois
  PREMIUM: 20000, // 200 €/mois
};

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeConfigured) throw Errors.configurationRequired('Le paiement (Stripe)');
  if (!_stripe) _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return _stripe;
}

function priceIdForPlan(plan: PlanCode): string {
  const id = plan === 'PREMIUM' ? env.STRIPE_PRICE_PREMIUM : env.STRIPE_PRICE_STANDARD;
  if (!id) throw Errors.configurationRequired('Le catalogue de prix Stripe');
  return id;
}

function planForPriceId(priceId: string | undefined | null): PlanCode | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PREMIUM) return 'PREMIUM';
  if (priceId === env.STRIPE_PRICE_STANDARD) return 'STANDARD';
  return null;
}

// Pure decision logic, deliberately separated from any Stripe network call
// so it's unit-testable without a live Stripe account (see
// test/unit/promotion.test.ts): is this user still eligible for the
// "20 € off first Premium month" promo, per spec section 9 — once ever,
// regardless of cancel/resubscribe history.
export async function computeCheckoutPricing(userId: string, planCode: PlanCode) {
  const unitAmountCents = PLAN_PRICES_CENTS[planCode];
  if (planCode !== 'PREMIUM') {
    return { planCode, unitAmountCents, promoEligible: false, firstChargeCents: unitAmountCents };
  }
  const promotion = await prisma.promotion.findUnique({ where: { code: PREMIUM_FIRST_MONTH_PROMO_CODE } });
  if (!promotion || !promotion.active) {
    return { planCode, unitAmountCents, promoEligible: false, firstChargeCents: unitAmountCents };
  }
  const alreadyRedeemed = await prisma.promotionRedemption.findUnique({
    where: { userId_promotionId: { userId, promotionId: promotion.id } },
  });
  const promoEligible = !alreadyRedeemed;
  const firstChargeCents = promoEligible ? unitAmountCents - promotion.amountOffCents : unitAmountCents;
  return { planCode, unitAmountCents, promoEligible, firstChargeCents, promotionId: promotion.id };
}

export async function createCheckoutSession(userId: string, planCode: PlanCode) {
  const stripe = getStripe(); // throws configuration_required if Stripe isn't set up
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const pricing = await computeCheckoutPricing(userId, planCode);

  let subscription = await prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  let stripeCustomerId = subscription?.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.firstName,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
  }

  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  if (pricing.promoEligible) {
    const coupon = await stripe.coupons.create({
      amount_off: PLAN_PRICES_CENTS.PREMIUM - pricing.firstChargeCents,
      currency: 'eur',
      duration: 'once',
      name: 'Offre de bienvenue -20 €',
    });
    discounts.push({ coupon: coupon.id });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    client_reference_id: userId,
    line_items: [{ price: priceIdForPlan(planCode), quantity: 1 }],
    discounts: discounts.length ? discounts : undefined,
    allow_promotion_codes: discounts.length ? undefined : true,
    success_url: `${env.WEB_ORIGIN}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.WEB_ORIGIN}/subscription/canceled`,
    metadata: {
      userId,
      planCode,
      promotionApplied: pricing.promoEligible ? 'true' : 'false',
      promotionId: pricing.promotionId ?? '',
    },
  });

  await writeAuditLog({ userId, action: 'subscription.checkout_started', metadata: { planCode, promoEligible: pricing.promoEligible } });
  return { url: session.url, pricing };
}

export async function createBillingPortalSession(userId: string) {
  const stripe = getStripe();
  const subscription = await prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  if (!subscription?.stripeCustomerId) throw Errors.notFound('Abonnement');
  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${env.WEB_ORIGIN}/account/subscription`,
  });
  return { url: portal.url };
}

export async function cancelSubscription(userId: string) {
  const stripe = getStripe();
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
    orderBy: { createdAt: 'desc' },
  });
  if (!subscription?.stripeSubscriptionId) throw Errors.notFound('Abonnement actif');
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
  await prisma.subscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: true } });
  await writeAuditLog({ userId, action: 'subscription.cancel_requested' });
}

// ── Webhook handling ────────────────────────────────────────────────────
// constructEvent is a pure local HMAC verification (no network call), so
// this whole path is unit-testable without a live Stripe account — see
// test/integration/subscriptions.webhook.test.ts.
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): Stripe.Event {
  if (!stripeConfigured) throw Errors.configurationRequired('Le paiement (Stripe)');
  // constructEvent needs a Stripe instance only for its static webhook
  // helper; it does not make a network request.
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
}

async function grantPromotionIfApplicable(params: {
  userId: string;
  promotionId?: string;
  subscriptionId: string;
  paymentId: string;
}) {
  if (!params.promotionId) return;
  try {
    await prisma.promotionRedemption.create({
      data: {
        userId: params.userId,
        promotionId: params.promotionId,
        subscriptionId: params.subscriptionId,
        paymentId: params.paymentId,
      },
    });
  } catch (err) {
    // P2002 = unique constraint violation on (userId, promotionId): this
    // user already redeemed this promo. This is the anti-abuse rule from
    // spec section 9 firing — not an error, just a rejected double-grant
    // (e.g. a duplicate webhook delivery, or a race between two requests).
    const isUniqueViolation = typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002';
    if (!isUniqueViolation) throw err;
    logger.warn({ userId: params.userId }, 'promotion redemption blocked: already redeemed');
  }
}

export async function handleWebhookEvent(event: Stripe.Event) {
  try {
    await prisma.processedWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    const isUniqueViolation = typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002';
    if (isUniqueViolation) {
      logger.info({ eventId: event.id, type: event.type }, 'webhook event already processed, skipping (redelivery)');
      return;
    }
    throw err;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planCode = session.metadata?.planCode as PlanCode | undefined;
      if (!userId || !planCode) {
        logger.warn({ eventId: event.id }, 'checkout.session.completed missing metadata, ignoring');
        return;
      }
      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

      const subscription = await prisma.subscription.upsert({
        where: { stripeSubscriptionId: stripeSubscriptionId ?? '__none__' },
        create: {
          userId,
          planCode,
          status: 'ACTIVE',
          stripeCustomerId,
          stripeSubscriptionId,
        },
        update: { status: 'ACTIVE', planCode, stripeCustomerId },
      });

      const payment = await prisma.payment.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          amountCents: session.amount_total ?? PLAN_PRICES_CENTS[planCode],
          currency: (session.currency ?? 'eur').toUpperCase(),
          status: 'SUCCEEDED',
        },
      });

      await prisma.subscriptionEvent.create({
        data: { subscriptionId: subscription.id, type: 'activated', payloadJson: { stripeEventId: event.id } },
      });

      if (session.metadata?.promotionApplied === 'true') {
        await grantPromotionIfApplicable({
          userId,
          promotionId: session.metadata.promotionId || undefined,
          subscriptionId: subscription.id,
          paymentId: payment.id,
        });
      }
      await writeAuditLog({ userId, action: 'subscription.activated', metadata: { planCode } });
      return;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
      if (!existing) return;
      const priceId = sub.items.data[0]?.price?.id;
      const planCode = planForPriceId(priceId) ?? existing.planCode;
      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        trialing: 'TRIALING',
        past_due: 'PAST_DUE',
        canceled: 'CANCELED',
        unpaid: 'UNPAID',
        incomplete: 'INCOMPLETE',
      };
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: (statusMap[sub.status] ?? existing.status) as never,
          planCode,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : existing.currentPeriodEnd,
        },
      });
      await prisma.subscriptionEvent.create({
        data: { subscriptionId: existing.id, type: 'updated', payloadJson: { status: sub.status, stripeEventId: event.id } },
      });
      return;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
      if (!existing) return;
      await prisma.subscription.update({ where: { id: existing.id }, data: { status: 'CANCELED' } });
      await prisma.subscriptionEvent.create({
        data: { subscriptionId: existing.id, type: 'canceled', payloadJson: { stripeEventId: event.id } },
      });
      await writeAuditLog({ userId: existing.userId, action: 'subscription.canceled' });
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId =
        typeof (invoice as unknown as { subscription?: string }).subscription === 'string'
          ? (invoice as unknown as { subscription?: string }).subscription
          : undefined;
      if (!stripeSubscriptionId) return;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
      if (!existing) return;
      await prisma.subscription.update({ where: { id: existing.id }, data: { status: 'PAST_DUE' } });
      await prisma.subscriptionEvent.create({
        data: { subscriptionId: existing.id, type: 'payment_failed', payloadJson: { stripeEventId: event.id } },
      });
      const user = await prisma.user.findUnique({ where: { id: existing.userId } });
      const { title, body } = renderNotification(user?.locale ?? 'fr', 'payment_failed');
      await prisma.notification.create({
        data: { userId: existing.userId, channel: 'email', title, body },
      });
      return;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined;
      if (!paymentIntentId) return;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: 'REFUNDED' },
      });
      return;
    }

    default:
      logger.info({ type: event.type }, 'unhandled stripe webhook event type');
  }
}
