import { prisma } from '../src/lib/prisma.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';

export const app = buildApp();

// Deletes everything except the seed data (CountryProfile, Promotion) so
// each test file starts from a clean, known state without re-seeding.
export async function resetDb() {
  await prisma.$transaction([
    prisma.processedWebhookEvent.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.documentSource.deleteMany(),
    prisma.documentAnalysis.deleteMany(),
    prisma.documentPage.deleteMany(),
    prisma.deadline.deleteMany(),
    prisma.task.deleteMany(),
    prisma.document.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.promotionRedemption.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscriptionEvent.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.securityEvent.deleteMany(),
    prisma.session.deleteMany(),
    prisma.connectedDevice.deleteMany(),
    prisma.userPreference.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function createUser(overrides: Partial<{ firstName: string; email: string; countryCode: string; password: string }> = {}) {
  const email = overrides.email ?? `user-${crypto.randomUUID()}@example.com`;
  const passwordHash = await hashPassword(overrides.password ?? 'correct-horse-battery-staple');
  const user = await prisma.user.create({
    data: {
      firstName: overrides.firstName ?? 'Test',
      countryCode: overrides.countryCode ?? 'FR',
      email,
      passwordHash,
      profile: { create: {} },
      preferences: { create: {} },
    },
  });
  return user;
}

export async function grantActiveSubscription(userId: string, planCode: 'STANDARD' | 'PREMIUM') {
  return prisma.subscription.create({
    data: { userId, planCode, status: 'ACTIVE', stripeSubscriptionId: `sub_test_${crypto.randomUUID()}` },
  });
}
