import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { app, resetDb, createUser, grantActiveSubscription } from '../helpers.js';
import { hashPassword } from '../../src/lib/password.js';

// Spec section 11: "Un utilisateur Standard ne doit jamais pouvoir appeler
// directement une API Premium." — the frontend hiding a button is not
// sufficient; this proves the backend itself refuses the call.
describe('backend-enforced plan entitlements', () => {
  beforeEach(resetDb);
  afterAll(async () => prisma.$disconnect());

  async function signedInAgent(email: string, plan: 'STANDARD' | 'PREMIUM' | null) {
    const agent = request.agent(app);
    const passwordHash = await hashPassword('correct-horse-battery');
    const user = await prisma.user.create({
      data: { firstName: 'U', countryCode: 'FR', email, passwordHash, profile: { create: {} }, preferences: { create: {} } },
    });
    if (plan) await grantActiveSubscription(user.id, plan);
    await agent.post('/api/auth/login').send({ emailOrPhone: email, password: 'correct-horse-battery' });
    return agent;
  }

  it('a user with no subscription is blocked from document analysis entirely', async () => {
    const agent = await signedInAgent('none@example.com', null);
    const res = await agent.get('/api/documents');
    expect(res.status).toBe(403);
  });

  it('Standard cannot call the Premium-only chatbot endpoint directly, even by hitting the API', async () => {
    const agent = await signedInAgent('standard@example.com', 'STANDARD');
    const res = await agent.post('/api/assistant/ask').send({ question: 'Dois-je payer ?' });
    expect(res.status).toBe(403);
  });

  it('Premium can use the chatbot', async () => {
    const agent = await signedInAgent('premium@example.com', 'PREMIUM');
    const res = await agent.post('/api/assistant/ask').send({ question: 'Dois-je payer ?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeTypeOf('string');
  });

  it('Standard can still use document analysis (a Standard feature)', async () => {
    const agent = await signedInAgent('standard2@example.com', 'STANDARD');
    const res = await agent.get('/api/documents');
    expect(res.status).toBe(200);
  });
});
