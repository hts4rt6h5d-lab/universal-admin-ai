import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { computeCheckoutPricing, PREMIUM_FIRST_MONTH_PROMO_CODE, PLAN_PRICES_CENTS } from '../../src/services/stripe/index.js';
import { resetDb, createUser } from '../helpers.js';

describe('promotion eligibility (pure logic, spec section 9)', () => {
  beforeEach(resetDb);
  afterAll(async () => prisma.$disconnect());

  it('a new user is eligible for the 20€ first-month promo on Premium', async () => {
    const user = await createUser();
    const pricing = await computeCheckoutPricing(user.id, 'PREMIUM');
    expect(pricing.promoEligible).toBe(true);
    expect(pricing.firstChargeCents).toBe(PLAN_PRICES_CENTS.PREMIUM - 2000);
  });

  it('Standard never gets the promo (it only applies to Premium)', async () => {
    const user = await createUser();
    const pricing = await computeCheckoutPricing(user.id, 'STANDARD');
    expect(pricing.promoEligible).toBe(false);
    expect(pricing.firstChargeCents).toBe(PLAN_PRICES_CENTS.STANDARD);
  });

  it('a user who already redeemed the promo is not eligible again — even after cancel + resubscribe', async () => {
    const user = await createUser();
    const promotion = await prisma.promotion.findUniqueOrThrow({ where: { code: PREMIUM_FIRST_MONTH_PROMO_CODE } });

    // Simulate: subscribed, got the 20€, then canceled.
    const sub1 = await prisma.subscription.create({ data: { userId: user.id, planCode: 'PREMIUM', status: 'ACTIVE' } });
    const payment1 = await prisma.payment.create({
      data: { userId: user.id, subscriptionId: sub1.id, amountCents: 18000, currency: 'EUR', status: 'SUCCEEDED' },
    });
    await prisma.promotionRedemption.create({
      data: { userId: user.id, promotionId: promotion.id, subscriptionId: sub1.id, paymentId: payment1.id },
    });
    await prisma.subscription.update({ where: { id: sub1.id }, data: { status: 'CANCELED' } });

    // Months later, they resubscribe.
    const pricing = await computeCheckoutPricing(user.id, 'PREMIUM');
    expect(pricing.promoEligible).toBe(false);
    expect(pricing.firstChargeCents).toBe(PLAN_PRICES_CENTS.PREMIUM);
  });

  it('the database rejects a second redemption row for the same user+promotion (defense in depth)', async () => {
    const user = await createUser();
    const promotion = await prisma.promotion.findUniqueOrThrow({ where: { code: PREMIUM_FIRST_MONTH_PROMO_CODE } });
    await prisma.promotionRedemption.create({ data: { userId: user.id, promotionId: promotion.id } });

    await expect(prisma.promotionRedemption.create({ data: { userId: user.id, promotionId: promotion.id } })).rejects.toMatchObject({
      code: 'P2002',
    });
  });
});
